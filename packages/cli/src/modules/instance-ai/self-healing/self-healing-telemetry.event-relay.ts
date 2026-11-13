import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { EventRelay } from '@/events/relays/event-relay';

import { SelfHealingResultService } from './self-healing-result.service';

/** Reports result changes that the shared workflow suggestion code announces. */
@Service()
export class SelfHealingTelemetryEventRelay extends EventRelay {
	constructor(
		readonly eventService: EventService,
		private readonly results: SelfHealingResultService,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'self-healing-result-outdated': async ({ selfHealingResultId }) =>
				await this.results.trackOutdated(selfHealingResultId),
		});
	}
}
