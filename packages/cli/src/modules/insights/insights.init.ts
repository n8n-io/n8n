import { Service } from '@n8n/di';

import './insights.controller';
import { InsightsService } from './insights.service';

@Service()
export class InsightsInit {
	constructor(private readonly insightsService: InsightsService) {
		this.insightsService.startTimers();
	}
}
