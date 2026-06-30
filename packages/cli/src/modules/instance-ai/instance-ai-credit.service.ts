import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { BuilderUsageItem, TraceStatus } from '@n8n/instance-ai';
import { InstanceSettings } from 'n8n-core';
import { sleep, UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { Push } from '@/push';
import { AiService } from '@/services/ai.service';
import { Telemetry } from '@/telemetry';

import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Owns Instance AI credit accounting: claims decimal, token-based credits per
 * finished run segment, dedupes replays, retries the authoritative proxy call,
 * accumulates the best-effort per-thread display total, and emits the credit
 * push update plus billing/quota telemetry.
 *
 * The ai-assistant-service is the billing authority and dedupes replays
 * atomically; the in-memory guard here only suppresses duplicate near-in-time
 * claims within this process. `thread.metadata.creditsUsed` is a best-effort
 * *display* total only — the authoritative ledger is the service-side count.
 */
@Service()
export class InstanceAiCreditService {
	private readonly logger: Logger;

	/**
	 * In-memory guard to prevent double-claiming the same run segment within this
	 * process. Capped FIFO (see {@link CLAIM_DEDUPE_CACHE_SIZE}) so it can't grow
	 * unbounded — billing correctness is owned by the service, which dedupes
	 * replays authoritatively; this only suppresses duplicate near-in-time claims.
	 */
	private readonly claimedRunIds = new Set<string>();

	/** Max retained run-segment ids in {@link claimedRunIds}; oldest evicted first. */
	static readonly CLAIM_DEDUPE_CACHE_SIZE = 1000;

	/** Max attempts for the idempotent token-usage claim before giving up. */
	private static readonly CLAIM_MAX_ATTEMPTS = 3;

	constructor(
		logger: Logger,
		private readonly aiService: AiService,
		private readonly telemetry: Telemetry,
		private readonly instanceSettings: InstanceSettings,
		private readonly push: Push,
		private readonly threadRepo: InstanceAiThreadRepository,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * Claim decimal, token-based credits for one finished run segment.
	 *
	 * Billed for every terminal outcome (completed / cancelled / errored) so stopped
	 * and errored runs still count, deduped per `dedupeId` (the run segment's
	 * `agentRunId`, or the run id when none is available). The service is the billing
	 * authority and dedupes replays atomically; the in-memory set is a fast intra-process
	 * guard, claimed before the async call and released on failure so a retry can re-claim.
	 *
	 * `thread.metadata.creditsUsed` is a best-effort *display* total only — the
	 * authoritative ledger is the service-side claimedCount.
	 */
	async claimRunUsage(
		user: User,
		threadId: string,
		dedupeId: string,
		usage: BuilderUsageItem[],
		status: TraceStatus,
	): Promise<number | undefined> {
		if (!this.aiService.isProxyEnabled()) {
			this.logger.debug('Skipping Instance AI credit claim: proxy disabled', {
				threadId,
				dedupeId,
			});
			return;
		}
		if (usage.length === 0) {
			this.logger.debug('Skipping Instance AI credit claim: no usage', { threadId, dedupeId });
			return;
		}
		if (this.claimedRunIds.has(dedupeId)) {
			this.logger.debug('Skipping Instance AI credit claim: already claimed', {
				threadId,
				dedupeId,
			});
			return;
		}

		this.rememberClaimedRunId(dedupeId); // claim before async work
		this.logger.debug('Claiming Instance AI credits', { threadId, dedupeId, status, usage });

		// The authoritative billing call: retried because it is idempotent (the
		// service dedupes by `dedupeId`). A genuine failure releases the lock so a
		// later run can re-attempt, and reports the failure.
		let result: Awaited<ReturnType<typeof this.claimTokens>>;
		try {
			result = await this.claimTokensWithRetry(user, dedupeId, usage);
		} catch (error) {
			this.claimedRunIds.delete(dedupeId); // allow retry on failure
			this.telemetry.track('Builder credits claimed', {
				instance_id: this.instanceSettings.instanceId,
				user_id: user.id,
				thread_id: threadId,
				agent_run_id: dedupeId,
				status,
				success: false,
				error_message: getErrorMessage(error),
				attempted_usage: usage,
			});
			this.logger.warn('Failed to claim Instance AI credits', {
				error: getErrorMessage(error),
				threadId,
				dedupeId,
			});
			return;
		}

		if (typeof result?.delta !== 'number') {
			this.logger.debug('Instance AI credit claim returned no numeric delta', {
				threadId,
				dedupeId,
				result,
			});
			return;
		}
		const { delta, creditsClaimed, creditsQuota } = result;

		// The proxy is enabled on this path, so a real, non-negative quota is always
		// expected. A negative quota (e.g. an unlimited sentinel) is a contract
		// violation from the billing service — surface it rather than tolerate it.
		if (creditsQuota < 0) {
			throw new UnexpectedError('Instance AI credit claim returned a negative quota', {
				extra: { threadId, dedupeId, creditsQuota },
			});
		}

		// From here on the claim has already succeeded. The remaining work is
		// best-effort display/telemetry: it must never release the lock or report
		// a billing failure. `push`/`telemetry` are fire-and-forget; the thread
		// total write is the only awaited risk, so it is isolated in its helper.
		const totalCreditsUsed = await this.accumulateThreadCredits(threadId, delta);

		this.logger.debug('Claimed Instance AI credits', {
			threadId,
			dedupeId,
			status,
			delta,
			creditsClaimed,
			creditsQuota,
			totalCreditsUsed,
		});

		this.push.sendToUsers(
			{
				type: 'updateInstanceAiCredits',
				data: {
					creditsQuota,
					creditsClaimed,
					// Only attach the per-thread total when we actually computed one.
					...(totalCreditsUsed !== undefined
						? { creditsPerThread: { threadId, totalCreditsUsed } }
						: {}),
				},
			},
			[user.id],
		);

		this.telemetry.track('Builder credits claimed', {
			instance_id: this.instanceSettings.instanceId,
			user_id: user.id,
			thread_id: threadId,
			agent_run_id: dedupeId,
			status,
			success: true,
			credits_used: delta,
			credits_claimed_total: creditsClaimed,
			credits_quota: creditsQuota,
		});

		// Fire the exhaustion event once, at the moment usage crosses quota. The
		// crossing message still finishes; the next proxy-token request is what 403s.
		if (delta > 0) {
			const wasUnder = creditsClaimed - delta < creditsQuota;
			const nowExhausted = creditsClaimed >= creditsQuota;
			if (wasUnder && nowExhausted) {
				this.telemetry.track('User exhausted assistant quota', {
					instance_id: this.instanceSettings.instanceId,
					user_id: user.id,
				});
			}
		}

		return delta;
	}

	/**
	 * Fetch a fresh proxy auth token and return the client + Authorization headers.
	 * Each caller gets a unique token (separate nanoid) for audit tracking.
	 */
	private async getProxyAuth(user: User) {
		const client = await this.aiService.getClient();
		const token = await client.getBuilderApiProxyToken(
			{ id: user.id },
			{ userMessageId: nanoid() },
		);
		return {
			client,
			headers: { Authorization: `${token.tokenType} ${token.accessToken}` },
		};
	}

	/** Single authoritative claim call against the proxy. */
	private async claimTokens(user: User, dedupeId: string, usage: BuilderUsageItem[]) {
		const { client, headers } = await this.getProxyAuth(user);
		return await client.markBuilderTokenUsage({ id: user.id }, headers, { dedupeId, usage });
	}

	/**
	 * Claim with bounded retry and exponential backoff. Safe to retry because the
	 * service dedupes replays by `dedupeId`. Rethrows the last error if every
	 * attempt fails.
	 */
	private async claimTokensWithRetry(user: User, dedupeId: string, usage: BuilderUsageItem[]) {
		let lastError: unknown;
		for (let attempt = 1; attempt <= InstanceAiCreditService.CLAIM_MAX_ATTEMPTS; attempt++) {
			try {
				return await this.claimTokens(user, dedupeId, usage);
			} catch (error) {
				lastError = error;
				this.logger.debug('Instance AI credit claim attempt failed', {
					dedupeId,
					attempt,
					maxAttempts: InstanceAiCreditService.CLAIM_MAX_ATTEMPTS,
					error: getErrorMessage(error),
				});
				if (attempt < InstanceAiCreditService.CLAIM_MAX_ATTEMPTS) {
					await sleep(2 ** (attempt - 1) * 200); // 200ms, then 400ms
				}
			}
		}
		throw lastError;
	}

	/**
	 * Update the best-effort per-thread display total. A DB failure here must not
	 * fail the (already-successful) claim, so it is isolated and only logged;
	 * returns undefined when the total can't be read or written.
	 */
	private async accumulateThreadCredits(
		threadId: string,
		delta: number,
	): Promise<number | undefined> {
		try {
			const thread = await this.threadRepo.findOneBy({ id: threadId });
			if (!thread) return undefined;
			const prev =
				typeof thread.metadata?.creditsUsed === 'number' ? thread.metadata.creditsUsed : 0;
			const creditsUsed = prev + delta;
			thread.metadata = { ...thread.metadata, creditsUsed };
			await this.threadRepo.save(thread);
			return creditsUsed;
		} catch (error) {
			this.logger.warn('Failed to persist Instance AI thread credit total', {
				error: getErrorMessage(error),
				threadId,
			});
			return undefined;
		}
	}

	/**
	 * Record a claimed run id, evicting the oldest once the cap is reached. A Set
	 * keeps insertion order, so the first value is the oldest entry.
	 */
	private rememberClaimedRunId(dedupeId: string): void {
		this.claimedRunIds.add(dedupeId);
		if (this.claimedRunIds.size > InstanceAiCreditService.CLAIM_DEDUPE_CACHE_SIZE) {
			const oldest = this.claimedRunIds.values().next().value;
			if (oldest !== undefined) this.claimedRunIds.delete(oldest);
		}
	}
}
