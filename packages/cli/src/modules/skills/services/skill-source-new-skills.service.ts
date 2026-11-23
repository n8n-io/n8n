import {
	SKILL_SOURCE_MAX_SKILLS,
	skillNameKey,
	type SkillNewUpdate,
	type SkillScanResult,
	type AcceptSkillSourceUpdatesDto,
} from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	SkillSourceConnection,
	UnlinkedSkill,
} from '../database/entities/skill-source-connection.entity';
import { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillRepository } from '../database/repositories/skill.repository';
import { SkillNameTakenError } from '../errors/skill-name-taken.error';
import { SkillParseError } from '../errors/skill-parse.error';
import { SkillSourceNotFoundError } from '../errors/skill-source-not-found.error';
import { SkillSourceRequestError, skillSourceReasonOf } from '../errors/skill-source-request.error';
import type {
	FetchedSkill,
	RemoteSkillRef,
	SkillSourceAuth,
	SkillSourceClient,
} from '../sources/skill-source-client';
import {
	contentToAgentSkill,
	importableSkillSchema,
	storedContentOf,
} from '../utils/skill-content';
import { skillContentHash } from '../utils/skill-content-hash';
import { skillPreview } from '../utils/skill-preview';
import { unreadableSkillHash } from '../utils/skill-unlinked';
import { countSkippedFiles } from '../utils/skipped-files';
import { SkillSecurityScanner } from './skill-security-scanner.service';
import { SkillService } from './skill.service';
import { isNameTaken, nextFreeName } from './skill.policy';
import { flaggedCodes, SkillsTelemetry } from './skills-telemetry.service';

type NewSkillRead = {
	key: string;
	ref: RemoteSkillRef;
	contentHash: string;
	check: SkillScanResult;
	fetched?: FetchedSkill;
};

/** Discovers unlinked skills. Stored entries contain no skill content. */
@Service()
export class SkillSourceNewSkillsService {
	constructor(
		private readonly sources: SkillSourceRepository,
		private readonly skills: SkillRepository,
		private readonly scanner: SkillSecurityScanner,
		private readonly skillService: SkillService,
		private readonly telemetry: SkillsTelemetry,
	) {}

	private async discover(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		auth?: SkillSourceAuth,
		revision?: string,
	): Promise<{ reads: NewSkillRead[]; truncated: boolean }> {
		const linked = new Set(
			(await this.sources.findLinksBySource(source.id)).map(({ remoteRef }) =>
				JSON.stringify(remoteRef),
			),
		);
		const refs: RemoteSkillRef[] = [];
		let truncated = false;
		let cursor: string | undefined;
		do {
			const page = await client.discover(source.locator, auth, cursor, revision);
			const room = SKILL_SOURCE_MAX_SKILLS - refs.length;
			refs.push(...page.items.slice(0, room));
			truncated ||= page.truncated === true || page.items.length > room;
			revision ??= page.revision;
			cursor = page.next;
		} while (cursor !== undefined && refs.length < SKILL_SOURCE_MAX_SKILLS);
		truncated ||= cursor !== undefined;
		const unlinked = refs.filter((ref) => !linked.has(JSON.stringify(ref)));
		const reads: NewSkillRead[] = [];
		for (let start = 0; start < unlinked.length; start += 8) {
			const batch = await Promise.all(
				unlinked.slice(start, start + 8).map(async (ref) => {
					const key = JSON.stringify(ref);
					try {
						const fetched = await client.fetchLatest(source.locator, ref, auth, revision);
						return {
							key,
							ref,
							fetched,
							contentHash: skillContentHash(storedContentOf(fetched.content)),
							check: this.scanner.scan(fetched),
						};
					} catch (error) {
						if (error instanceof SkillSourceNotFoundError && error.skill) return undefined;
						if (!(error instanceof SkillParseError)) throw error;
						return {
							key,
							ref,
							contentHash: await unreadableSkillHash(error.message, error.contentHash),
							check: this.scanner.scanUnreadable(error),
						};
					}
				}),
			);
			for (const read of batch) if (read) reads.push(read);
		}
		return { reads, truncated };
	}

	async check(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		auth?: SkillSourceAuth,
		revision?: string,
		/** The user of Check for updates. The hourly check has none, so its events reach BigQuery only. */
		userId?: string,
	): Promise<boolean> {
		const { reads, truncated } = await this.discover(source, client, auth, revision);
		const previous = new Map((source.unlinkedSkills ?? []).map((skill) => [skill.key, skill]));
		const seen = new Set(reads.map(({ key }) => key));
		// A truncated read can miss a hidden skill. Keep it hidden until a read sees it again.
		const unseenHidden = truncated
			? (source.unlinkedSkills ?? []).filter(({ key, skipped }) => skipped && !seen.has(key))
			: [];
		const stored = await this.sources.storeUnlinkedSkills(source, [
			...reads.map(
				({ key, contentHash, check }): UnlinkedSkill => ({
					key,
					contentHash,
					verdict: check.verdict,
					skipped:
						previous.get(key)?.contentHash === contentHash && previous.get(key)?.skipped === true,
				}),
			),
			...unseenHidden,
		]);
		if (stored) {
			for (const read of reads) {
				if (
					read.check.verdict === 'pass' ||
					previous.get(read.key)?.contentHash === read.contentHash
				)
					continue;
				await this.telemetry.flaggedSkill(
					{
						provider: source.type,
						stage: 'import',
						verdict: read.check.verdict,
						...flaggedCodes(read.check.findings),
					},
					userId,
				);
			}
		}
		return stored;
	}

	async review(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		auth?: SkillSourceAuth,
	): Promise<SkillNewUpdate[]> {
		const { reads } = await this.discover(source, client, auth);
		const names = await this.skills.findLatestNamesInTarget({ projectId: source.projectId });
		return reads.map(({ key, ref, fetched, contentHash, check }) => ({
			key,
			contentHash,
			check,
			skipped: (source.unlinkedSkills ?? []).some(
				(skill) => skill.key === key && skill.contentHash === contentHash && skill.skipped,
			),
			name: fetched?.content.name ?? null,
			description: fetched?.content.description ?? null,
			location: client.location(ref),
			webUrl: client.webUrl(source.locator, ref, fetched?.revision),
			revision: fetched?.revision ?? '',
			skippedFiles: fetched?.skippedFiles ?? [],
			previewFiles: fetched ? skillPreview(fetched.content).files : [],
			previewTruncated: fetched ? skillPreview(fetched.content).truncated : false,
			nameTaken: fetched ? isNameTaken(fetched.content.name, names) : false,
			error: null,
		}));
	}

	/** Re-fetch before the transaction. Never accept content that was not reviewed. */
	async prepare(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		payload: AcceptSkillSourceUpdatesDto,
		auth?: SkillSourceAuth,
	) {
		const requested = [...payload.newSkills, ...payload.skippedNewSkills];
		if (!requested.length) return [];
		const { reads } = await this.discover(source, client, auth);
		return requested.map(({ key, contentHash }) => {
			const read = reads.find((item) => item.key === key && item.contentHash === contentHash);
			if (!read)
				throw new SkillSourceRequestError(
					'stale',
					'The skills changed. Reload and review them again.',
				);
			const skip = payload.skippedNewSkills.some((item) => item.key === key);
			if (!skip) {
				if (read.check.verdict === 'blocked')
					throw new SkillSourceRequestError('blocked_by_check', 'This skill is blocked.');
				if (read.check.verdict === 'needs_review' && !payload.reviewedWarnings)
					throw new SkillSourceRequestError(
						'review_required',
						'Review the warnings before importing.',
					);
			}
			return { ...read, skip };
		});
	}

	/** The caller holds the source lock and commits updates and imports together. */
	async apply(
		user: User,
		source: SkillSourceConnection,
		reads: Array<NewSkillRead & { skip: boolean }>,
		ctx: OperationContext,
	) {
		if (!reads.length) return [];
		const linked = new Set(
			(await this.sources.findLinksBySource(source.id, ctx)).map(({ remoteRef }) =>
				JSON.stringify(remoteRef),
			),
		);
		const target = { projectId: source.projectId };
		const existing = await this.skills.findLatestNamesInTarget(target, ctx);
		const takenNames = new Set(existing.map(({ name }) => skillNameKey(name)));
		let unlinked = source.unlinkedSkills ?? [];
		const imported = [];
		for (const read of reads) {
			if (linked.has(read.key))
				throw new SkillSourceRequestError(
					'stale',
					'The skills changed. Reload and review them again.',
				);
			if (read.skip) {
				unlinked = [
					...unlinked.filter(({ key }) => key !== read.key),
					{
						key: read.key,
						contentHash: read.contentHash,
						verdict: read.check.verdict,
						skipped: true,
					},
				];
				continue;
			}
			if (!read.fetched)
				throw new SkillSourceRequestError('blocked_by_check', 'This skill is blocked.');
			const { content, revision, skippedFiles } = read.fetched;
			const skill = importableSkillSchema.parse(contentToAgentSkill(content));
			let skillId: string;
			try {
				if (isNameTaken(skill.name, existing)) throw new SkillNameTakenError(skill.name);
				// Match first import: add a number only for names taken by this selection.
				skill.name = nextFreeName(skill.name, takenNames);
				skillId = await this.skillService.createTrusted(
					{
						target,
						skill,
						source: source.type,
						createdById: user.id,
						checkNameTaken: true,
						frontmatter: content.frontmatter,
						sourceRevision: revision,
					},
					ctx,
				);
			} catch (error) {
				if (error instanceof SkillNameTakenError)
					throw new SkillSourceRequestError(
						'name_taken',
						'This scope already has a skill with this name.',
					);
				throw error;
			}
			takenNames.add(skillNameKey(skill.name));
			await this.sources.insertImported(
				{
					skillId,
					sourceId: source.id,
					remoteRef: read.ref,
					baseRevision: revision,
					baseContentHash: read.contentHash,
					skippedFiles,
				},
				ctx,
			);
			unlinked = unlinked.filter(({ key }) => key !== read.key);
			imported.push({ skillId, read });
		}
		await this.sources.saveUnlinkedSkills(source.id, unlinked, ctx);
		return imported;
	}

	async report(
		user: User,
		source: SkillSourceConnection,
		payload: AcceptSkillSourceUpdatesDto,
		reads: Array<NewSkillRead & { skip: boolean }>,
		imported: Array<{ skillId: string; read: NewSkillRead }>,
		error?: unknown,
	) {
		const status = error ? 'failure' : 'success';
		const reason = error ? (skillSourceReasonOf(error) ?? 'unexpected') : undefined;
		const bulk =
			payload.updates.length + payload.newSkills.length + payload.skippedNewSkills.length > 1;
		for (const { key } of payload.skippedNewSkills) {
			const verdict =
				reads.find((read) => read.key === key)?.check.verdict ??
				source.unlinkedSkills?.find((skill) => skill.key === key)?.verdict;
			if (verdict)
				await this.telemetry.reviewedUpdate(
					{
						provider: source.type,
						kind: 'new',
						action: 'skip',
						verdict,
						bulk,
						status,
						...(reason ? { reason } : {}),
					},
					user.id,
				);
		}
		if (!payload.newSkills.length) return;
		const paths = imported.flatMap(({ read }) => read.fetched?.skippedFiles ?? []);
		const skipped = countSkippedFiles(paths);
		const project = source.projectId
			? await this.skills
					.findProjects([source.projectId])
					.then((projects) => projects.get(source.projectId ?? ''))
					.catch(() => undefined)
			: undefined;
		await this.telemetry.importedFromSource(
			{
				provider: source.type,
				access: source.credentialId ? 'credential' : 'public',
				scope_type:
					source.projectId === null ? 'global' : project?.type === 'personal' ? 'personal' : 'team',
				first_or_more: 'more',
				selected: payload.newSkills.length,
				imported: imported.length,
				name_taken: reason === 'name_taken' ? 1 : 0,
				blocked: reason === 'blocked_by_check' ? 1 : 0,
				needs_review: imported.filter(({ read }) => read.check.verdict === 'needs_review').length,
				skipped_files: paths.length,
				skipped_file_extensions: skipped.extensions,
				skipped_script_files: skipped.scripts,
				status,
				...(reason ? { reason } : {}),
			},
			user.id,
		);
		if (imported.length)
			await this.telemetry.created(
				user.id,
				imported.map(({ skillId }) => ({ id: skillId, projectId: source.projectId })),
				source.type,
				'sync',
				{
					source_provider: source.type,
					source_access: source.credentialId ? 'credential' : 'public',
				},
			);
	}
}
