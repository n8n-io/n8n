import { Get, RestController, GlobalScope, Query } from '@n8n/decorators';

import { BreakingChangeService } from './breaking-changes.service';

@RestController('/breaking-changes')
export class BreakingChangesController {
	constructor(private readonly service: BreakingChangeService) {}

	/**
	 * Get all registered breaking change rules
	 */
	@Get('/')
	@GlobalScope('breakingChanges:list')
	async listRules(@Query query: { version?: 'v2' }) {
		return await this.service.detect(query.version ?? 'v2');
	}
}
