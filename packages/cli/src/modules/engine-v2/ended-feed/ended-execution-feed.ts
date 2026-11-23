import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ListEndedExecutionsResponse } from '@n8n/engine';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { EventService } from '@n8n/backend-services';

import { EngineDataPlaneClient } from '../engine-data-plane-client';
import { toWorkflowPostExecute } from './to-workflow-post-execute';

type Cursor = ListEndedExecutionsResponse['cursor'];

const CURSOR_KEY = 'engineV2.endedExecutionFeed.cursor';
const PAGE_SIZE = 200;

/**
 * Pulls ended v2 executions from the data plane and emits the v1 end event for
 * each. The cursor is stored only after a page is emitted, so a crash repeats
 * a page and never skips one: delivery is at-least-once.
 */
@Service()
export class EngineV2EndedExecutionFeed {
	private timer: NodeJS.Timeout | undefined;

	private polling: Promise<void> | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly client: EngineDataPlaneClient,
		private readonly settings: SettingsRepository,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	start(intervalMs = 1_000) {
		this.timer = setInterval(() => {
			// One reader in a multi-main setup, so a page is not emitted once by each main.
			if (!this.instanceSettings.isLeader || this.polling) return;
			this.polling = this.poll()
				.catch((error: unknown) => this.logger.warn('Ended execution feed failed', { error }))
				.finally(() => (this.polling = undefined));
		}, intervalMs);
	}

	async stop() {
		clearInterval(this.timer);
		await this.polling;
	}

	async poll(): Promise<void> {
		let cursor = await this.readCursor();
		for (;;) {
			const page = await this.client.listEndedExecutions({
				after: cursor ?? undefined,
				limit: PAGE_SIZE,
			});
			for (const item of page.items) {
				this.eventService.emit('workflow-post-execute', toWorkflowPostExecute(item));
			}
			if (page.items.length === 0) return;
			cursor = page.cursor;
			await this.settings.upsertByKey(CURSOR_KEY, JSON.stringify(cursor), false, {});
			if (page.items.length < PAGE_SIZE) return;
		}
	}

	private async readCursor(): Promise<Cursor> {
		const row = await this.settings.findByKey(CURSOR_KEY);
		return row ? jsonParse<Cursor>(row.value) : null;
	}
}
