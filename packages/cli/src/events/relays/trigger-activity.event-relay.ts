import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { EventRelay } from '@/events/relays/event-relay';
import { Push } from '@/push';

/**
 * Broadcasts in-memory trigger activity (schedules, pollers) so the triggers
 * settings view can highlight a workflow's triggers when they fire. Webhook
 * activity is broadcast with node-level detail from `LiveWebhooks` instead.
 */
@Service()
export class TriggerActivityEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly push: Push,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'workflow-pre-execute': (event) => this.onPreExecute(event),
		});
	}

	private onPreExecute({ data, mode }: RelayEventMap['workflow-pre-execute']) {
		// `trigger` = schedules/pollers, `integrated` = sub-workflow calls
		if (mode !== 'trigger' && mode !== 'integrated') return;

		const workflowId = 'workflowData' in data ? data.workflowData.id : data.id;
		if (!workflowId) return;

		this.push.broadcast({ type: 'triggerFired', data: { workflowId, mode } });
	}
}
