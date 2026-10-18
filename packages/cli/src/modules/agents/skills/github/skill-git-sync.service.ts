import type {
	DiscoverGitHubSkillsResponse,
	GitHubSkillCandidate,
	ImportGitHubSkillsResponse,
	SkillGitRefType,
	SkillGitSourceInfo,
	SkillGitUpdateDetail,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError, UserError } from '@n8n/errors';

import type { SkillGitLink } from '../../entities/skill-git-link.entity';
import type { SkillGitUpdate } from '../../entities/skill-git-update.entity';
import { SkillGitRepository } from '../../repositories/skill-git.repository';
import { SkillRepository, type SkillTarget } from '../../repositories/skill.repository';
import { skillContentHash, type SkillContent } from '../skill-content-hash';
import { SkillNameTakenError } from '../skill-name-taken.error';
import { SkillService } from '../skill.service';
import {
	GitHubClient,
	GitHubReadError,
	type GitHubCommit,
	type GitHubTreeEntry,
} from './github-client';
import { gitHubFolderUrl, parseGitHubLink } from './github-link';
import {
	MAX_SKILL_FOLDERS,
	findSkillFolders,
	folderTreeSha,
	readSkillFolder,
	type ReadSkillFolder,
} from './skill-folder';

/** Folders read at the same time. Raw file reads do not count against the API budget. */
const READ_CONCURRENCY = 5;

/** One commit of one repository, with its whole tree. */
type Snapshot = {
	owner: string;
	repo: string;
	ref: string;
	refType: SkillGitRefType;
	commit: GitHubCommit;
	entries: GitHubTreeEntry[];
};

async function mapLimited<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = [];
	for (let start = 0; start < items.length; start += READ_CONCURRENCY) {
		results.push(...(await Promise.all(items.slice(start, start + READ_CONCURRENCY).map(fn))));
	}
	return results;
}

function toAgentSkillBody(content: SkillContent) {
	return {
		name: content.name,
		description: content.description,
		instructions: content.instructions,
		...(content.files.length ? { references: content.files } : {}),
	};
}

/** What the list and the editor show about a synced skill. */
export function toGitSourceInfo(
	link: SkillGitLink,
	update: Pick<SkillGitUpdate, 'status' | 'toCommitSha'> | undefined,
): SkillGitSourceInfo {
	return {
		owner: link.owner,
		repo: link.repo,
		ref: link.ref,
		refType: link.refType,
		path: link.path,
		htmlUrl: gitHubFolderUrl(link.owner, link.repo, link.ref, link.path),
		syncedCommitSha: link.syncedCommitSha,
		status: link.status,
		lastError: link.lastError,
		lastCheckedAt: link.lastCheckedAt?.toISOString() ?? null,
		update: update ? { status: update.status, toCommitSha: update.toCommitSha } : null,
	};
}

/**
 * Skills from public GitHub repositories: find and import them, check their folders for
 * new commits, and turn an accepted update into the next version. Content from GitHub
 * reaches a skill version only through an import or an accept, and only after the
 * security check. Permissions are the caller's job.
 */
@Service()
export class SkillGitSyncService {
	constructor(
		private readonly logger: Logger,
		private readonly client: GitHubClient,
		private readonly gitRepository: SkillGitRepository,
		private readonly skillRepository: SkillRepository,
		private readonly skillService: SkillService,
		private readonly txRunner: TransactionRunner,
	) {}

	// ---------------------------------------------------------------- import

	async discover(url: string): Promise<DiscoverGitHubSkillsResponse> {
		const link = parseGitHubLink(url);
		const snapshot = await this.readSnapshot(link.owner, link.repo, link.ref);
		const folders = this.skillFoldersIn(snapshot, link.path);
		const read = await mapLimited(
			folders.matching,
			async (folder) =>
				await readSkillFolder(
					this.client,
					this.sourceOf(snapshot),
					snapshot.entries,
					folder,
					folders.all,
				),
		);
		const existing = await this.gitRepository.findLinksToFolders(snapshot.owner, snapshot.repo);
		const skills: GitHubSkillCandidate[] = read.map((folder) => ({
			path: folder.path,
			name: folder.name,
			description: folder.description,
			check: folder.check,
			skippedFiles: folder.skippedFiles,
			importedTo: existing
				.filter((row) => row.path === folder.path)
				.map((row) => ({ projectId: row.projectId })),
		}));
		return {
			owner: snapshot.owner,
			repo: snapshot.repo,
			ref: snapshot.ref,
			refType: snapshot.refType,
			commitSha: snapshot.commit.sha,
			skills,
		};
	}

	/**
	 * Imports the chosen folders at the commit the user saw, so the content matches the
	 * check they confirmed. Each skill is created on its own: one failure does not stop
	 * the others.
	 */
	async import(input: {
		url: string;
		commitSha: string;
		paths: string[];
		target: SkillTarget;
		acknowledgeWarnings: boolean;
		userId: string;
	}): Promise<ImportGitHubSkillsResponse> {
		const link = parseGitHubLink(input.url);
		const named = await this.readSnapshot(link.owner, link.repo, link.ref);
		const snapshot =
			named.commit.sha === input.commitSha
				? named
				: await this.readSnapshotAt(named, input.commitSha);
		const folders = this.skillFoldersIn(snapshot, link.path);
		const existing = await this.gitRepository.findLinksToFolders(snapshot.owner, snapshot.repo);
		const response: ImportGitHubSkillsResponse = { created: [], failed: [] };

		for (const path of [...new Set(input.paths)]) {
			if (!folders.matching.includes(path)) {
				response.failed.push({ path, message: 'There is no skill in this folder.' });
				continue;
			}
			if (existing.some((row) => row.path === path && row.projectId === input.target.projectId)) {
				response.failed.push({ path, message: 'This folder is already synced here.' });
				continue;
			}
			const folder = await readSkillFolder(
				this.client,
				this.sourceOf(snapshot),
				snapshot.entries,
				path,
				folders.all,
			);
			const refused = this.refusal(folder, input.acknowledgeWarnings);
			if (refused || !folder.content) {
				response.failed.push({ path, message: refused ?? 'n8n could not read this skill.' });
				continue;
			}
			const { content } = folder;
			try {
				const skillId = await this.txRunner.run({}, async (ctx) => {
					const id = await this.skillService.create(
						{
							checkNameTaken: true,
							target: input.target,
							skill: toAgentSkillBody(content),
							source: 'ui',
							createdById: input.userId,
							frontmatter: content.frontmatter,
							sourceCommitSha: snapshot.commit.sha,
						},
						ctx,
					);
					await this.gitRepository.insertLink(
						{
							skillId: id,
							owner: snapshot.owner,
							repo: snapshot.repo,
							ref: snapshot.ref,
							refType: snapshot.refType,
							path,
							syncedCommitSha: snapshot.commit.sha,
							seenCommitSha: snapshot.commit.sha,
							seenTreeSha: folderTreeSha(snapshot.entries, snapshot.commit.treeSha, path) ?? null,
							status: 'ok',
							lastError: null,
							lastCheckedAt: new Date(),
						},
						ctx,
					);
					return id;
				});
				response.created.push({ path, skillId, name: content.name });
			} catch (error) {
				if (error instanceof SkillNameTakenError) {
					response.failed.push({
						path,
						message: `A skill named "${content.name}" already exists here.`,
					});
					continue;
				}
				if (error instanceof UserError) {
					response.failed.push({ path, message: error.message });
					continue;
				}
				throw error;
			}
		}
		this.logger.debug('Imported skills from GitHub', {
			repo: `${snapshot.owner}/${snapshot.repo}`,
			created: response.created.length,
			failed: response.failed.length,
		});
		return response;
	}

	// ---------------------------------------------------------------- updates

	/** Checks one synced skill now. A tag or a commit never changes, so it has nothing to check. */
	async checkSkill(skillId: string): Promise<void> {
		const link = await this.gitRepository.findLink(skillId);
		if (!link) throw new NotFoundError('This skill does not sync from GitHub.');
		if (link.refType !== 'branch') return;
		await this.checkLinks([link]);
	}

	/** The scheduled check: every skill that follows a branch, oldest check first. */
	async checkAll(signal?: AbortSignal): Promise<void> {
		await this.checkLinks(await this.gitRepository.findBranchLinks(), signal);
	}

	/**
	 * One commit call for each repository and branch. When the branch moved, one tree call,
	 * then only the folders whose tree SHA changed are read. A rate limit stops the run.
	 */
	private async checkLinks(links: SkillGitLink[], signal?: AbortSignal): Promise<void> {
		const groups = new Map<string, SkillGitLink[]>();
		for (const link of links) {
			const key = `${link.owner.toLowerCase()}/${link.repo.toLowerCase()}@${link.ref}`;
			groups.set(key, [...(groups.get(key) ?? []), link]);
		}
		for (const group of groups.values()) {
			if (signal?.aborted) return;
			const [first] = group;
			if (!first) continue;
			const now = new Date();
			try {
				const commit = await this.client.commit(first.owner, first.repo, first.ref);
				const moved = group.filter((link) => link.seenCommitSha !== commit.sha);
				for (const link of group.filter((row) => !moved.includes(row))) {
					await this.gitRepository.updateLink(link.skillId, {
						status: 'ok',
						lastError: null,
						lastCheckedAt: now,
					});
				}
				if (moved.length === 0) continue;
				const { entries } = await this.client.tree(first.owner, first.repo, commit.treeSha);
				const snapshot: Snapshot = {
					owner: first.owner,
					repo: first.repo,
					ref: first.ref,
					refType: 'branch',
					commit,
					entries,
				};
				const allFolders = findSkillFolders(entries, '');
				for (const link of moved) {
					await this.checkFolder(link, snapshot, allFolders, now);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				const status =
					error instanceof GitHubReadError
						? error.kind === 'rate_limited'
							? 'rate_limited'
							: error.kind === 'not_found'
								? 'unavailable'
								: first.status
						: first.status;
				for (const link of group) {
					await this.gitRepository.updateLink(link.skillId, {
						status,
						lastError: message.slice(0, 512),
						lastCheckedAt: now,
					});
				}
				this.logger.debug('Could not check skills on GitHub', {
					repo: `${first.owner}/${first.repo}`,
					error: message,
				});
				if (error instanceof GitHubReadError && error.kind === 'rate_limited') return;
			}
		}
	}

	private async checkFolder(
		link: SkillGitLink,
		snapshot: Snapshot,
		allFolders: string[],
		now: Date,
	): Promise<void> {
		const treeSha = folderTreeSha(snapshot.entries, snapshot.commit.treeSha, link.path);
		if (!treeSha || !allFolders.includes(link.path)) {
			await this.gitRepository.updateLink(link.skillId, {
				status: 'unavailable',
				lastError: `The folder ${link.path || '/'} has no SKILL.md on ${link.ref} anymore.`,
				lastCheckedAt: now,
			});
			return;
		}
		const seen = { seenCommitSha: snapshot.commit.sha, seenTreeSha: treeSha };
		const ok = { status: 'ok' as const, lastError: null, lastCheckedAt: now };
		if (treeSha === link.seenTreeSha) {
			await this.gitRepository.updateLink(link.skillId, { ...seen, ...ok });
			return;
		}

		const folder = await readSkillFolder(
			this.client,
			this.sourceOf(snapshot),
			snapshot.entries,
			link.path,
			allFolders,
		);
		const latest = (await this.skillRepository.findLatestSaved([link.skillId])).get(link.skillId);
		if (!latest) return;
		const hash = folder.content ? skillContentHash(folder.content) : null;

		await this.txRunner.run({}, async (ctx) => {
			if (hash === latest.version.contentHash) {
				// Same content as the latest version (for example after an accept): no update.
				await this.gitRepository.updateLink(
					link.skillId,
					{ ...seen, ...ok, syncedCommitSha: snapshot.commit.sha },
					ctx,
				);
				await this.gitRepository.deleteUpdate(link.skillId, ctx);
				return;
			}
			const content: SkillContent = folder.content ?? {
				name: folder.name,
				description: folder.description,
				instructions: '',
				frontmatter: null,
				files: [],
			};
			await this.gitRepository.upsertUpdate(
				{
					skillId: link.skillId,
					fromCommitSha: link.syncedCommitSha,
					toCommitSha: snapshot.commit.sha,
					commitMessage: snapshot.commit.message?.slice(0, 1024) ?? null,
					commitAuthor: snapshot.commit.author?.slice(0, 255) ?? null,
					committedAt: snapshot.commit.date,
					content,
					contentHash: hash ?? '',
					checkResult: folder.check,
					skippedFiles: folder.skippedFiles,
					status: folder.check.result === 'blocked' ? 'blocked' : 'pending',
				},
				ctx,
			);
			await this.gitRepository.updateLink(link.skillId, { ...seen, ...ok }, ctx);
		});
	}

	async getUpdate(skillId: string): Promise<SkillGitUpdateDetail> {
		const update = await this.gitRepository.findUpdate(skillId);
		if (!update) throw new NotFoundError('No update from GitHub is waiting for this skill.');
		const latest = (await this.skillRepository.findLatestSaved([skillId])).get(skillId);
		if (!latest) throw new NotFoundError('Skill not found');
		return {
			skillId,
			fromCommitSha: update.fromCommitSha,
			toCommitSha: update.toCommitSha,
			commitMessage: update.commitMessage,
			commitAuthor: update.commitAuthor,
			committedAt: update.committedAt?.toISOString() ?? null,
			status: update.status,
			checkResult: update.checkResult,
			skippedFiles: update.skippedFiles ?? [],
			skill: toAgentSkillBody(update.content),
			latestVersion: latest.version.version,
		};
	}

	/**
	 * Accept: the waiting update becomes the next version through the hub's Save, so
	 * following agents get it as an unpublished change and published agents keep theirs.
	 */
	async accept(
		skillId: string,
		toCommitSha: string,
		acknowledgeWarnings: boolean,
		userId: string,
	): Promise<{ version: number; created: boolean }> {
		const { saved, following } = await this.txRunner.run({}, async (ctx) => {
			const update = await this.gitRepository.findUpdate(skillId, ctx);
			if (!update) throw new NotFoundError('No update from GitHub is waiting for this skill.');
			if (update.toCommitSha !== toCommitSha) {
				throw new ConflictError('A newer update arrived from GitHub. Review it again.');
			}
			if (update.status === 'blocked') {
				throw new UserError('This update failed the security check. Fix it in GitHub.');
			}
			if (update.checkResult.result === 'review' && !acknowledgeWarnings) {
				throw new UserError('Confirm that you reviewed the warnings.');
			}
			const result = await this.skillService.saveFromGitHub(
				skillId,
				toAgentSkillBody(update.content),
				{ commitSha: update.toCommitSha, frontmatter: update.content.frontmatter },
				userId,
				ctx,
			);
			await this.gitRepository.updateLink(skillId, { syncedCommitSha: update.toCommitSha }, ctx);
			await this.gitRepository.deleteUpdate(skillId, ctx);
			return { saved: result, following: result.followingAgentIds };
		});
		// `save` leaves the refresh to the caller when it joins a transaction.
		await this.skillService.refreshFollowingAgents(following);
		return { version: saved.version, created: saved.created };
	}

	/** Skip: the update goes. The next change in GitHub shows up as a new update. */
	async skip(skillId: string, toCommitSha: string): Promise<void> {
		const update = await this.gitRepository.findUpdate(skillId);
		if (!update) return;
		if (update.toCommitSha !== toCommitSha) {
			throw new ConflictError('A newer update arrived from GitHub. Review it again.');
		}
		await this.gitRepository.deleteUpdate(skillId);
	}

	/** Stop syncing: the skill and its versions stay and become editable in n8n. */
	async stopSyncing(skillId: string): Promise<void> {
		await this.gitRepository.deleteLink(skillId);
	}

	async sourceInfo(skillIds: string[]): Promise<Map<string, SkillGitSourceInfo>> {
		const links = await this.gitRepository.findLinks(skillIds);
		const updates = await this.gitRepository.findUpdates([...links.keys()]);
		return new Map(
			[...links].map(([skillId, link]) => [skillId, toGitSourceInfo(link, updates.get(skillId))]),
		);
	}

	// ---------------------------------------------------------------- helpers

	/** Why a folder cannot be imported or accepted as it is, or undefined when it can. */
	private refusal(folder: ReadSkillFolder, acknowledgeWarnings: boolean): string | undefined {
		if (folder.check.result === 'blocked') {
			return folder.check.findings[0]?.message ?? 'This skill failed the security check.';
		}
		if (folder.check.result === 'review' && !acknowledgeWarnings) {
			return 'Confirm that you reviewed the warnings.';
		}
		return undefined;
	}

	private sourceOf(snapshot: Snapshot) {
		return { owner: snapshot.owner, repo: snapshot.repo, commitSha: snapshot.commit.sha };
	}

	private skillFoldersIn(snapshot: Snapshot, path: string) {
		const all = findSkillFolders(snapshot.entries, '');
		const matching = all.filter(
			(folder) => path === '' || folder === path || folder.startsWith(`${path}/`),
		);
		if (matching.length === 0) {
			throw new UserError(
				path ? `There is no SKILL.md in ${path}.` : 'This repository has no SKILL.md file.',
			);
		}
		if (matching.length > MAX_SKILL_FOLDERS) {
			throw new UserError(
				`This link has ${matching.length} skills. Link to a folder with ${MAX_SKILL_FOLDERS} skills or fewer.`,
			);
		}
		return { all, matching };
	}

	/** Reads the commit a ref points to now, with its tree. No ref means the default branch. */
	private async readSnapshot(owner: string, repo: string, ref?: string): Promise<Snapshot> {
		try {
			const name = ref ?? (await this.client.defaultBranch(owner, repo));
			const refType: SkillGitRefType = /^[0-9a-f]{7,40}$/.test(name)
				? 'commit'
				: (await this.client.isBranch(owner, repo, name))
					? 'branch'
					: 'tag';
			const commit = await this.client.commit(owner, repo, name);
			const { entries, truncated } = await this.client.tree(owner, repo, commit.treeSha);
			if (truncated) {
				this.logger.debug('GitHub cut the tree of a large repository', { owner, repo });
			}
			// A commit link stores the full SHA, so later reads do not depend on a short one.
			return {
				owner,
				repo,
				ref: refType === 'commit' ? commit.sha : name,
				refType,
				commit,
				entries,
			};
		} catch (error) {
			throw this.toUserFacing(error);
		}
	}

	private async readSnapshotAt(named: Snapshot, commitSha: string): Promise<Snapshot> {
		try {
			const commit = await this.client.commit(named.owner, named.repo, commitSha);
			const { entries } = await this.client.tree(named.owner, named.repo, commit.treeSha);
			return { ...named, commit, entries };
		} catch (error) {
			throw this.toUserFacing(error);
		}
	}

	private toUserFacing(error: unknown): Error {
		if (error instanceof GitHubReadError) {
			if (error.kind === 'not_found') return new NotFoundError(error.message);
			return new UserError(error.message);
		}
		return error instanceof Error ? error : new Error(String(error));
	}
}
