import type {
	AcceptSkillSourceUpdatesDto,
	ReviewSkillSourceUpdateQueryDto,
	SkillNewUpdate,
	SkillPendingUpdate,
	SkillScanResult,
	SkillSourceAcceptResponse,
	SkillSourceCheckResponse,
	SkillSourceUpdates,
	SkillUpdateAgents,
	SkillUpdateCommit,
	SkillUpdateReview,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import { Logger } from '@n8n/backend-common';
import { validate as isUuid } from 'uuid';
import {
	GLOBAL_OWNER_ROLE,
	TransactionRunner,
	UserRepository,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { LRUCache } from 'lru-cache';

import type {
	SkillSourceConnection,
	SkillSourceType,
} from '../database/entities/skill-source-connection.entity';
import type { SkillSourceLink } from '../database/entities/skill-source-link.entity';
import { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillRepository } from '../database/repositories/skill.repository';
import {
	SkillSourceRequestError,
	skillSourceReasonOf,
	toSkillSourceRequestError,
} from '../errors/skill-source-request.error';
import { SkillParseError } from '../errors/skill-parse.error';
import { SkillSourceNotFoundError } from '../errors/skill-source-not-found.error';
import { SkillSourceReadError } from '../errors/skill-source-read.error';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import type {
	FetchedSkill,
	SkillSourceAuth,
	SkillSourceClient,
} from '../sources/skill-source-client';
import {
	rowContent,
	storedContentOf,
	toAgentSkill,
	type ResolvedSkillRow,
} from '../utils/skill-content';
import { skillContentHash, type SkillContent } from '../utils/skill-content-hash';
import { skillSourceHealth } from '../utils/skill-source-health';
import { checkShape } from '../utils/skill-security-rules';
import { getSkillHash } from '../utils/skill-hash';
import { skillPreview } from '../utils/skill-preview';
import {
	pendingContent,
	pendingScan,
	updateCounts,
	updateFiles,
} from '../utils/skill-update-review';
import { SkillNameTakenError } from '../errors/skill-name-taken.error';
import { SkillAgentNameTakenError } from '../errors/skill-agent-name-taken.error';
import { SkillService } from './skill.service';
import { publicAccessKey, SkillSourceBackoff } from './skill-source-backoff';
import { SkillSourceNewSkillsService } from './skill-source-new-skills.service';
import { unreadableSkillHash } from '../utils/skill-unlinked';
import { SkillUsageProxy } from './skill-usage-proxy.service';
import { SkillAccessService } from './skill-access.service';
import { SkillSecurityScanner } from './skill-security-scanner.service';
import { SkillSourceCredentialsProxy } from './skill-source-credentials-proxy.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import {
	flaggedCodes,
	SkillsTelemetry,
	type SkillSourceTelemetryReason,
} from './skills-telemetry.service';

/** Check now checks a source at most this often. */
const CHECK_NOW_INTERVAL_MS = 60_000;

/** Skills fetched at the same time from one source, as at import. */
const FETCH_CONCURRENCY = 8;

/** `background` is the hourly check task. `manual` is Check now. */
type CheckTrigger = 'background' | 'manual';

type VerdictCounts = Record<SkillScanResult['verdict'], number>;

/** A skill read at a revision, or the parse error of a SKILL.md that n8n cannot read. */
type Fetched = FetchedSkill | { unreadable: SkillParseError; revision: string };

/**
 * Checks and reviews of synced skills. Checks store pending content on the link. Accept
 * saves the reviewed content through SkillService and moves the link in one transaction.
 */
@Service()
export class SkillSyncService {
	/**
	 * The check that runs for each source on this main. Check now joins a running check, so
	 * the task and a click never read one source twice at once.
	 */
	private readonly running = new Map<string, Promise<void>>();

	private readonly commits = new LRUCache<string, Promise<SkillUpdateCommit>>({
		max: 100,
		ttl: 60 * 60 * 1000,
	});

	constructor(
		private readonly logger: Logger,
		private readonly flagGate: SkillSyncFlagGate,
		private readonly skillAccess: SkillAccessService,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly skillRepository: SkillRepository,
		private readonly userRepository: UserRepository,
		private readonly clients: SkillSourceClientRegistry,
		private readonly credentials: SkillSourceCredentialsProxy,
		private readonly scanner: SkillSecurityScanner,
		private readonly skillsTelemetry: SkillsTelemetry,
		private readonly skills: SkillService,
		private readonly skillUsage: SkillUsageProxy,
		private readonly projectScopeService: ProjectScopeService,
		private readonly txRunner: TransactionRunner,
		private readonly newSkills: SkillSourceNewSkillsService,
		private readonly backoff: SkillSourceBackoff,
	) {}

	/** Lists stored updates and reads new skills live for the shared review. */
	async listUpdates(user: User, sourceId: string): Promise<SkillSourceUpdates> {
		const { source, client } = await this.requireReview(user, sourceId);
		const links = (await this.sourceRepository.findLinksBySource(sourceId)).filter(
			(link) => link.pendingContentHash && link.pendingRevision,
		);
		const latest = await this.skillRepository.findLatestSaved(links.map((link) => link.skillId));
		const updates: SkillPendingUpdate[] = [];
		for (const link of links) {
			const row = latest.get(link.skillId);
			if (!row || !link.pendingContentHash || !link.pendingRevision) continue;
			const check = pendingScan(link);
			const content = pendingContent(link);
			if (content && check.findings.some(({ rule }) => rule === 'over_limit')) {
				// Refresh size explanations for stored reviews. Keep the stored verdict.
				const limits = checkShape({ content }).filter(({ rule }) => rule === 'over_limit');
				if (limits.length)
					check.findings = [
						...limits,
						...check.findings.filter(({ rule }) => rule !== 'over_limit'),
					];
			}
			const blocked = check.verdict === 'blocked';
			// A blocked update cannot be saved, so the row keeps the saved name and has no clash.
			const incoming = blocked ? null : content;
			// Blocked content can be as large as the archive limit. The review then shows a cut
			// preview and no diff, so the row has no counts.
			const compared = content && !(blocked && skillPreview(content).truncated);
			updates.push({
				skillId: link.skillId,
				name: incoming?.name ?? row.version.name,
				location: client.location(link.remoteRef),
				webUrl: client.webUrl(source.locator, link.remoteRef, link.pendingRevision),
				contentHash: link.pendingContentHash,
				baseVersionId: row.version.id,
				revision: link.pendingRevision,
				revisionUrl: client.revisionUrl?.(source.locator, link.pendingRevision) ?? null,
				check,
				nameClash: incoming ? await this.nameClash(row, incoming.name) : null,
				changes: compared
					? updateCounts(updateFiles(rowContent(row), content))
					: { added: 0, removed: 0 },
				nextVersion: row.version.version + 1,
			});
		}
		const revision = updates[0]?.revision;
		let newSkills: SkillNewUpdate[] = [];
		let newSkillsError: SkillSourceUpdates['newSkillsError'];
		if (source.unlinkedSkills?.length) {
			try {
				newSkills = await this.newSkills.review(source, client, await this.authOf(source, client));
			} catch (error) {
				const reason = skillSourceReasonOf(error) ?? null;
				this.logger.warn('Could not read new skills for source review', { sourceId, reason });
				newSkillsError = { reason };
			}
		}
		return {
			updates,
			newSkills,
			...(newSkillsError ? { newSkillsError } : {}),
			commit: revision ? this.commitFallback(source, client, revision) : null,
		};
	}

	async reviewUpdate(
		user: User,
		sourceId: string,
		skillId: string,
		reviewed: ReviewSkillSourceUpdateQueryDto,
	): Promise<SkillUpdateReview> {
		await this.requireReview(user, sourceId);
		const { link, row } = await this.reviewedUpdate(sourceId, skillId, reviewed);
		const content = pendingContent(link);
		const preview =
			content && pendingScan(link).verdict === 'blocked' ? skillPreview(content) : null;
		const followers = await this.skillUsage.findFollowingAgentIds(skillId);
		return {
			...(preview?.truncated
				? { files: [], preview: { previewFiles: preview.files, previewTruncated: true } }
				: { files: content ? updateFiles(rowContent(row), content) : [] }),
			...(await this.visibleAgents(user, followers)),
		};
	}

	/** Metadata is optional. A remote failure never prevents a stored update from being reviewed. */
	async describeUpdateCommit(
		user: User,
		sourceId: string,
		revision: string,
	): Promise<SkillUpdateCommit> {
		const { source, client } = await this.requireReview(user, sourceId);
		const links = await this.sourceRepository.findLinksBySource(sourceId);
		if (
			!links.some((link) => link.pendingRevision === revision) &&
			!(source.unlinkedSkills?.length && source.probeCursor === revision)
		)
			throw staleUpdate();
		const fallback = this.commitFallback(source, client, revision);
		const metadataKey = `metadata:${accessKey(source)}`;
		if (!client.describeRevision) return fallback;
		try {
			const auth = await this.authOf(source, client);
			const key = JSON.stringify([source.type, source.locator, revision, accessKey(source)]);
			const cached = this.commits.get(key);
			if (cached) return await cached;
			if (this.backoff.isWaiting(metadataKey)) return fallback;
			const pending = client
				.describeRevision(source.locator, revision, auth)
				.then((details) => ({ ...fallback, ...details }));
			this.commits.set(key, pending);
			try {
				return await pending;
			} catch (error) {
				if (this.commits.peek(key) === pending) this.commits.delete(key);
				throw error;
			}
		} catch (error) {
			this.backoff.record(metadataKey, error);
			this.logger.debug('Could not read skill update commit details', {
				sourceId,
				reason: skillSourceReasonOf(error),
			});
			return fallback;
		}
	}

	async acceptUpdates(
		user: User,
		sourceId: string,
		request: Omit<AcceptSkillSourceUpdatesDto, 'newSkills' | 'skippedNewSkills'> &
			Partial<Pick<AcceptSkillSourceUpdatesDto, 'newSkills' | 'skippedNewSkills'>>,
	): Promise<SkillSourceAcceptResponse> {
		const payload: AcceptSkillSourceUpdatesDto = {
			...request,
			newSkills: request.newSkills ?? [],
			skippedNewSkills: request.skippedNewSkills ?? [],
		};
		const bulk =
			payload.updates.length + payload.newSkills.length + payload.skippedNewSkills.length > 1;
		const { source, client } = await this.requireReview(user, sourceId);
		if (
			payload.newSkills.length &&
			!(await this.skillAccess.canOnSource(user, source, 'addSkills'))
		) {
			throw new ForbiddenError('You are not allowed to import skills into this source.');
		}
		const requestedIds = new Set(payload.updates.map(({ skillId }) => skillId));
		const scans = new Map(
			(await this.sourceRepository.findLinksBySource(sourceId))
				.filter((link) => requestedIds.has(link.skillId) && link.pendingScan !== null)
				.map((link) => [link.skillId, pendingScan(link)]),
		);
		let result;
		let newReads: Awaited<ReturnType<SkillSourceNewSkillsService['prepare']>> = [];
		try {
			newReads = await this.newSkills.prepare(
				source,
				client,
				payload,
				payload.newSkills.length || payload.skippedNewSkills.length
					? await this.authOf(source, client)
					: undefined,
			);
			result = await this.txRunner.run({}, async (ctx) => {
				const currentSource = await this.sourceRepository.findForDelete(sourceId, ctx);
				if (
					!currentSource ||
					currentSource.projectId !== source.projectId ||
					currentSource.credentialId !== source.credentialId
				)
					throw staleUpdate();
				if (
					newReads.length &&
					JSON.stringify(currentSource.unlinkedSkills) !== JSON.stringify(source.unlinkedSkills)
				)
					throw staleUpdate();
				// Lock in one order for overlapping selections. Source checks use conditional link writes.
				await this.skillRepository.lockForEdit(
					payload.updates.map(({ skillId }) => skillId).sort(),
					ctx,
				);
				const selected = [];
				for (const reviewed of payload.updates) {
					const current = await this.reviewedUpdate(sourceId, reviewed.skillId, reviewed, ctx);
					const { link, row } = current;
					if (row.skill.projectId !== source.projectId) throw staleUpdate();
					const scan = pendingScan(link);
					scans.set(link.skillId, scan);
					if (scan.verdict === 'blocked') {
						throw new SkillSourceRequestError('blocked_by_check', 'This update is blocked.');
					}
					if (scan.verdict === 'needs_review' && !payload.reviewedWarnings) {
						throw new SkillSourceRequestError(
							'review_required',
							'Review the warnings before updating.',
						);
					}
					const content = pendingContent(link);
					if (!content || !link.pendingRevision) throw staleUpdate();
					selected.push({ ...current, content, revision: link.pendingRevision });
				}
				const saved = [];
				for (const { link, row, content, revision } of selected) {
					if (!(await this.sourceRepository.acceptPending(link.skillId, link, revision, ctx))) {
						throw staleUpdate();
					}
					try {
						const version = await this.skills.saveTrusted(
							link.skillId,
							{
								name: content.name,
								description: content.description,
								instructions: content.instructions,
								references: content.files,
								frontmatter: content.frontmatter,
								baseVersionId: row.version.id,
								baseSkillHash: getSkillHash(toAgentSkill(row)),
								checkedTarget: { projectId: source.projectId },
							},
							user.id,
							ctx,
							{ allowSynced: true, sourceRevision: revision },
						);
						saved.push({ skillId: link.skillId, ...version });
					} catch (error) {
						if (error instanceof SkillNameTakenError || error instanceof SkillAgentNameTakenError) {
							throw new SkillSourceRequestError('name_clash', 'This skill name is already in use.');
						}
						throw error;
					}
				}
				const followers = [...new Set(saved.flatMap((item) => item.followingAgentIds))];
				const imported = await this.newSkills.apply(user, currentSource, newReads, ctx);
				return { saved, followers, imported };
			});
		} catch (error) {
			await this.newSkills.report(user, source, payload, newReads, [], error);
			for (const scan of scans.values()) {
				await this.skillsTelemetry.reviewedUpdate(
					{
						provider: source.type,
						kind: 'update',
						action: 'accept',
						verdict: scan.verdict,
						bulk,
						status: 'failure',
						reason: skillSourceReasonOf(error) ?? 'unexpected',
					},
					user.id,
				);
			}
			throw error;
		}
		await this.newSkills.report(user, source, payload, newReads, result.imported);
		// Side effects happen after the entire selection commits.
		try {
			await this.skills.refreshFollowingAgents(result.followers);
		} catch (error) {
			this.logger.warn('Could not refresh agents after skill updates', {
				error: ensureError(error).message,
			});
		}
		for (const saved of result.saved) {
			if (saved.created)
				await this.skills.trackUpdated(
					user.id,
					{ id: saved.skillId, projectId: source.projectId },
					'ui',
					saved.version,
					false,
				);
		}
		for (const scan of scans.values()) {
			await this.skillsTelemetry.reviewedUpdate(
				{
					provider: source.type,
					kind: 'update',
					action: 'accept',
					verdict: scan.verdict,
					bulk,
					status: 'success',
				},
				user.id,
			);
		}
		// Permission reads use a separate connection, so they must run after commit.
		let impact: SkillUpdateAgents = { agents: [], hiddenAgentCount: result.followers.length };
		try {
			impact = await this.visibleAgents(user, result.followers);
		} catch (error) {
			this.logger.warn('Could not read agent names after skill updates', {
				error: ensureError(error).message,
			});
		}
		return {
			updatedCount: result.saved.length,
			importedCount: result.imported.length,
			...impact,
		};
	}

	private async requireReview(user: User, sourceId: string) {
		await this.flagGate.assertEnabled(user);
		const source = isUuid(sourceId) ? await this.sourceRepository.findById(sourceId) : null;
		const client = source && this.clients.get(source.type);
		if (!source || !client || !(await this.skillAccess.canOnSource(user, source, 'view'))) {
			throw new NotFoundError('Source not found');
		}
		if (!(await this.skillAccess.canOnSource(user, source, 'review'))) {
			throw new ForbiddenError('You are not allowed to review updates from this source.');
		}
		return { source, client };
	}

	private async reviewedUpdate(
		sourceId: string,
		skillId: string,
		reviewed: ReviewSkillSourceUpdateQueryDto,
		ctx: OperationContext = {},
	) {
		const link = await this.sourceRepository.findLinkBySkillId(skillId, ctx);
		const row = (await this.skillRepository.findLatestSaved([skillId], ctx)).get(skillId);
		if (
			!link ||
			!row ||
			link.sourceId !== sourceId ||
			link.pendingContentHash !== reviewed.contentHash ||
			row.version.id !== reviewed.baseVersionId
		) {
			throw staleUpdate();
		}
		return { link, row };
	}

	private async nameClash(
		row: ResolvedSkillRow,
		name: string,
	): Promise<SkillPendingUpdate['nameClash']> {
		try {
			await this.skills.assertCanRename(row.skill.id, row.skill, row.version.name, name);
			return null;
		} catch (error) {
			if (error instanceof SkillNameTakenError) return { name, where: 'scope' };
			// The agent error may name agents the user cannot read. Return only the kind of clash.
			if (error instanceof SkillAgentNameTakenError) return { name, where: 'agent' };
			throw error;
		}
	}

	private async visibleAgents(user: User, agentIds: string[]): Promise<SkillUpdateAgents> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		const all = await this.skillUsage.findAgents(agentIds);
		const agents = [...all].flatMap(([id, agent]) =>
			projectIds === null || projectIds.includes(agent.projectId) ? [{ id, name: agent.name }] : [],
		);
		return { agents, hiddenAgentCount: all.size - agents.length };
	}

	private commitFallback(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		revision: string,
	): SkillUpdateCommit {
		return {
			revision,
			webUrl: client.revisionUrl?.(source.locator, revision) ?? null,
			message: null,
			author: null,
			date: null,
		};
	}

	/**
	 * Turns a synced skill into a normal skill that n8n can edit and move on its own. It keeps
	 * all its versions, and an update that waited for review is dropped. It cannot be undone:
	 * the skill does not sync again. `skill.source` keeps its value, as it records how the
	 * skill was created.
	 */
	async stopSyncing(user: User, skillId: string): Promise<void> {
		const checked = await this.requireSource(user, skillId, 'stopSyncing');
		const [canRead, canUpdate] = await Promise.all([
			this.skillAccess.accessCheck(user, 'read'),
			this.skillAccess.accessCheck(user, 'update'),
		]);
		const result = await this.txRunner.run({}, async (ctx) => {
			await this.sourceRepository.invalidateSourceForSkill(skillId, ctx);
			// Source deletion takes the same lock before it reads which skills are still synced.
			await this.skillRepository.lockForEdit([skillId], ctx);
			const link = await this.sourceRepository.findLinkBySkillId(skillId, ctx);
			if (!link) return null;
			const source = await this.sourceRepository.findById(link.sourceId, ctx);
			if (!source || source.id !== checked.source.id) {
				throw new ConflictError('The source scope changed. Reload the skill and try again.');
			}
			if (source.projectId !== checked.source.projectId) {
				if (!canRead(source)) throw new NotFoundError('Skill not found');
				if (!canUpdate(source))
					throw new ForbiddenError('You are not allowed to stop syncing this skill.');
			}
			const current = { link, source };
			if (!(await this.sourceRepository.deleteLink(skillId, ctx))) return null;
			return current;
		});
		if (!result) return;
		const { link, source } = result;
		await this.skillsTelemetry.stoppedSync(
			{ provider: source.type, had_pending_update: link.pendingContentHash !== null },
			user.id,
		);
	}

	/**
	 * Check for updates on one source, as the hourly check does. A source checked less than a minute ago, also by the hourly check, is not checked
	 * again, and the answer says so.
	 */
	async checkNow(user: User, sourceId: string): Promise<SkillSourceCheckResponse> {
		await this.flagGate.assertEnabled(user);
		// A malformed id finds no source. Postgres refuses it in a uuid column, so it is not read.
		const source = isUuid(sourceId) ? await this.sourceRepository.findById(sourceId) : null;
		const client = source && this.clients.get(source.type);
		// 404 for a source that the user cannot see, so the answer reveals nothing about it.
		if (!source || !client || !(await this.skillAccess.canOnSource(user, source, 'view'))) {
			throw new NotFoundError('Source not found');
		}
		if (!(await this.skillAccess.canOnSource(user, source, 'checkNow'))) {
			throw new ForbiddenError('You are not allowed to check this source.');
		}
		const label = client.describe(source.locator).label;
		const track = async (props: {
			updatesFound: number;
			throttled: boolean;
			reason?: SkillSourceTelemetryReason;
		}) =>
			await this.skillsTelemetry.checkedNow(
				{
					provider: source.type,
					updates_found: props.updatesFound,
					new_skills_found:
						(await this.sourceRepository.findById(source.id))?.unlinkedSkills?.filter(
							({ skipped }) => !skipped,
						).length ?? 0,
					throttled: props.throttled,
					status: props.reason ? 'failure' : 'success',
					...(props.reason ? { reason: props.reason } : {}),
				},
				user.id,
			);

		// A check of the source that runs on this main is joined. Else the click claims the
		// minute in one conditional update, so two clicks, also on two mains, check once.
		const joined = this.running.has(source.id);
		if (
			!joined &&
			!(await this.sourceRepository.claimCheckNow(source.id, new Date(), CHECK_NOW_INTERVAL_MS))
		) {
			const [updatesFound, current] = await Promise.all([
				this.sourceRepository.countPendingUpdates(source.id),
				this.sourceRepository.findById(source.id),
			]);
			await track({ updatesFound, throttled: true });
			return {
				label,
				updatesFound,
				newSkillsFound: current?.unlinkedSkills?.filter(({ skipped }) => !skipped).length ?? 0,
				throttled: true,
				lastCheckedAt: current?.lastCheckedAt?.toISOString() ?? null,
			};
		}

		try {
			await this.check(source, 'manual', user.id);
		} catch (error) {
			await track({
				updatesFound: await this.sourceRepository.countPendingUpdates(source.id),
				throttled: false,
				reason: skillSourceReasonOf(error) ?? 'unexpected',
			});
			throw toSkillSourceRequestError(error);
		}
		const [updatesFound, checked] = await Promise.all([
			this.sourceRepository.countPendingUpdates(source.id),
			this.sourceRepository.findById(source.id),
		]);
		await track({ updatesFound, throttled: false });
		return {
			label,
			updatesFound,
			newSkillsFound: checked?.unlinkedSkills?.filter(({ skipped }) => !skipped).length ?? 0,
			throttled: false,
			lastCheckedAt: checked?.lastCheckedAt?.toISOString() ?? null,
		};
	}

	/**
	 * The hourly check: each source in turn. A source whose type has no client on this build,
	 * or whose creator (the instance owner when the creator is gone) does not have Skill Sync,
	 * is skipped. A failed source does not stop the others: its reason is stored on the source.
	 */
	async checkAll(signal?: AbortSignal): Promise<void> {
		const sources = await this.sourceRepository.findAllSources();
		const creators = await this.findCreators(sources);
		const owner = sources.some((source) => !source.createdById)
			? await this.findInstanceOwner()
			: null;
		for (const { id, type, createdById } of sources) {
			if (signal?.aborted) return;
			if (!this.clients.get(type)) continue;
			// The check has no user, so it reads the flag of the user who connected the source. A
			// source whose creator is gone reads the flag of the instance owner, so its checks go on.
			const flagUser = (createdById ? creators.get(createdById) : undefined) ?? owner;
			if (!flagUser) continue;
			try {
				if (!(await this.flagGate.isEnabled(flagUser))) continue;
				// A run can take half an hour, so the row read at the start can be stale: a Check now
				// meanwhile moves the cursor, and the stale one would download the source again.
				const source = await this.sourceRepository.findById(id);
				if (!source) continue;
				await this.check(source, 'background');
			} catch (error) {
				this.logger.debug('Skill source check failed', {
					sourceId: id,
					reason: skillSourceReasonOf(error),
					error: ensureError(error).message,
				});
			}
		}
	}

	// ---------------------------------------------------------------- check

	/** One check of a source. A check of the same source that runs on this main is joined. */
	private async check(
		source: SkillSourceConnection,
		trigger: CheckTrigger,
		userId?: string,
	): Promise<void> {
		const pending = this.running.get(source.id);
		if (pending) return await pending;
		const run = this.runCheck(source, trigger, userId).finally(() =>
			this.running.delete(source.id),
		);
		this.running.set(source.id, run);
		return await run;
	}

	/**
	 * Probes the source first: an unchanged source costs one request. A changed source has
	 * each synced skill fetched at the new revision and compared with the stored content. A
	 * failure is stored on the source and thrown.
	 */
	private async runCheck(
		source: SkillSourceConnection,
		trigger: CheckTrigger,
		userId?: string,
	): Promise<void> {
		const client = this.clients.get(source.type);
		if (!client) return;
		const access = accessKey(source);
		const checkedAt = new Date();
		const previousBackoff = this.backoff.get(access);
		// Still waiting after a rate limit: no request, and the wait does not grow. The check time
		// stays, because n8n did not read the source, so the task still checks it first next time.
		if (this.backoff.isWaiting(access, checkedAt.getTime())) {
			if (await this.sourceRepository.recordDelayed(source)) {
				await this.trackHealthChange(source, 'rate_limited');
			}
			throw new SkillSourceReadError(
				'rate_limited',
				'The source limits how often n8n can read it. n8n checks again later.',
			);
		}
		try {
			const auth = await this.authOf(source, client);
			const cursor = client.probe ? await client.probe(source.locator, auth) : undefined;
			if (cursor !== undefined && cursor === source.probeCursor && source.unlinkedSkills !== null) {
				await this.recordCheck(source, { checkedAt, errorReason: null });
				this.backoff.release(access, previousBackoff);
				return;
			}
			const links = await this.sourceRepository.findLinksBySource(source.id);
			const { counts, conflict } = await this.compareAll(source, client, links, auth, cursor);
			const discovered = await this.newSkills.check(source, client, auth, cursor, userId);
			// A link that another check changed meanwhile was not written: no cursor, so the next
			// check reads every skill again.
			const next = conflict || !discovered ? null : cursor;
			await this.recordCheck(source, {
				checkedAt,
				errorReason: null,
				...(next !== undefined ? { probeCursor: { from: source.probeCursor, to: next } } : {}),
			});
			// A concurrent source check can set a newer limit for the same credential.
			this.backoff.release(access, previousBackoff);
			const found = counts.pass + counts.needs_review + counts.blocked;
			if (found > 0) {
				await this.skillsTelemetry.updateFound({
					provider: source.type,
					trigger,
					skills_with_updates: found,
					...counts,
				});
			}
		} catch (error) {
			this.backoff.record(access, error);
			await this.recordCheck(source, {
				checkedAt,
				errorReason: skillSourceReasonOf(error) ?? 'unexpected',
			});
			throw error;
		}
	}

	private async recordCheck(
		source: SkillSourceConnection,
		result: Parameters<SkillSourceRepository['recordCheck']>[1],
	) {
		const written = await this.sourceRepository.recordCheck(source.id, {
			...result,
			credentialId: source.credentialId,
			readScope: source,
		});
		if (written) await this.trackHealthChange(source, result.errorReason);
	}

	private async trackHealthChange(source: SkillSourceConnection, reason: string | null) {
		const previous = skillSourceHealth(source.lastErrorReason);
		const health = skillSourceHealth(reason);
		if (previous !== health) {
			await this.skillsTelemetry.sourceHealthChanged({
				provider: source.type,
				previous_health: previous,
				health,
			});
		}
	}

	/**
	 * The access of the stored credential, in the scope of the source and without a user. A
	 * credential that is gone or that the scope no longer accepts gives `credential_missing`.
	 */
	private async authOf(
		source: SkillSourceConnection,
		client: SkillSourceClient,
	): Promise<SkillSourceAuth | undefined> {
		if (!source.credentialId) {
			if (source.credentialRequired) {
				throw new SkillSourceRequestError(
					'credential_missing',
					'The credential of this source is gone. Replace it to check for updates.',
				);
			}
			return undefined;
		}
		let credential;
		try {
			credential = await this.credentials.resolve(source.credentialId, {
				projectId: source.projectId,
				types: client.credentialTypes,
				check: (resolved) => client.checkCredential?.(resolved),
			});
		} catch (error) {
			// A failure without a reason comes from decrypting the credential or minting its token.
			if (skillSourceReasonOf(error) !== undefined) throw error;
			throw new SkillSourceRequestError(
				'credential_invalid',
				'n8n could not get a token from the credential of this source. Check its settings.',
				{ cause: error },
			);
		}
		if (!credential) {
			throw new SkillSourceRequestError(
				'credential_missing',
				'The credential of this source is gone, or its scope can no longer use it.',
			);
		}
		return client.authFrom(credential);
	}

	/**
	 * Compares each synced skill with the source, and counts the new updates by verdict.
	 * `conflict` is true when another check changed a link meanwhile, so a write was skipped.
	 */
	private async compareAll(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		links: SkillSourceLink[],
		auth: SkillSourceAuth | undefined,
		revision: string | undefined,
	): Promise<{ counts: VerdictCounts; conflict: boolean }> {
		const counts: VerdictCounts = { pass: 0, needs_review: 0, blocked: 0 };
		let conflict = false;
		if (links.length === 0) return { counts, conflict };
		for (let start = 0; start < links.length; start += FETCH_CONCURRENCY) {
			const batch = links.slice(start, start + FETCH_CONCURRENCY);
			// Per batch, so a source with many large skills never holds all of them at once.
			const latest = await this.skillRepository.findLatestSaved(batch.map((link) => link.skillId));
			const verdicts = await Promise.all(
				batch.map(async (link) => {
					const fetched = await this.fetch(source, client, link, auth, revision);
					const row = latest.get(link.skillId);
					if (!(await this.sourceRepository.setLinkAvailability(link, !fetched))) return 'conflict';
					if (!fetched || !row) return undefined;
					return await this.compare(source.type, link, fetched, rowContent(row));
				}),
			);
			for (const result of verdicts) {
				if (result === 'conflict') conflict = true;
				else if (result) counts[result] += 1;
			}
		}
		return { counts, conflict };
	}

	/**
	 * The skill at the revision. Undefined when its folder is gone from the source: the skill
	 * keeps its version, and the source tooltip names it. A SKILL.md that n8n
	 * cannot parse comes back as `unreadable`, so it becomes a blocked update, as at import. A
	 * source that refuses the read, such as a tarball that answers 403, fails the whole check,
	 * so the cursor stays and the next check reads the source again.
	 */
	private async fetch(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		link: SkillSourceLink,
		auth: SkillSourceAuth | undefined,
		revision: string | undefined,
	): Promise<Fetched | undefined> {
		try {
			return await client.fetchLatest(source.locator, link.remoteRef, auth, revision);
		} catch (error) {
			if (error instanceof SkillSourceNotFoundError && error.skill) return undefined;
			if (error instanceof SkillParseError) {
				return { unreadable: error, revision: revision ?? link.baseRevision };
			}
			throw error;
		}
	}

	/**
	 * Stores what changed for one skill, and answers the verdict of a new update, or
	 * `conflict` when another check changed the link since this check read it. It compares
	 * with `baseContentHash`, the content of the latest version, as a synced skill changes only
	 * when Skill Sync accepts an update, and accept moves the base:
	 * - the base content: the base moves, and a pending update is dropped;
	 * - the content of the pending update: nothing changes;
	 * - the content of an update the user skipped: a newer pending update is dropped;
	 * - other content: the security check rates it against the latest version, and it waits
	 *   for review in place of an older update. A SKILL.md that n8n cannot parse is blocked.
	 */
	private async compare(
		provider: SkillSourceType,
		link: SkillSourceLink,
		fetched: Fetched,
		previous: ReturnType<typeof rowContent>,
	): Promise<SkillScanResult['verdict'] | 'conflict' | undefined> {
		const { content, hash, rate } = await this.candidateOf(fetched, previous);
		const read = link.pendingContentHash;
		if (hash === link.baseContentHash) {
			if (read === null && link.baseRevision === fetched.revision) return undefined;
			return (await this.sourceRepository.moveBase(link.skillId, fetched.revision, link))
				? undefined
				: 'conflict';
		}
		if (hash === read) return undefined;
		if (hash === link.skippedContentHash) {
			// The source went back to the content that the user skipped: a newer update is gone.
			if (read === null) return undefined;
			return (await this.sourceRepository.moveBase(link.skillId, link.baseRevision, link))
				? undefined
				: 'conflict';
		}
		const scan = rate();
		const stored = await this.sourceRepository.storePending(
			link.skillId,
			{
				content,
				contentHash: hash,
				scan,
				revision: fetched.revision,
				state: scan.verdict === 'blocked' ? 'update_blocked' : 'update_available',
			},
			link,
		);
		if (!stored) return 'conflict';
		if (scan.verdict !== 'pass') {
			// No user: the event reaches BigQuery only, as for every background check.
			await this.skillsTelemetry.flaggedSkill({
				provider,
				stage: 'update',
				verdict: scan.verdict,
				...flaggedCodes(scan.findings),
			});
		}
		return scan.verdict;
	}

	/**
	 * The content and hash that a check compares, and how the security check rates it. A
	 * SKILL.md that n8n cannot parse keeps only its hash, so the same broken file is reported
	 * once, and the check blocks it, as at import.
	 */
	private async candidateOf(
		fetched: Fetched,
		previous: ReturnType<typeof rowContent>,
	): Promise<{ content: SkillContent | null; hash: string; rate: () => SkillScanResult }> {
		if ('unreadable' in fetched) {
			const { unreadable } = fetched;
			return {
				content: null,
				hash: await unreadableSkillHash(unreadable.message, unreadable.contentHash),
				rate: () => this.scanner.scanUnreadable(unreadable),
			};
		}
		const content = storedContentOf(fetched.content);
		return {
			content,
			hash: skillContentHash(content),
			rate: () => this.scanner.scan({ ...fetched, content }, previous),
		};
	}

	// ---------------------------------------------------------------- access

	/**
	 * The link and the source of a synced skill that the user may act on. 404 for a skill
	 * that the user cannot read or that is not synced, 403 when the user may read it but not
	 * do the action.
	 */
	private async requireSource(
		user: User,
		skillId: string,
		action: 'stopSyncing',
	): Promise<{ link: SkillSourceLink; source: SkillSourceConnection }> {
		await this.flagGate.assertEnabled(user);
		// 404 for a skill the user cannot read, so the answer reveals nothing about it.
		await this.skillAccess.requireAccess(user, skillId, 'read');
		const link = await this.sourceRepository.findLinkBySkillId(skillId);
		const source = link && (await this.sourceRepository.findById(link.sourceId));
		if (!link || !source) throw new NotFoundError('This skill is not synced.');
		if (!(await this.skillAccess.canOnSource(user, source, action))) {
			throw new ForbiddenError('You are not allowed to change the skills of this source.');
		}
		return { link, source };
	}

	private async findCreators(sources: SkillSourceConnection[]): Promise<Map<string, User>> {
		const ids = [...new Set(sources.flatMap((source) => source.createdById ?? []))];
		if (ids.length === 0) return new Map();
		const users = await this.userRepository.findManyByIds(ids);
		return new Map(users.map((user) => [user.id, user]));
	}

	private async findInstanceOwner(): Promise<User | null> {
		return await this.userRepository.findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});
	}
}

/** A credential, or the public access of a source type, as a rate limit applies to it. */
function accessKey(source: SkillSourceConnection): string {
	if (source.credentialId) return `credential:${source.credentialId}`;
	return source.credentialRequired ? `missing:${source.id}` : publicAccessKey(source.type);
}

function staleUpdate() {
	return new SkillSourceRequestError('stale', 'The updates changed. Reload and review them again.');
}
