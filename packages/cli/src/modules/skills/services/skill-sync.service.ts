import type {
	AcceptSkillUpdatesDto,
	ReviewSkillUpdateDto,
	SkillPendingUpdate,
	SkillScanFinding,
	SkillScanResult,
	SkillSourceCheckResponse,
	SkillSourceUpdates,
	SkillUpdateAcceptResponse,
	SkillUpdateCommit,
	SkillUpdateReview,
	SkillUpdatesAcceptResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { createHash } from 'node:crypto';
import { TransactionRunner, UserRepository, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';

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
import { SkillNameTakenError } from '../errors/skill-name-taken.error';
import {
	contentToAgentSkill,
	rowContent,
	storedContentFrom,
	storedContentOf,
	toAgentSkill,
	type ResolvedSkillRow,
} from '../utils/skill-content';
import { getSkillHash } from '../utils/skill-hash';
import { skillContentHash, type SkillContent } from '../utils/skill-content-hash';
import { SkillAccessService } from './skill-access.service';
import { SkillSecurityScanner } from './skill-security-scanner.service';
import { SkillSourceCredentialsProxy } from './skill-source-credentials-proxy.service';
import { SkillSourceService } from './skill-source.service';
import { SkillUsageProxy } from './skill-usage-proxy.service';
import { SkillService } from './skill.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillsTelemetry, type SkillSourceTelemetryReason } from './skills-telemetry.service';

/** Check now checks a source at most this often. */
const CHECK_NOW_INTERVAL_MS = 60_000;

/** How long to wait after a rate limit whose answer did not say. */
const DEFAULT_RETRY_AFTER_SECONDS = 60;

/** Skills fetched at the same time from one source, as at import. */
const FETCH_CONCURRENCY = 8;

/** `background` is the hourly check task. `manual` is Check now. */
type CheckTrigger = 'background' | 'manual';

type VerdictCounts = Record<SkillScanResult['verdict'], number>;

/** A skill read at a revision, or the parse error of a SKILL.md that n8n cannot read. */
type Fetched = FetchedSkill | { unreadable: SkillParseError; revision: string };

/**
 * What happens to synced skills after the import: the checks for updates, stop syncing, and
 * the review of updates later. Every write goes through the link of the skill, never the
 * skill: a check stores an update that waits for review, and no skill or version changes.
 */
@Service()
export class SkillSyncService {
	/**
	 * The check that runs for each source on this main. Check now joins a running check, so
	 * the task and a click never read one source twice at once.
	 */
	private readonly running = new Map<string, Promise<void>>();

	/**
	 * When each access may read its source again after a rate limit: a credential, or the
	 * public access of a source type. In memory, so a restart or another main forgets it.
	 */
	private readonly retryAt = new Map<string, number>();

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
		private readonly skillService: SkillService,
		private readonly sourceService: SkillSourceService,
		private readonly skillUsage: SkillUsageProxy,
		private readonly txRunner: TransactionRunner,
	) {}

	/**
	 * Turns a synced skill into a normal skill that n8n can edit and move on its own. It keeps
	 * all its versions, and an update that waited for review is dropped. It cannot be undone:
	 * the skill does not sync again. `skill.source` keeps its value, as it records how the
	 * skill was created.
	 */
	async stopSyncing(user: User, skillId: string): Promise<void> {
		const { link, source } = await this.requireSource(user, skillId, 'stopSyncing');
		// A stop at the same time removed the link first. The skill is not synced either way.
		if (!(await this.sourceRepository.deleteLink(skillId))) return;
		await this.skillsTelemetry.stoppedSync(
			{ provider: source.type, had_pending_update: link.pendingContentHash !== null },
			user.id,
		);
	}

	/**
	 * Check now on a synced skill: checks the whole source of the skill, as the hourly check
	 * does. A source checked less than a minute ago, also by the hourly check, is not checked
	 * again, and the answer says so.
	 */
	async checkNow(user: User, skillId: string): Promise<SkillSourceCheckResponse> {
		const { source } = await this.requireSource(user, skillId, 'checkNow');
		return await this.checkSourceNow(user, source);
	}

	/** Check now from the Sources tab: the same check for a source by its id. */
	async checkNowBySource(user: User, sourceId: string): Promise<SkillSourceCheckResponse> {
		await this.flagGate.assertEnabled(user);
		const source = await this.sourceRepository.findById(sourceId);
		if (
			!source ||
			!this.clients.get(source.type) ||
			!(await this.skillAccess.canOnSource(user, source, 'view'))
		) {
			throw new NotFoundError('Source not found');
		}
		if (!(await this.skillAccess.canOnSource(user, source, 'checkNow'))) {
			throw new ForbiddenError('You are not allowed to check this source.');
		}
		return await this.checkSourceNow(user, source);
	}

	private async checkSourceNow(
		user: User,
		source: SkillSourceConnection,
	): Promise<SkillSourceCheckResponse> {
		const client = this.clients.get(source.type);
		if (!client) throw new NotFoundError('This skill is not synced.');
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
				throttled: true,
				lastCheckedAt: current?.lastCheckedAt?.toISOString() ?? null,
			};
		}

		try {
			await this.check(source, 'manual');
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
			throttled: false,
			lastCheckedAt: checked?.lastCheckedAt?.toISOString() ?? null,
		};
	}

	/**
	 * The hourly check: each source in turn. A source whose type has no client on this build,
	 * or whose creator does not have Skill Sync, is skipped. A failed source does not stop the
	 * others: its reason is stored on the source.
	 */
	async checkAll(signal?: AbortSignal): Promise<void> {
		const sources = await this.sourceRepository.findAllSources();
		const creators = await this.findCreators(sources);
		for (const source of sources) {
			if (signal?.aborted) return;
			if (!this.clients.get(source.type)) continue;
			// The check has no user, so it reads the flag of the user who connected the source.
			const creator = source.createdById ? creators.get(source.createdById) : undefined;
			if (!creator) {
				this.logger.debug('Skill source check skipped: its creator is gone', {
					sourceId: source.id,
				});
				continue;
			}
			try {
				if (!(await this.flagGate.isEnabled(creator))) continue;
				await this.check(source, 'background');
			} catch (error) {
				this.logger.debug('Skill source check failed', {
					sourceId: source.id,
					reason: skillSourceReasonOf(error),
					error: ensureError(error).message,
				});
			}
		}
	}

	// ---------------------------------------------------------------- review

	/**
	 * The "Updates from" dialog: every update of the source that waits for review, blocked ones
	 * included. Everyone who sees the source sees its updates. Only users who may review get
	 * `canReview`, as an update to a Global source waits for an admin.
	 */
	async listUpdates(user: User, sourceId: string): Promise<SkillSourceUpdates> {
		await this.flagGate.assertEnabled(user);
		const source = await this.sourceRepository.findById(sourceId);
		const client = source && this.clients.get(source.type);
		if (!source || !client || !(await this.skillAccess.canOnSource(user, source, 'view'))) {
			throw new NotFoundError('Source not found');
		}
		const [summary] = await this.sourceService.describeSources(user, [source]);
		const links = await this.sourceRepository.findPendingLinks(source.id);
		const updates: SkillPendingUpdate[] = [];
		// In batches, as each update reads its agents and its rename rules.
		for (let start = 0; start < links.length; start += FETCH_CONCURRENCY) {
			const batch = links.slice(start, start + FETCH_CONCURRENCY);
			const latest = await this.skillRepository.findLatestSaved(batch.map((link) => link.skillId));
			const described = await Promise.all(
				batch.map(async (link) => await this.describeUpdate(source, client, link, latest)),
			);
			updates.push(...described.flatMap((update) => update ?? []));
		}
		return {
			source: summary,
			// The newest revision that the check read, so the dialog names the latest commit.
			commit: await this.newestCommitOf(source, client, links),
			updates: updates.sort((a, b) => a.name.localeCompare(b.name)),
		};
	}

	/** The review of one update: the diff, the check, the commit and what happens next. */
	async getUpdate(user: User, skillId: string): Promise<SkillUpdateReview> {
		const { link, source, client } = await this.requirePending(user, skillId, 'view');
		const latest = await this.skillRepository.findLatestSaved([skillId]);
		const update = await this.describeUpdate(source, client, link, latest);
		if (!update) throw staleError();
		const [described] = await this.sourceService.describeSources(user, [source]);
		return { source: described, commit: await this.commitOf(source, client, link), update };
	}

	/**
	 * Accept: the reviewed update becomes the next version of the skill. Following agents get
	 * unpublished changes, and published agents keep their pinned version.
	 */
	async accept(
		user: User,
		skillId: string,
		review: ReviewSkillUpdateDto,
	): Promise<SkillUpdateAcceptResponse> {
		const { link, source } = await this.requirePending(user, skillId, 'review', {
			action: 'accept',
		});
		return await this.acceptOne(user, source, link, review, false);
	}

	/** Skip: hides the update until the source changes again. */
	async skip(user: User, skillId: string, review: ReviewSkillUpdateDto): Promise<void> {
		const { link, source } = await this.requirePending(user, skillId, 'review', {
			action: 'skip',
		});
		const track = this.reviewTracker(user, source, link, 'skip', false);
		try {
			if (link.pendingContentHash !== review.contentHash) throw staleError();
			if (!(await this.sourceRepository.skipPending(skillId, review.contentHash))) {
				throw staleError();
			}
		} catch (error) {
			await track(error);
			throw toSkillSourceRequestError(error);
		}
		await track();
	}

	/**
	 * Update all: accepts each reviewed update of the source, each in its own transaction, so
	 * one update that cannot come in, such as a renamed skill whose name is taken, does not
	 * stop the others. The answer lists the updates that did not come in, with their reason.
	 */
	async acceptAll(
		user: User,
		sourceId: string,
		request: AcceptSkillUpdatesDto,
	): Promise<SkillUpdatesAcceptResponse> {
		await this.flagGate.assertEnabled(user);
		const source = await this.sourceRepository.findById(sourceId);
		if (!source || !(await this.skillAccess.canOnSource(user, source, 'view'))) {
			throw new NotFoundError('Source not found');
		}
		if (!(await this.skillAccess.canOnSource(user, source, 'review'))) {
			throw new ForbiddenError('You are not allowed to review the updates of this source.');
		}
		const response: SkillUpdatesAcceptResponse = { accepted: [], failed: [] };
		for (const { skillId, contentHash } of uniqueBy(request.updates, (update) => update.skillId)) {
			const link = await this.sourceRepository.findLinkBySkillId(skillId);
			try {
				if (link?.sourceId !== source.id) throw staleError();
				response.accepted.push(
					await this.acceptOne(
						user,
						source,
						link,
						{ contentHash, reviewedWarnings: request.reviewedWarnings },
						true,
					),
				);
			} catch (error) {
				// Earlier updates already came in, so a failure of one never fails the answer.
				const reason = skillSourceReasonOf(error);
				if (!reason) {
					this.logger.warn('An update of Update all failed', {
						skillId,
						error: ensureError(error).message,
					});
				}
				response.failed.push({ skillId, reason: reason ?? 'unexpected' });
			}
		}
		return response;
	}

	private async acceptOne(
		user: User,
		source: SkillSourceConnection,
		link: SkillSourceLink,
		{ contentHash, reviewedWarnings }: ReviewSkillUpdateDto,
		bulk: boolean,
	): Promise<SkillUpdateAcceptResponse> {
		const track = this.reviewTracker(user, source, link, 'accept', bulk);
		try {
			const verdict = scanOf(link)?.verdict;
			const revision = link.pendingRevision;
			if (link.pendingContentHash !== contentHash || revision === null) throw staleError();
			const content = storedContentFrom(link.pendingContent);
			if (verdict === 'blocked' || !content) {
				throw new SkillSourceRequestError(
					'blocked_by_check',
					'The security check blocked this update. Nobody can accept it.',
				);
			}
			if (verdict === 'needs_review' && reviewedWarnings !== true) {
				throw new SkillSourceRequestError(
					'review_required',
					'This update needs a review of its warnings before it can come in.',
				);
			}
			const update = contentToAgentSkill(content);
			const saved = await this.txRunner.run({}, async (ctx) => {
				// Locked before the read, so a second accept waits and then finds the link moved on.
				await this.skillRepository.lockForEdit([link.skillId], ctx);
				const latest = (await this.skillRepository.findLatestSaved([link.skillId], ctx)).get(
					link.skillId,
				);
				if (!latest) throw skillDeletedError();
				const clash = await this.nameClashOf(latest, update.name, ctx);
				if (clash) throw nameClashError(clash.name);
				let result;
				try {
					result = await this.skillService.saveTrusted(
						link.skillId,
						{
							baseSkillHash: getSkillHash(toAgentSkill(latest)),
							baseVersionId: latest.version.id,
							name: update.name,
							description: update.description,
							instructions: update.instructions,
							// An empty list removes every file, as the update has none.
							references: update.references ?? [],
							frontmatter: content.frontmatter,
						},
						user.id,
						ctx,
						{ allowSynced: true, sourceRevision: revision },
					);
				} catch (error) {
					// The rename rules ran again under the lock: a name taken since the check.
					if (error instanceof SkillNameTakenError) throw nameClashError(update.name);
					// Another save of the skill got there first.
					if (error instanceof ConflictError) throw staleError();
					if (error instanceof NotFoundError) throw skillDeletedError();
					throw error;
				}
				// The link must still hold the reviewed update, or another review won.
				if (
					!(await this.sourceRepository.acceptPending(link.skillId, contentHash, revision, ctx))
				) {
					throw staleError();
				}
				return result;
			});
			await this.refreshAfterCommit(saved.followingAgentIds);
			if (saved.created) {
				await this.skillService.trackUpdated(user.id, link.skillId, 'github', saved.version, false);
			}
			await track();
			return { skillId: link.skillId, name: saved.skill.name, version: saved.version };
		} catch (error) {
			await track(error);
			throw toSkillSourceRequestError(error);
		}
	}

	/** The version is stored: a failed push to the editors of following agents does not fail it. */
	private async refreshAfterCommit(agentIds: string[]): Promise<void> {
		try {
			await this.skillService.refreshFollowingAgents(agentIds);
		} catch (error) {
			this.logger.warn('Could not refresh the agents that follow a skill', {
				error: ensureError(error).message,
			});
		}
	}

	/**
	 * One event for each accept or skip that reached a pending update, also a failed one. A
	 * request refused before, such as for a hidden skill, sends none.
	 */
	private reviewTracker(
		user: User,
		source: SkillSourceConnection,
		link: SkillSourceLink | undefined,
		action: 'accept' | 'skip',
		bulk: boolean,
	) {
		const verdict = link ? scanOf(link)?.verdict : undefined;
		return async (error?: unknown) =>
			await this.skillsTelemetry.reviewedUpdate(
				{
					provider: source.type,
					action,
					...(verdict ? { verdict } : {}),
					bulk,
					status: error === undefined ? 'success' : 'failure',
					...(error === undefined ? {} : { reason: skillSourceReasonOf(error) ?? 'unexpected' }),
				},
				user.id,
			);
	}

	/**
	 * The update of one link for the dialog and the review. Undefined when the skill is gone,
	 * such as after a delete at the same time.
	 */
	private async describeUpdate(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		link: SkillSourceLink,
		latest: Map<string, ResolvedSkillRow>,
	): Promise<SkillPendingUpdate | undefined> {
		const row = latest.get(link.skillId);
		const scan = scanOf(link);
		if (!row || !scan || link.pendingContentHash === null || link.pendingRevision === null) {
			return undefined;
		}
		const content = storedContentFrom(link.pendingContent);
		const update = content ? contentToAgentSkill(content) : null;
		const usage = await this.skillUsage.findUsage(link.skillId, 'all', {});
		const clash =
			update && scan.verdict !== 'blocked' ? await this.nameClashOf(row, update.name) : null;
		return {
			skillId: link.skillId,
			name: row.version.name,
			location: client.location(link.remoteRef),
			webUrl: client.webUrl(source.locator, link.remoteRef),
			contentHash: link.pendingContentHash,
			revision: link.pendingRevision,
			check: scan,
			current: toAgentSkill(row),
			update,
			currentFrontmatter: row.version.frontmatter,
			updateFrontmatter: content?.frontmatter ?? null,
			nameClash: clash,
			impact: {
				nextVersion: row.version.version + 1,
				followingAgents: new Set(
					usage.drafts.filter((draft) => !draft.pinned).map((draft) => draft.agentId),
				).size,
				publishedAgents: new Set(usage.pins.map((pin) => pin.agentId)).size,
			},
		};
	}

	/**
	 * The clash when the update renames the skill to a name that its scope (`scope`) or one of
	 * its agents (`agent`) already uses, else null. Accept refuses it with `name_clash`.
	 */
	private async nameClashOf(
		row: ResolvedSkillRow,
		newName: string,
		ctx: OperationContext = {},
	): Promise<{ name: string; where: 'scope' | 'agent' } | null> {
		const name = newName.trim();
		try {
			await this.skillService.assertCanRename(
				row.skill.id,
				{ projectId: row.skill.projectId, agentId: row.skill.agentId },
				row.version.name,
				name,
				ctx,
			);
			return null;
		} catch (error) {
			if (error instanceof SkillNameTakenError) return { name, where: 'scope' };
			// The only other refusal of a rename: an agent that uses the skill has the name.
			if (error instanceof UserError) return { name, where: 'agent' };
			throw error;
		}
	}

	/**
	 * The commits between the content in n8n and the update. Only the revisions when the
	 * source cannot describe them, such as on a rate limit or with a credential that is gone.
	 */
	private async commitOf(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		link: SkillSourceLink,
	): Promise<SkillUpdateCommit | null> {
		const revision = link.pendingRevision;
		if (revision === null) return null;
		return await this.describeCommits(source, client, link.baseRevision, revision, link.remoteRef);
	}

	/** The latest commit that the check read, for the header of "Updates from". */
	private async newestCommitOf(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		links: SkillSourceLink[],
	): Promise<SkillUpdateCommit | null> {
		const newest =
			source.probeCursor ?? links.find((link) => link.pendingRevision)?.pendingRevision;
		const base = links[0]?.baseRevision;
		if (!newest || !base) return null;
		return await this.describeCommits(source, client, base, newest);
	}

	/**
	 * The commits between two revisions, and the latest one that touched the skill when
	 * `ref` is given. Only the revisions when the source cannot describe them, such as while
	 * it rate-limits n8n or with a credential that is gone.
	 */
	private async describeCommits(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		from: string,
		to: string,
		ref?: SkillSourceLink['remoteRef'],
	): Promise<SkillUpdateCommit> {
		const known = { revision: to, baseRevision: from };
		let provenance = null;
		const waiting = (this.retryAt.get(accessKey(source)) ?? 0) > Date.now();
		if (client.provenance && !waiting) {
			const auth = await this.authOf(source, client).catch(() => undefined);
			if (!source.credentialId || auth) {
				provenance = await client.provenance(source.locator, from, to, auth, ref);
			}
		}
		return {
			...known,
			message: provenance?.message ?? null,
			author: provenance?.author ?? null,
			date: provenance?.date ?? null,
			commits: provenance?.commits ?? null,
			webUrl: provenance?.webUrl ?? client.webUrl(source.locator, ref),
		};
	}

	/**
	 * The link and source of a synced skill with an update, for a user who may do `action`.
	 * A skill that the user cannot read answers `skill_deleted`, the same for a hidden and a
	 * deleted skill, so the answer reveals nothing. A skill with no update, such as after a
	 * review by another user or Stop syncing, answers `stale`.
	 */
	private async requirePending(
		user: User,
		skillId: string,
		action: 'view' | 'review',
		tracked?: { action: 'accept' | 'skip' },
	): Promise<{ link: SkillSourceLink; source: SkillSourceConnection; client: SkillSourceClient }> {
		await this.flagGate.assertEnabled(user);
		const fail = async (error: unknown, source?: SkillSourceConnection): Promise<never> => {
			if (tracked && source) {
				await this.reviewTracker(user, source, undefined, tracked.action, false)(error);
			}
			throw error;
		};
		try {
			await this.skillAccess.requireAccess(user, skillId, 'read');
		} catch (error) {
			if (error instanceof NotFoundError) throw skillDeletedError();
			throw error;
		}
		const link = await this.sourceRepository.findLinkBySkillId(skillId);
		const source = link && (await this.sourceRepository.findById(link.sourceId));
		const client = source && this.clients.get(source.type);
		if (!link || !source || !client) throw staleError();
		if (!(await this.skillAccess.canOnSource(user, source, action))) {
			throw new ForbiddenError('You are not allowed to review the updates of this source.');
		}
		if (link.pendingContentHash === null) await fail(staleError(), source);
		return { link, source, client };
	}

	// ---------------------------------------------------------------- check

	/** One check of a source. A check of the same source that runs on this main is joined. */
	private async check(source: SkillSourceConnection, trigger: CheckTrigger): Promise<void> {
		const pending = this.running.get(source.id);
		if (pending) return await pending;
		const run = this.runCheck(source, trigger).finally(() => this.running.delete(source.id));
		this.running.set(source.id, run);
		return await run;
	}

	/**
	 * Probes the source first: an unchanged source costs one request. A changed source has
	 * each synced skill fetched at the new revision and compared with the stored content. A
	 * failure is stored on the source and thrown.
	 */
	private async runCheck(source: SkillSourceConnection, trigger: CheckTrigger): Promise<void> {
		const client = this.clients.get(source.type);
		if (!client) return;
		const access = accessKey(source);
		const checkedAt = new Date();
		// Still waiting after a rate limit: no request, and the wait does not grow.
		if ((this.retryAt.get(access) ?? 0) > checkedAt.getTime()) {
			await this.sourceRepository.recordCheck(source.id, {
				checkedAt,
				errorReason: 'rate_limited',
			});
			throw new SkillSourceReadError(
				'rate_limited',
				'The source limits how often n8n can read it. n8n checks again later.',
			);
		}
		try {
			const auth = await this.authOf(source, client);
			const cursor = client.probe ? await client.probe(source.locator, auth) : undefined;
			if (cursor !== undefined && cursor === source.probeCursor) {
				await this.sourceRepository.recordCheck(source.id, { checkedAt, errorReason: null });
				return;
			}
			const links = await this.sourceRepository.findLinksBySource(source.id);
			const { counts, conflict } = await this.compareAll(source, client, links, auth, cursor);
			// A link that another check changed meanwhile was not written: no cursor, so the next
			// check reads every skill again.
			const next = conflict ? null : cursor;
			await this.sourceRepository.recordCheck(source.id, {
				checkedAt,
				errorReason: null,
				...(next !== undefined ? { probeCursor: { from: source.probeCursor, to: next } } : {}),
			});
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
			if (error instanceof SkillSourceReadError && error.reason === 'rate_limited') {
				const seconds = error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
				this.retryAt.set(
					access,
					Math.max(this.retryAt.get(access) ?? 0, Date.now() + seconds * 1000),
				);
			}
			await this.sourceRepository.recordCheck(source.id, {
				checkedAt,
				errorReason: skillSourceReasonOf(error) ?? 'unexpected',
			});
			throw error;
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
		if (!source.credentialId) return undefined;
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
	 * keeps its version, and the health of missing skills comes later. A SKILL.md that n8n
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
		const { content, hash, rate } = this.candidateOf(fetched, previous);
		const read = link.pendingContentHash;
		if (hash === link.baseContentHash) {
			if (read === null && link.baseRevision === fetched.revision) return undefined;
			return (await this.sourceRepository.moveBase(link.skillId, fetched.revision, read))
				? undefined
				: 'conflict';
		}
		if (hash === read) return undefined;
		if (hash === link.skippedContentHash) {
			// The source went back to the content that the user skipped: a newer update is gone.
			if (read === null) return undefined;
			return (await this.sourceRepository.moveBase(link.skillId, link.baseRevision, read))
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
			read,
		);
		if (!stored) return 'conflict';
		if (scan.verdict !== 'pass') {
			// No user: the event reaches BigQuery only, as for every background check.
			await this.skillsTelemetry.flaggedSkill({
				provider,
				stage: 'update',
				verdict: scan.verdict,
				rule_codes: [
					...new Set(
						scan.findings
							.filter((finding) => finding.severity !== 'info')
							.map((finding) => finding.rule),
					),
				],
			});
		}
		return scan.verdict;
	}

	/**
	 * The content and hash that a check compares, and how the security check rates it. A
	 * SKILL.md that n8n cannot parse has no content: its parse error stands for it, so the same
	 * broken file is reported once, and the check blocks it, as at import.
	 */
	private candidateOf(
		fetched: Fetched,
		previous: ReturnType<typeof rowContent>,
	): { content: SkillContent | null; hash: string; rate: () => SkillScanResult } {
		if ('unreadable' in fetched) {
			const { unreadable } = fetched;
			return {
				content: null,
				hash: createHash('sha256').update(`unreadable\n${unreadable.message}`).digest('hex'),
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
		action: 'stopSyncing' | 'checkNow',
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
}

/** A credential, or the public access of a source type, as a rate limit applies to it. */
function accessKey(source: SkillSourceConnection): string {
	return source.credentialId ? `credential:${source.credentialId}` : `public:${source.type}`;
}

/** The security check of the pending update, as the check stored it. */
function scanOf(link: SkillSourceLink): SkillScanResult | null {
	const scan = link.pendingScan;
	const verdict = scan?.verdict;
	if (verdict !== 'pass' && verdict !== 'needs_review' && verdict !== 'blocked') return null;
	const findings = Array.isArray(scan?.findings) ? scan.findings.filter(isFinding) : [];
	return { verdict, findings };
}

function isFinding(value: unknown): value is SkillScanFinding {
	return (
		isRecord(value) &&
		typeof value.rule === 'string' &&
		typeof value.severity === 'string' &&
		typeof value.detail === 'string'
	);
}

function staleError(): SkillSourceRequestError {
	return new SkillSourceRequestError(
		'stale',
		'This update changed since you opened it. Review the latest change.',
	);
}

function skillDeletedError(): SkillSourceRequestError {
	return new SkillSourceRequestError('skill_deleted', 'This skill was deleted.');
}

function nameClashError(name: string): SkillSourceRequestError {
	return new SkillSourceRequestError(
		'name_clash',
		`The source renamed this skill to ${name}, and that name is taken.`,
	);
}

/** The first item for each key, in order. */
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
	const seen = new Set<string>();
	return items.filter((item) => !seen.has(key(item)) && seen.add(key(item)) !== undefined);
}
