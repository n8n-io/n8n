import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { NodeTypes } from '@/node-types';

import { EventRelay } from './event-relay';
import { Telemetry } from '../../telemetry';

@Service()
export class TelemetryEventRelay extends EventRelay {
	constructor(
		readonly eventService: EventService,
		// Keep these parameters to maintain compatibility with the DI system
		private readonly _: Telemetry,
		private readonly __: License,
		private readonly ___: GlobalConfig,
		private readonly ____: InstanceSettings,
		private readonly _____: NodeTypes,
	) {
		super(eventService);
	}

	async init() {
		return;
	}

	setupListeners() {
		// No listeners will be set up - telemetry is disabled
	}
}
