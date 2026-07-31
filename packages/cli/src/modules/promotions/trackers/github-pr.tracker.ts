import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { OwnershipService } from '@/services/ownership.service';

import { GithubApi } from '../models/github-api';
import { PromotionModelRegistry } from '../promotion-model-registry';
import { PromotionSignalsService } from '../promotion-signals.service';
import type { Promotion } from '../promotion.entity';
import { PromotionRepository } from '../promotion.repository';
import { PromotionsConfig } from '../promotions.config';

export const GITHUB_PR_SIGNAL = 'github-pr';

const GITHUB_REVIEW_MODEL = 'github-review';
const TERMINAL_STATES = ['promoted', 'closed'];

/**
 * Pull-based GitHub watcher (webhooks would require a publicly reachable
 * instance) doing double duty on each sweep:
 *
 * - Discovery: an open `promote/*` PR targeting this instance's environment
 *   branch with no local promotion yet means another instance submitted a
 *   promotion towards us — create the destination-side promotion for it.
 * - Signals: for every non-terminal github-review promotion, snapshot the PR
 *   (state/draft/merged/approval) and dispatch a github-pr signal when it
 *   changed, so the model reconciles without anyone clicking sync.
 *
 * Enabled only when PromotionsConfig is fully set and the poll interval > 0.
 */
@Service()
export class GithubPrTracker {
	constructor(
		private readonly logger: Logger,
		private readonly config: PromotionsConfig,
		private readonly registry: PromotionModelRegistry,
		private readonly repository: PromotionRepository,
		private readonly signals: PromotionSignalsService,
		private readonly ownershipService: OwnershipService,
	) {}

	init() {
		const { githubToken, githubRepo, githubBranch, githubPollInterval } = this.config;
		if (!githubToken || !githubRepo || !githubBranch || githubPollInterval <= 0) return;

		const run = () => {
			void this.poll().catch((error) =>
				this.logger.warn('github-review tracker poll failed', { error }),
			);
		};
		setInterval(run, githubPollInterval * 1000).unref();
		run();
	}

	async poll() {
		const api = this.api();
		// POC: scan-and-filter; a real implementation would index tracked refs
		const promotions = (await this.repository.findAllNewestFirst()).filter(
			(promotion) => promotion.model === GITHUB_REVIEW_MODEL,
		);
		await this.discover(api, promotions);
		await this.dispatchUpdates(api, promotions);
	}

	private async discover(api: GithubApi, promotions: Promotion[]) {
		const known = new Set(
			promotions
				.map((promotion) => promotion.metadata.prNumber)
				.filter((prNumber) => typeof prNumber === 'number'),
		);
		const prs = await api.listOpenPullRequests(this.config.githubBranch);
		for (const pr of prs) {
			if (!pr.headBranch.startsWith('promote/') || known.has(pr.prNumber)) continue;

			// Tracker-created promotions act as the instance owner
			const user = await this.ownershipService.getInstanceOwner();
			const created = await this.registry.get(GITHUB_REVIEW_MODEL).submit(
				{
					model: GITHUB_REVIEW_MODEL,
					options: { role: 'destination', prNumber: pr.prNumber },
				},
				{ user },
			);
			this.logger.info(
				`github-review: discovered PR #${pr.prNumber}, created destination promotion "${created.id}"`,
			);
		}
	}

	private async dispatchUpdates(api: GithubApi, promotions: Promotion[]) {
		const active = promotions.filter(
			(promotion) =>
				typeof promotion.metadata.prNumber === 'number' &&
				!TERMINAL_STATES.includes(promotion.state),
		);
		for (const promotion of active) {
			const prNumber = promotion.metadata.prNumber;
			if (typeof prNumber !== 'number') continue;

			const pr = await api.getPullRequest(prNumber);
			const destinationApproved = await api.hasDestinationApproval(prNumber);
			const payload = {
				state: pr.state,
				draft: pr.draft,
				merged: pr.merged,
				destinationApproved,
			};

			const signals = promotion.metadata.signals as Record<string, unknown> | undefined;
			if (JSON.stringify(signals?.[GITHUB_PR_SIGNAL]) === JSON.stringify(payload)) continue;

			await this.signals.dispatch(promotion.id, { name: GITHUB_PR_SIGNAL, payload });
		}
	}

	private api(): GithubApi {
		const [owner, repo] = this.config.githubRepo.split('/');
		return new GithubApi({ owner, repo, token: this.config.githubToken });
	}
}
