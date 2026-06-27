import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { GitHubClient } from './github/github-client';
import { InstancePullService } from './instance-pull.service';

const POLL_INTERVAL_MS = 10_000;

/**
 * prd-only poll loop. Each cycle (single in-flight) lists open instance-pull PRs,
 * validates them, upserts the bot comment + commit status, and publishes any newly
 * merged PRs. Loop body is filled in by a sibling slice; this provides the
 * start/stop lifecycle the module wires into init()/shutdown().
 */
@Service()
export class InstancePullPoll {
	private timer: NodeJS.Timeout | undefined;

	private running = false;

	constructor(
		private readonly service: InstancePullService,
		private readonly gitHubClient: GitHubClient,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-pull');
	}

	start() {
		if (this.timer) return;
		this.timer = setInterval(() => {
			this.tick().catch(() => {});
		}, POLL_INTERVAL_MS);
		this.logger.debug('Started instance-pull poll loop');
	}

	stop() {
		if (!this.timer) return;
		clearInterval(this.timer);
		this.timer = undefined;
		this.logger.debug('Stopped instance-pull poll loop');
	}

	/**
	 * Single in-flight cycle:
	 * 1. Validate every open instance-pull PR (plan-only) and upsert its rolling
	 *    bot comment + commit status (red if blocked, green if clean).
	 * 2. Publish any merged PR not yet published this process.
	 */
	private async tick() {
		if (this.running) return;
		this.running = true;
		try {
			await this.validateOpenPullRequests();
			await this.publishMergedPullRequests();
		} catch (error) {
			this.logger.warn('instance-pull poll cycle failed', { error });
		} finally {
			this.running = false;
		}
	}

	private async validateOpenPullRequests() {
		const open = await this.service.listInstancePullRequests('open');
		for (const pr of open) {
			try {
				const issues = await this.service.validatePR(pr.prNumber);
				await this.gitHubClient.upsertComment(
					pr.prNumber,
					this.service.renderComment(issues, pr.prNumber),
				);
				await this.gitHubClient.setStatus(
					pr.head.sha,
					issues.length === 0 ? 'success' : 'failure',
					issues.length === 0
						? 'Ready to publish'
						: `${issues.length} requirement(s) missing on target`,
				);
			} catch (error) {
				this.logger.warn(`[instance-pull] failed to validate PR #${pr.prNumber}`, { error });
			}
		}
	}

	private async publishMergedPullRequests() {
		const closed = await this.service.listInstancePullRequests('closed');
		for (const pr of closed) {
			if (!pr.merged || this.service.hasPublished(pr.prNumber)) continue;
			try {
				await this.service.publishMerged(pr.prNumber);
				this.service.markPublished(pr.prNumber);
				this.logger.info(`[instance-pull] published merged PR #${pr.prNumber}`);
			} catch (error) {
				this.logger.warn(`[instance-pull] failed to publish merged PR #${pr.prNumber}`, { error });
			}
		}
	}
}
