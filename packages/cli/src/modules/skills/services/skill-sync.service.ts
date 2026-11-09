import type { SkillScanResult, SkillSourceCheckResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { createHash } from 'node:crypto';
import { GLOBAL_OWNER_ROLE, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';

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
import { rowContent, storedContentOf } from '../utils/skill-content';
import { skillContentHash, type SkillContent } from '../utils/skill-content-hash';
import { SkillAccessService } from './skill-access.service';
import { SkillSecurityScanner } from './skill-security-scanner.service';
import { SkillSourceCredentialsProxy } from './skill-source-credentials-proxy.service';
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
		// Still waiting after a rate limit: no request, and the wait does not grow. The check time
		// stays, because n8n did not read the source, so the task still checks it first next time.
		if ((this.retryAt.get(access) ?? 0) > checkedAt.getTime()) {
			await this.sourceRepository.recordDelayed(source.id);
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

	private async findInstanceOwner(): Promise<User | null> {
		return await this.userRepository.findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});
	}
}

/** A credential, or the public access of a source type, as a rate limit applies to it. */
function accessKey(source: SkillSourceConnection): string {
	return source.credentialId ? `credential:${source.credentialId}` : `public:${source.type}`;
}
