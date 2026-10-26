import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'instance-ai', instanceTypes: ['main', 'worker', 'webhook'] })
export class InstanceAiModule implements ModuleInterface {
	private isMain(): boolean {
		return Container.get(InstanceSettings).instanceType === 'main';
	}

	async init() {
		await import('./self-healing/self-healing-trigger.service.js');

		// Workers and webhook processes only relay eligible failures to main.
		if (!this.isMain()) return;

		const { WorkflowMutationHooksProxy } = await import('@n8n/backend-services');
		const { SelfHealingConfigurationService } = await import(
			'./self-healing/self-healing-configuration.service.js'
		);

		// Clean up selections after transfers even when self-healing is disabled.
		Container.get(WorkflowMutationHooksProxy).registerProvider(
			Container.get(SelfHealingConfigurationService),
		);

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
		await settingsService.loadFromDb();
		// The default depends on the license plan, so re-check it and refresh the cached
		// frontend settings when the license changes.
		const { License } = await import('@/license.js');
		Container.get(License).onCertRefresh(() => {
			void settingsService
				.keepEnabledIfInUse()
				.finally(
					async () => await Container.get(ModuleRegistry).refreshModuleSettings('instance-ai'),
				)
				.catch((error: unknown) => {
					Container.get(Logger)
						.scoped('instance-ai')
						.error('Failed to apply a license change to the n8n Assistant', { error });
				});
		});
		// Instantiating the setup telemetry service registers its settings-updated
		// listener. A setup finished by env vars only becomes observable at boot,
		// so the once-per-instance completion telemetry is also checked here.
		const { InstanceAiSetupTelemetryService } = await import(
			'./instance-ai-setup-telemetry.service.js'
		);
		await Container.get(InstanceAiSetupTelemetryService).recordSetupCompletedIfNeeded();
		await import('./instance-ai.controller.js');
		await import('./mcp/instance-ai-mcp-connection.controller.js');
		const { InstanceAiConfig } = await import('@n8n/config');
		if (Container.get(InstanceAiConfig).evalInstance) {
			await import('./eval/eval.controller.js');
		}
		if (Container.get(InstanceAiConfig).workflowSuggestionsEnabled) {
			await import('./self-healing/self-healing-results.controller.js');
			await import('./self-healing/self-healing-configurations.controller.js');
			const { InboxSourceRegistry } = await import('../inbox/inbox-source.registry.js');
			const { SelfHealingResultService } = await import(
				'./self-healing/self-healing-result.service.js'
			);
			const results = Container.get(SelfHealingResultService);
			Container.get(InboxSourceRegistry).register({
				type: 'self_healing_result',
				isEnabled: async () => Container.get(InstanceAiConfig).workflowSuggestionsEnabled,
				list: async (user, query) => await results.listForInbox(user, query),
				count: async (user) => await results.countForInbox(user),
			});
			const { WorkflowSuggestionEventRelay } = await import(
				'./workflow-suggestions/workflow-suggestion-event-relay.service.js'
			);
			Container.get(WorkflowMutationHooksProxy).registerProvider(
				Container.get(WorkflowSuggestionEventRelay),
			);
		}

		// Instantiating the relay registers its `user-deleted` listener, which
		// cleans up Instance AI data owned by the deleted user.
		const { InstanceAiEventRelay } = await import('./instance-ai-event-relay.service.js');
		Container.get(InstanceAiEventRelay);

		void this.reconcileInterruptedRuns().catch((error: unknown) => {
			Container.get(Logger)
				.scoped('instance-ai')
				.error('Startup run reconciliation failed', { error });
		});

		if (process.env.E2E_TESTS === 'true' && process.env.NODE_ENV !== 'production') {
			await import('./instance-ai-test.controller.js');
		}
	}

	private async reconcileInterruptedRuns(): Promise<void> {
		const { InterruptedRunSweeper } = await import('./event-bus/interrupted-run-sweeper.js');
		const { InstanceAiService } = await import('./instance-ai.service.js');
		const { SelfHealingInvestigationService } = await import(
			'./self-healing/self-healing-investigation.service.js'
		);
		const sweeper = Container.get(InterruptedRunSweeper);
		sweeper.setResumeHost(Container.get(InstanceAiService));

		await sweeper.sweep();
		await Container.get(SelfHealingInvestigationService).reconcile();
	}

	async systemTasks() {
		if (!this.isMain()) return [];

		const { InstanceAiConfig } = await import('@n8n/config');
		const { SelfHealingReconciliationTask } = await import(
			'./self-healing/self-healing-reconciliation.task.js'
		);
		if (Container.get(InstanceAiConfig).pruneInterval <= 0) return [SelfHealingReconciliationTask];

		const { InstanceAiCheckpointPruningTask } = await import(
			'./instance-ai-checkpoint-pruning.task.js'
		);
		return [InstanceAiCheckpointPruningTask, SelfHealingReconciliationTask];
	}

	async settings() {
		if (!this.isMain()) return {};

		const { GlobalConfig } = await import('@n8n/config');
		const { InstanceAiService } = await import('./instance-ai.service.js');
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service.js');
		const globalConfig = Container.get(GlobalConfig);
		const service = Container.get(InstanceAiService);
		const settingsService = Container.get(InstanceAiSettingsService);
		const enabled = settingsService.isAgentEnabled();
		const mcpConnectionsAvailable = service.areMcpConnectionsAvailable();
		const browserUseEnabled = settingsService.isBrowserUseEnabled();
		const sandboxStatus = settingsService.getSandboxStatus();
		const setupCompleted = await settingsService.isSetupCompleted();
		return {
			enabled,
			mcpConnectionsAvailable,
			browserUseEnabled,
			proxyEnabled: service.isProxyEnabled(),
			cloudManaged: globalConfig.deployment.type === 'cloud',
			setupCompleted,
			sandboxEnabled: sandboxStatus.enabled,
			workflowBuilderAvailable: enabled && sandboxStatus.workflowBuilderAvailable,
			sandboxUnavailableReason: sandboxStatus.unavailableReason,
			runDebugEnabled: globalConfig.instanceAi.runDebugEnabled,
			workflowSuggestionsEnabled: globalConfig.instanceAi.workflowSuggestionsEnabled,
		};
	}

	async entities() {
		const { InstanceAiThread } = await import('./entities/instance-ai-thread.entity.js');
		const { InstanceAiMessage } = await import('./entities/instance-ai-message.entity.js');
		const { InstanceAiResource } = await import('./entities/instance-ai-resource.entity.js');
		const { InstanceAiIterationLog } = await import(
			'./entities/instance-ai-iteration-log.entity.js'
		);
		const { InstanceAiCheckpoint } = await import('./entities/instance-ai-checkpoint.entity.js');
		const { InstanceAiPendingConfirmation } = await import(
			'./entities/instance-ai-pending-confirmation.entity.js'
		);
		const { InstanceAiObservation } = await import('./entities/instance-ai-observation.entity.js');
		const { InstanceAiObservationCursor } = await import(
			'./entities/instance-ai-observation-cursor.entity.js'
		);
		const { InstanceAiObservationLock } = await import(
			'./entities/instance-ai-observation-lock.entity.js'
		);
		const { InstanceAiMcpRegistryConnection } = await import(
			'./entities/instance-ai-mcp-registry-connection.entity.js'
		);
		const { InstanceAiThreadGrant } = await import('./entities/instance-ai-thread-grant.entity.js');
		const { InstanceAiThreadTabs } = await import('./entities/instance-ai-thread-tabs.entity.js');
		const { InstanceAiEventLogEntry } = await import(
			'./entities/instance-ai-event-log-entry.entity.js'
		);
		const { WorkflowSuggestion } = await import(
			'./workflow-suggestions/database/workflow-suggestion.entity.js'
		);
		const { WorkflowSuggestionActivity } = await import(
			'./workflow-suggestions/database/workflow-suggestion-activity.entity.js'
		);
		const { SelfHealingResult } = await import(
			'./self-healing/database/self-healing-result.entity.js'
		);
		const { SelfHealingInvestigation } = await import(
			'./self-healing/database/self-healing-investigation.entity.js'
		);

		const { SelfHealingConfiguration } = await import(
			'./self-healing/database/self-healing-configuration.entity.js'
		);

		const { SelfHealingConfigurationWorkflow } = await import(
			'./self-healing/database/self-healing-configuration-workflow.entity.js'
		);

		const { SelfHealingConfigurationReviewer } = await import(
			'./self-healing/database/self-healing-configuration-reviewer.entity.js'
		);

		return [
			InstanceAiThread,
			InstanceAiMessage,
			InstanceAiResource,
			InstanceAiIterationLog,
			InstanceAiCheckpoint,
			InstanceAiPendingConfirmation,
			InstanceAiObservation,
			InstanceAiObservationCursor,
			InstanceAiObservationLock,
			InstanceAiMcpRegistryConnection,
			InstanceAiThreadGrant,
			InstanceAiThreadTabs,
			InstanceAiEventLogEntry,
			WorkflowSuggestion,
			WorkflowSuggestionActivity,
			SelfHealingResult,
			SelfHealingInvestigation,
			SelfHealingConfigurationReviewer,
			SelfHealingConfigurationWorkflow,
			SelfHealingConfiguration,
		];
	}

	@OnShutdown()
	async shutdown() {
		if (!this.isMain()) return;

		const { InstanceAiService } = await import('./instance-ai.service.js');
		await Container.get(InstanceAiService).shutdown();
	}
}
