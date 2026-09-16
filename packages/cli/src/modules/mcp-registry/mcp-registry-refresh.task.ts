import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { McpRegistryService } from './registry/mcp-registry.service';

const REFRESH_INTERVAL_HOURS = 8;

/**
 * Refreshes the MCP server registry from the remote API, so newly published
 * or deprecated servers reach this instance without a restart.
 */
@SystemTask()
export class McpRegistryRefreshTask implements SystemTask {
	readonly name = 'mcp-registry-refresh';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: REFRESH_INTERVAL_HOURS * Time.hours.toSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	// Only the leader polls the remote registry, so a new leader may be
	// running on outdated data until this runs.
	readonly runOnTakeover = true;

	constructor(private readonly mcpRegistryService: McpRegistryService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.mcpRegistryService.refreshFromApi(signal);
	}
}
