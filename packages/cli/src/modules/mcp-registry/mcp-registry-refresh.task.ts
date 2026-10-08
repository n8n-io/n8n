import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { McpRegistryService } from './registry/mcp-registry.service';

const REFRESH_INTERVAL_HOURS = 8;

/**
 * Refreshes the MCP server registry from the remote API, so newly published
 * or deprecated servers reach this instance without a restart.
 */
@SystemTask()
export class McpRegistryRefreshTask implements SystemTask {
	readonly name = 'mcp-registry-refresh';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		REFRESH_INTERVAL_HOURS * Time.hours.toSeconds,
	);

	readonly target = {
		scope: 'cluster',
		scheduler: { maxAttempts: 3 },
		leaderTimer: { runOnTakeover: true },
	} satisfies SystemTaskTarget;

	constructor(private readonly mcpRegistryService: McpRegistryService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.mcpRegistryService.refreshFromApi(signal);
	}
}
