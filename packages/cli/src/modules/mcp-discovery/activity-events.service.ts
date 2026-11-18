// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { McpDiscoveryActivityService } from './activity.service';
import type { McpDiscoveryEventMap } from './events';

@Service()
export class McpDiscoveryActivityEvents {
	private readonly pending = new Map<string, Promise<void>>();
	private initialized = false;

	constructor(
		private readonly events: EventService,
		private readonly activity: McpDiscoveryActivityService,
		private readonly logger: Logger,
	) {}

	init() {
		if (this.initialized) return;
		this.initialized = true;
		this.on(
			'experiment-user-first-login',
			async ({ userId, at }) => await this.activity.recordFirstLogin(userId, at),
		);
		this.on(
			'experiment-assistant-change-saved',
			async ({ userId, at }) => await this.activity.recordAssistantMutation(userId, at),
		);
		this.on(
			'experiment-mcp-client-connected',
			async ({ userId, clientName, caller }) =>
				await this.activity.recordClaudeConnection(userId, clientName, caller),
		);
		this.on('experiment-mcp-workflow-write-completed', async (event) => {
			const content = event.structuredContent;
			const operations =
				typeof content === 'object' &&
				content !== null &&
				'appliedOperations' in content &&
				typeof content.appliedOperations === 'number'
					? content.appliedOperations
					: undefined;
			return await this.activity.recordMcpToolResult(
				event.userId,
				event.toolName,
				event.status,
				event.workflowId,
				operations,
			);
		});
	}

	/** Wait for this user's observed activity before evaluating eligibility. */
	async flush(userId: string) {
		while (this.pending.has(userId)) await this.pending.get(userId);
	}

	private on<K extends keyof McpDiscoveryEventMap>(
		name: K,
		handler: (event: McpDiscoveryEventMap[K]) => Promise<void>,
	) {
		this.events.on(name, (event) => {
			// Preserve handshake/write ordering without delaying the host operation.
			const previous = this.pending.get(event.userId);
			const write = previous ? previous.then(async () => await handler(event)) : handler(event);
			const pending = write.catch((error: unknown) => {
				this.logger.warn('Failed to record MCP discovery activity', { error });
			});
			this.pending.set(event.userId, pending);
			void pending.finally(() => {
				if (this.pending.get(event.userId) === pending) this.pending.delete(event.userId);
			});
		});
	}
}
// EOF Experiment cleanup
