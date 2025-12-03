import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Workflow } from 'n8n-workflow';

import { DataTableEventMap } from '@/events/maps/data-table.event-map';
import { EventService } from '@/events/event.service';

// type TriggersByEventByWorkflow = Map<Workflow['id'], Map<CronKey, Cron>>;

type EventListener = {
	workflowId: string;
	onEvent: (payload: DataTableEventMap[keyof DataTableEventMap]) => void;
};

const supportedEvents = ['data-table-rows-added'] satisfies Array<keyof DataTableEventMap>;

@Service()
export class EventTriggerManager {
	// /** Crons currently active instance-wide, to display in logs. */
	// private get loggableCrons() {
	// 	const loggableCrons: Record<string, string[]> = {};

	// 	for (const [workflowId, crons] of this.cronsByWorkflow) {
	// 		loggableCrons[`workflowId-${workflowId}`] = Array.from(crons.values()).map(
	// 			({ summary }) => summary,
	// 		);
	// 	}

	// 	return loggableCrons;
	// }

	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
	) {
		// this.logger = this.logger.scoped('eventTriggerManager');
		// this.logInterval = setInterval(() => {
		// 	if (Object.keys(this.loggableCrons).length === 0) return;
		// 	this.logger.debug('Currently active crons', { active: this.loggableCrons });
		// }, activeInterval * Time.minutes.toMilliseconds);

		for (const e of supportedEvents) {
			eventService.on(e, (x) => {
				const workflows = this.eventListeners.get(e);
				for (const ctx of workflows?.values() ?? []) {
					ctx.onEvent(x);
				}
			});
		}
	}

	eventListeners: Map<keyof DataTableEventMap, Map<Workflow['id'], EventListener>> = new Map();

	registerTrigger<K extends keyof DataTableEventMap>(
		workflowId: string,
		event: K,
		onEvent: (payload: DataTableEventMap[K]) => void,
	) {
		let wfMap = this.eventListeners.get(event);
		if (!wfMap) {
			wfMap = new Map();
			this.eventListeners.set(event, wfMap);
		}

		wfMap.set(workflowId, { workflowId, onEvent });
	}

	deregisterTriggers(workflowId: string) {
		for (const wfMap of this.eventListeners.values()) {
			wfMap.delete(workflowId);
		}
	}
}
