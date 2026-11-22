import {
	UnsupportedWorkflowNodesError,
	WorkflowSimulationService,
} from '@n8n/backend-module-ai-gym';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type {
	WorkflowTestCredentialCheck,
	WorkflowTestInput,
	WorkflowTestOutput,
} from '@n8n/instance-ai';
import type { IPinData } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { PostHogClient } from '@n8n/backend-services';

export const INSTANCE_AI_WORKFLOW_TEST_FLAG = 'instance_ai_workflow_test_ai_gym';

/**
 * Orchestrates the feature-flagged `workflow_test` tool for Instance AI:
 * 1. Validates that real credentials referenced by the workflow are still valid
 *    via read-only `CredentialsService.testById`.
 * 2. Runs an ephemeral in-process `WorkflowSimulationService.simulate` backed by `@n8n/ai-gym`.
 */
@Service()
export class InstanceAiWorkflowTestService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsService: CredentialsService,
		private readonly postHogClient: PostHogClient,
		private readonly moduleRegistry: ModuleRegistry,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async isAvailable(): Promise<boolean> {
		if (!this.moduleRegistry.isActive('ai-gym')) {
			return false;
		}
		if (process.env.N8N_INSTANCE_AI_WORKFLOW_TEST_ENABLED === 'true') {
			return true;
		}
		const flag = await this.postHogClient.getFeatureFlagForInstance(INSTANCE_AI_WORKFLOW_TEST_FLAG);
		return flag === true;
	}

	async runTest(
		user: User,
		input: WorkflowTestInput,
		pushRef?: string,
	): Promise<WorkflowTestOutput> {
		const workflow = await this.workflowRepository.get({ id: input.workflowId });
		if (!workflow) {
			return {
				status: 'simulation_failed',
				credentialChecks: [],
				error: `Workflow "${input.workflowId}" not found.`,
			};
		}

		// Stage 1: verify real credentials referenced by enabled nodes.
		const credentialChecks: WorkflowTestCredentialCheck[] = [];
		if (!input.skipCredentialCheck) {
			const seen = new Set<string>();
			for (const node of workflow.nodes) {
				if (node.disabled || !node.credentials) continue;
				for (const [credentialType, ref] of Object.entries(node.credentials)) {
					const credentialId = ref?.id ?? undefined;
					const dedupeKey = `${node.name}:${credentialType}:${credentialId ?? 'none'}`;
					if (seen.has(dedupeKey)) continue;
					seen.add(dedupeKey);

					if (!credentialId) {
						credentialChecks.push({
							nodeName: node.name,
							credentialType,
							credentialName: ref?.name,
							outcome: 'missing',
							message: 'Credential reference has no saved ID.',
						});
						continue;
					}

					try {
						const probe = await this.credentialsService.testById(user, credentialId);
						const outcome =
							probe.status === 'OK'
								? 'accepted'
								: probe.status === 'Error'
									? 'rejected'
									: 'unverified';
						credentialChecks.push({
							nodeName: node.name,
							credentialType,
							credentialId,
							credentialName: ref?.name,
							outcome,
							message: probe.message,
						});
					} catch (error) {
						credentialChecks.push({
							nodeName: node.name,
							credentialType,
							credentialId,
							credentialName: ref?.name,
							outcome: 'rejected',
							message: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}

			const hasRejectedOrMissing = credentialChecks.some(
				(check) => check.outcome === 'rejected' || check.outcome === 'missing',
			);
			if (hasRejectedOrMissing) {
				return {
					status: 'credentials_failed',
					credentialChecks,
					error: 'One or more configured credentials failed validation.',
				};
			}
		}

		// Stage 2: run ephemeral in-process simulation via @n8n/backend-module-ai-gym.
		const simulationService = Container.get(WorkflowSimulationService);
		try {
			const result = await simulationService.simulate({
				workflowData: workflow,
				startNode: input.startNode,
				destinationNode: input.destinationNode,
				pinData: input.pinData as IPinData | undefined,
				seeds: input.seeds,
				faults: input.faults,
				timeoutMs: input.timeoutMs,
				pushRef,
				userId: user.id,
			});

			const runDataByNode = result.runData.data.resultData.runData;
			const nodeResults = Object.entries(runDataByNode).map(([nodeName, runs]) => {
				const lastRun = runs.at(-1);
				const mainItems = lastRun?.data?.main?.flat().filter(Boolean) ?? [];
				return {
					nodeName,
					status: lastRun?.error ? ('error' as const) : ('success' as const),
					itemCount: mainItems.length,
					error: lastRun?.error?.message,
				};
			});

			return {
				status: result.status === 'success' ? 'passed' : 'simulation_failed',
				credentialChecks,
				vendorsUsed: result.vendorsUsed,
				durationMs: result.durationMs,
				error: result.error,
				nodeResults,
				eventCount: result.events.length,
				vendorStates: result.vendorStates,
			};
		} catch (error) {
			if (error instanceof UnsupportedWorkflowNodesError) {
				return {
					status: 'unsupported_nodes',
					credentialChecks,
					unsupportedNodes: error.unsupportedNodes,
					error: error.message,
				};
			}
			this.logger.warn('ai-gym workflow_test simulation failed', {
				workflowId: input.workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				status: 'simulation_failed',
				credentialChecks,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
