import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

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

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: { runOnTakeover: true },
	});

	constructor(private readonly mcpRegistryService: McpRegistryService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.mcpRegistryService.refreshFromApi(signal);
	}
}
