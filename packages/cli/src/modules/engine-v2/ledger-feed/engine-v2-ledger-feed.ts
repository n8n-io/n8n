import { Logger } from '@n8n/backend-common';
import { ExecutionLedger } from '@n8n/backend-services';
import { type OperationContext, SettingsRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ListEndedExecutionsResponse, ListStartedExecutionsResponse } from '@n8n/engine';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { EngineDataPlaneClient } from '../engine-data-plane-client';
import { toEndedFacts, toStartedFacts } from './to-ledger-facts';

const STARTED_CURSOR_KEY = 'engineV2.ledgerFeed.startedCursor';
const ENDED_CURSOR_KEY = 'engineV2.ledgerFeed.endedCursor';
const PAGE_SIZE = 200;

type Page = { items: unknown[]; cursor: unknown };

/**
 * Writes the execution ledger rows of v2 runs from the data plane feeds: a `started`
 * row for each run that the data plane started by itself, and an `ended` row for each
 * ended run. The rows and the cursor commit in one transaction, so a crash repeats no
 * row and skips no row.
 */
@Service()
export class EngineV2LedgerFeed {
	private timer: NodeJS.Timeout | undefined;

	private polling: Promise<void> | undefined;

	/** Only for the spike proof. Production keeps the default of the data plane. */
	settleMs: number | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly client: EngineDataPlaneClient,
		private readonly settings: SettingsRepository,
		private readonly ledger: ExecutionLedger,
		private readonly transactionRunner: TransactionRunner,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	start(intervalMs = 1_000) {
		this.timer = setInterval(() => {
			if (!this.instanceSettings.isLeader || this.polling) return;
			this.polling = this.poll()
				.catch((error: unknown) => this.logger.warn('Ledger feed failed', { error }))
				.finally(() => (this.polling = undefined));
		}, intervalMs);
	}

	async stop() {
		clearInterval(this.timer);
		await this.polling;
	}

	async poll(): Promise<void> {
		await this.drain<ListStartedExecutionsResponse>(
			STARTED_CURSOR_KEY,
			async (after) =>
				await this.client.listStartedExecutions({
					after,
					limit: PAGE_SIZE,
					settleMs: this.settleMs,
				}),
			async (item, ctx) => await this.ledger.recordStarted(toStartedFacts(item), ctx),
		);
		await this.drain<ListEndedExecutionsResponse>(
			ENDED_CURSOR_KEY,
			async (after) =>
				await this.client.listEndedExecutions({
					after,
					limit: PAGE_SIZE,
					settleMs: this.settleMs,
				}),
			async (item, ctx) => {
				const facts = toEndedFacts(item);
				if (facts) await this.ledger.recordEndedInTransaction(facts, ctx);
			},
		);
	}

	private async drain<P extends Page>(
		key: string,
		list: (after: NonNullable<P['cursor']> | undefined) => Promise<P>,
		write: (item: P['items'][number], ctx: OperationContext) => Promise<void>,
	): Promise<void> {
		for (;;) {
			const stored = await this.settings.findByKey(key);
			const page = await list(
				stored ? jsonParse<NonNullable<P['cursor']>>(stored.value) : undefined,
			);
			if (page.items.length === 0) return;

			await this.transactionRunner.run({}, async (ctx) => {
				for (const item of page.items) await write(item, ctx);
				await this.settings.upsertByKey(key, JSON.stringify(page.cursor), false, ctx);
			});
			if (page.items.length < PAGE_SIZE) return;
		}
	}
}
