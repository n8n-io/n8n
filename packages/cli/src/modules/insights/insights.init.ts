import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import './insights.controller';
import { InsightsService } from './insights.service';

@Service()
export class InsightsInit {
	constructor(
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
	) {
		if (this.instanceSettings.isLeader) this.insightsService.startTimers();
	}
}
