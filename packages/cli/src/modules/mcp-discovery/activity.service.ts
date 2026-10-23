// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { getMcpClientBrand } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { McpCallerAuth } from '@n8n/backend-services/auth';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export const isClaudeMcpClient = (name: string | undefined): boolean =>
	Boolean(
		name && (getMcpClientBrand(name) === 'claude' || name.toLowerCase() === 'anthropic/toolbox'),
	);

export const discoveryUserKey = (userId: string, field: string) =>
	`experiment.mcpDiscovery.${userId}.${field}`;

const connectionField = (caller?: McpCallerAuth): string | undefined =>
	caller?.authType === 'oauth'
		? `claudeClient.${caller.clientId}`
		: caller?.apiKeyId
			? `claudeApiKey.${caller.apiKeyId}`
			: undefined;

@Service()
export class McpDiscoveryActivityService {
	constructor(
		private readonly settings: SettingsRepository,
		private readonly config: GlobalConfig,
		private readonly logger: Logger,
	) {}

	async recordClaudeConnection(
		userId: string,
		clientName?: string,
		caller?: McpCallerAuth,
	): Promise<void> {
		if (this.config.deployment.type !== 'cloud' || !isClaudeMcpClient(clientName)) return;
		const field = connectionField(caller);
		if (!field) return;
		await this.settings.claimKey(discoveryUserKey(userId, field), String(Date.now()));
	}

	async recordFirstLogin(userId: string, loggedInAt: number): Promise<void> {
		if (this.config.deployment.type !== 'cloud') return;
		await this.settings.claimKey(discoveryUserKey(userId, 'firstLoginAt'), String(loggedInAt));
	}

	async recordMcpToolResult(
		userId: string,
		toolName: string,
		status: 'success' | 'error',
		workflowId?: string,
		appliedOperations?: number,
	): Promise<void> {
		if (this.config.deployment.type !== 'cloud' || status !== 'success') return;
		if (!workflowId || !['create_workflow_from_code', 'update_workflow'].includes(toolName)) return;
		if (toolName === 'update_workflow' && appliedOperations === 0) return;
		// Keep the existing key so previous completions still hide entry points.
		await this.settings.claimKey(discoveryUserKey(userId, 'claudeMcpUsedAt'), String(Date.now()));
	}

	async recordAssistantMutation(userId: string, changedAt = Date.now()): Promise<void> {
		if (this.config.deployment.type !== 'cloud') return;
		try {
			await this.settings.claimKey(
				discoveryUserKey(userId, 'assistantMutationAt'),
				String(changedAt),
			);
		} catch (error) {
			this.logger.warn('Failed to record MCP discovery Assistant activity', { error });
		}
	}
}
// EOF Experiment cleanup
