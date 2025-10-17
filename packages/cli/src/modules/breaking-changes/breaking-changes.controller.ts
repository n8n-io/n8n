import { Get, RestController, GlobalScope, Query } from '@n8n/decorators';

import { BreakingChangeService } from './breaking-changes.service';
import { BreakingChangeVersion } from './types';

@RestController('/breaking-changes')
export class BreakingChangesController {
	constructor(private readonly service: BreakingChangeService) {
		this.service.registerRules();
	}

	/**
	 * Get all registered breaking change rules
	 */
	@Get('/')
	@GlobalScope('breakingChanges:list')
	async listRules(@Query query: { version?: BreakingChangeVersion }) {
		return await this.service.detect(query.version ?? 'v2');
	}
}
