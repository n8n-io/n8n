import type { SkillScanResult, SkillSourceCheckResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository, type User } from '@n8n/db';
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
import { SkillSourceReadError } from '../errors/skill-source-read.error';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import type {
	FetchedSkill,
	SkillSourceAuth,
	SkillSourceClient,
} from '../sources/skill-source-client';
import { rowContent, storedContentOf } from '../utils/skill-content';
import { skillContentHash } from '../utils/skill-content-hash';
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

		const { lastCheckedAt } = source;
		if (lastCheckedAt && Date.now() - lastCheckedAt.getTime() < CHECK_NOW_INTERVAL_MS) {
			const updatesFound = await this.sourceRepository.countPendingUpdates(source.id);
			await track({ updatesFound, throttled: true });
			return { label, updatesFound, throttled: true, lastCheckedAt: lastCheckedAt.toISOString() };
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
			if (!creator || !(await this.flagGate.isEnabled(creator))) continue;
			try {
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
		try {
			if ((this.retryAt.get(access) ?? 0) > checkedAt.getTime()) {
				throw new SkillSourceReadError(
					'rate_limited',
					'The source limits how often n8n can read it. n8n checks again later.',
				);
			}
			const auth = await this.authOf(source, client);
			const cursor = client.probe ? await client.probe(source.locator, auth) : undefined;
			if (cursor !== undefined && cursor === source.probeCursor) {
				await this.sourceRepository.recordCheck(source.id, { checkedAt, errorReason: null });
				return;
			}
			const links = await this.sourceRepository.findLinksBySource(source.id);
			const counts = await this.compareAll(source, client, links, auth, cursor);
			await this.sourceRepository.recordCheck(source.id, {
				checkedAt,
				errorReason: null,
				...(cursor !== undefined ? { probeCursor: cursor } : {}),
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

	/** Compares each synced skill with the source, and counts the new updates by verdict. */
	private async compareAll(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		links: SkillSourceLink[],
		auth: SkillSourceAuth | undefined,
		revision: string | undefined,
	): Promise<VerdictCounts> {
		const counts: VerdictCounts = { pass: 0, needs_review: 0, blocked: 0 };
		if (links.length === 0) return counts;
		const latest = await this.skillRepository.findLatestSaved(links.map((link) => link.skillId));
		for (let start = 0; start < links.length; start += FETCH_CONCURRENCY) {
			const batch = links.slice(start, start + FETCH_CONCURRENCY);
			const verdicts = await Promise.all(
				batch.map(async (link) => {
					const fetched = await this.fetch(source, client, link, auth, revision);
					const row = latest.get(link.skillId);
					if (!fetched || !row) return undefined;
					return await this.compare(source.type, link, fetched, rowContent(row));
				}),
			);
			for (const verdict of verdicts) if (verdict) counts[verdict] += 1;
		}
		return counts;
	}

	/**
	 * The skill at the revision. Undefined when the skill is gone from the source or n8n
	 * cannot read it: the skill keeps its version, and the health of a source and of its
	 * missing skills comes later. Any other failure fails the whole check.
	 */
	private async fetch(
		source: SkillSourceConnection,
		client: SkillSourceClient,
		link: SkillSourceLink,
		auth: SkillSourceAuth | undefined,
		revision: string | undefined,
	): Promise<FetchedSkill | undefined> {
		try {
			return await client.fetchLatest(source.locator, link.remoteRef, auth, revision);
		} catch (error) {
			const reason = skillSourceReasonOf(error);
			if (reason === 'not_found' || reason === 'parse_error') return undefined;
			throw error;
		}
	}

	/**
	 * Stores what changed for one skill, and answers the verdict of a new update:
	 * - content of the latest version: the base moves, and a pending update is dropped;
	 * - content of the pending update, or of an update the user skipped: nothing changes;
	 * - other content: the security check rates it against the latest version, and it waits
	 *   for review in place of an older update.
	 */
	private async compare(
		provider: SkillSourceType,
		link: SkillSourceLink,
		fetched: FetchedSkill,
		previous: ReturnType<typeof rowContent>,
	): Promise<SkillScanResult['verdict'] | undefined> {
		const content = storedContentOf(fetched.content);
		const hash = skillContentHash(content);
		if (hash === link.baseContentHash) {
			if (link.pendingContentHash !== null || link.baseRevision !== fetched.revision) {
				await this.sourceRepository.moveBase(link.skillId, fetched.revision);
			}
			return undefined;
		}
		if (hash === link.pendingContentHash || hash === link.skippedContentHash) return undefined;
		const scan = this.scanner.scan({ ...fetched, content }, previous);
		const stored = await this.sourceRepository.storePending(link.skillId, {
			content,
			contentHash: hash,
			scan,
			revision: fetched.revision,
			state: scan.verdict === 'blocked' ? 'update_blocked' : 'update_available',
		});
		if (!stored) return undefined;
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
