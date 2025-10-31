import { Get, RestController, GlobalScope, Query, Post } from '@n8n/decorators';

import { BreakingChangeService } from './breaking-changes.service';
import { BreakingChangeVersion } from './types';

@RestController('/breaking-changes')
export class BreakingChangesController {
	constructor(private readonly service: BreakingChangeService) {}

	/**
	 * Get all registered breaking change rules
	 */
	@Get('/')
	@GlobalScope('breakingChanges:list')
	async listRules(@Query query: { version?: BreakingChangeVersion }) {
		return await this.service.getDetectionResults(query.version ?? 'v2');
	}

	@Post('/refresh')
	@GlobalScope('breakingChanges:list')
	async refreshCache(@Query query: { version?: BreakingChangeVersion }) {
		return await this.service.refreshDetectionResults(query.version ?? 'v2');
	}
}
