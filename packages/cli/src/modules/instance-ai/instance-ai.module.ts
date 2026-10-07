import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, ModuleMetadata, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

@BackendModule({ name: 'instance-ai', instanceTypes: ['main'] })
export class InstanceAiModule implements ModuleInterface {
	async init() {
		const { InstanceCredentialBroker } = await import(
			'@/credentials/instance-credential-broker.js'
		);
		const {
			InstanceAiSettingsService,
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
			INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
		} = await import('./instance-ai-settings.service.js');
		const { SandboxSettingsService } = await import('@/services/sandbox-settings.service.js');
		const settingsService = Container.get(InstanceAiSettingsService);
		const credentialBroker = Container.get(InstanceCredentialBroker);
		credentialBroker.registerUse(INSTANCE_AI_MODEL_CREDENTIAL_POLICY);
		Container.get(SandboxSettingsService).registerCredentialUses();
		credentialBroker.registerUse(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY);
		// This module owns its capabilities, so MCP and the Assistant offer them only while it is on.
		const { registerInstanceAiCapabilities } = await import(
			'./capabilities/instance-ai-capabilities.js'
		);
		registerInstanceAiCapabilities();
		await settingsService.loadFromDb();
		// Instantiating the setup telemetry service registers its settings-updated
		// listener. A setup finished by env vars only becomes observable at boot,
		// so the once-per-instance completion telemetry is also checked here.
		const { InstanceAiSetupTelemetryService } = await import(
			'./instance-ai-setup-telemetry.service.js'
		);
		await Container.get(InstanceAiSetupTelemetryService).recordSetupCompletedIfNeeded();
		await import('./instance-ai.controller.js');
		await import('./mcp/instance-ai-mcp-connection.controller.js');

		// Instantiating the relay registers its `user-deleted` listener, which
		// cleans up Instance AI data owned by the deleted user.
		const { InstanceAiEventRelay } = await import('./instance-ai-event-relay.service.js');
		Container.get(InstanceAiEventRelay);

		const { InstanceAiService } = await import('./instance-ai.service.js');
		Container.get(InstanceAiService);

		// Register the Assistant as an instance agent on the Agents runtime.
		const { SystemAgentExecutionService } = await import(
			'../agents/system-agents/system-agent-execution.service.js'
		);
		const { AssistantAgentProvider } = await import('./assistant-agent.provider.js');
		await Container.get(SystemAgentExecutionService).register(
			Container.get(AssistantAgentProvider),
		);

		if (process.env.E2E_TESTS === 'true' && process.env.NODE_ENV !== 'production') {
			await import('./instance-ai-test.controller.js');
		}
	}

	async systemTasks() {
		const { InstanceAiConfig } = await import('@n8n/config');
		if (Container.get(InstanceAiConfig).pruneInterval <= 0) return [];

		const { InstanceAiCheckpointPruningTask } = await import(
			'./instance-ai-checkpoint-pruning.task.js'
		);
		return [InstanceAiCheckpointPruningTask];
	}

	async settings() {
		const { GlobalConfig } = await import('@n8n/config');
		const { InstanceAiService } = await import('./instance-ai.service.js');
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service.js');
		const globalConfig = Container.get(GlobalConfig);
		const service = Container.get(InstanceAiService);
		const settingsService = Container.get(InstanceAiSettingsService);
		const enabled = settingsService.isAgentEnabled();
		const mcpConnectionsAvailable = service.areMcpConnectionsAvailable();
		const localGatewayDisabled = settingsService.isLocalGatewayDisabled();
		const browserUseEnabled = settingsService.isBrowserUseEnabled();
		const sandboxStatus = settingsService.getSandboxStatus();
		const setupCompleted = await settingsService.isSetupCompleted();
		return {
			enabled,
			mcpConnectionsAvailable,
			localGatewayDisabled,
			browserUseEnabled,
			proxyEnabled: service.isProxyEnabled(),
			cloudManaged: globalConfig.deployment.type === 'cloud',
			setupCompleted,
			sandboxEnabled: sandboxStatus.enabled,
			workflowBuilderAvailable: enabled && sandboxStatus.workflowBuilderAvailable,
			sandboxUnavailableReason: sandboxStatus.unavailableReason,
			runDebugEnabled: globalConfig.instanceAi.runDebugEnabled,
			activationCapped: settingsService.isActivationCapped(),
			// Both modes are Assistant surfaces, so the switch has no use while the Assistant is off.
			experience: {
				enabled: enabled && globalConfig.instanceAi.experienceModesEnabled,
				defaultMode: globalConfig.instanceAi.experienceDefaultMode,
			},
		};
	}

	async entities() {
		// The Assistant runs on the Agents runtime and its tables reference Agents
		// sessions. Fail fast instead of a TypeORM metadata hang without them.
		if (!Container.get(ModuleMetadata).get('agents')) {
			throw new UnexpectedError(
				'The instance-ai module requires the agents module. Enable both, or disable instance-ai.',
			);
		}
		const { InstanceAiIterationLog } = await import(
			'./entities/instance-ai-iteration-log.entity.js'
		);
		const { InstanceAiMcpRegistryConnection } = await import(
			'./entities/instance-ai-mcp-registry-connection.entity.js'
		);
		const { WorkflowSuggestion } = await import(
			'./workflow-suggestions/database/workflow-suggestion.entity.js'
		);
		const { WorkflowSuggestionActivity } = await import(
			'./workflow-suggestions/database/workflow-suggestion-activity.entity.js'
		);
		const { WorkflowProvenance } = await import('./provenance/workflow-provenance.entity.js');

		return [
			InstanceAiIterationLog,
			InstanceAiMcpRegistryConnection,
			WorkflowSuggestion,
			WorkflowSuggestionActivity,
			WorkflowProvenance,
		];
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service.js');
		await Container.get(InstanceAiService).shutdown();
	}
}
