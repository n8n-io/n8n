import { Logger } from '@n8n/backend-common';
import { runWithScopedHttpInterceptor } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { WorkflowExecute } from 'n8n-core';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { AiGymConfig } from './ai-gym.config';
import { AiGymRuntimeService } from './ai-gym-runtime.service';
import { UnsupportedWorkflowNodesError } from './errors/unsupported-workflow-nodes.error';
import { checkWorkflowSupport } from './node-support-validator';
import { SimulationCredentialsHelper } from './simulation-credentials-helper';
import { createAiGymScopedInterceptor } from './simulation-transport';
import { AiGymExecutionHostPort } from './types';
import type {
	SimulateWorkflowOptions,
	SimulationResult,
	WorkflowSupportCheckResult,
} from './types';

/**
 * Runs ephemeral, in-process workflow simulations backed by `@n8n/ai-gym`.
 *
 * Simulations do not persist execution rows to the database, synthesize all credentials
 * from ai-gym tenant tokens, and fail fast if the workflow contains unsupported nodes.
 */
@Service()
export class WorkflowSimulationService {
	constructor(
		private readonly runtime: AiGymRuntimeService,
		private readonly host: AiGymExecutionHostPort,
		private readonly config: AiGymConfig,
		private readonly logger: Logger,
	) {}

	async checkSupport(workflow: Pick<IWorkflowBase, 'nodes'>): Promise<WorkflowSupportCheckResult> {
		const manifest = await this.runtime.getManifest();
		return checkWorkflowSupport(workflow, manifest);
	}

	async simulate(options: SimulateWorkflowOptions): Promise<SimulationResult> {
		const startedAt = Date.now();
		const manifest = await this.runtime.getManifest();
		const support = checkWorkflowSupport(options.workflowData, manifest);

		if (!support.supported) {
			throw new UnsupportedWorkflowNodesError(support.unsupportedNodes);
		}

		const session = await this.runtime.createSession({
			llmBackend: options.llmBackend,
		});

		try {
			const { tenant } = session;

			if (options.seeds) {
				for (const [service, payload] of Object.entries(options.seeds)) {
					await tenant.seed(service, payload);
				}
			}

			if (options.faults) {
				for (const [flag, count] of Object.entries(options.faults)) {
					await tenant.setFault(flag, count);
				}
			}

			const baseAdditionalData = await this.host.getBaseAdditionalData({
				workflowData: options.workflowData,
				userId: options.userId,
				pushRef: options.pushRef,
			});

			const simulationCredentialsHelper = new SimulationCredentialsHelper(
				baseAdditionalData.credentialsHelper,
				tenant,
			);

			const additionalData = {
				...baseAdditionalData,
				credentialsHelper: simulationCredentialsHelper,
				synthesizeUnconfiguredCredentials: true,
			};

			const nodeTypes = this.host.getNodeTypes();
			const workflow = new Workflow({
				id: options.workflowData.id,
				name: options.workflowData.name,
				nodes: options.workflowData.nodes,
				connections: options.workflowData.connections,
				active: false,
				nodeTypes,
				staticData: options.workflowData.staticData,
				settings: options.workflowData.settings,
			});

			const startNodeObj = options.startNode
				? (workflow.getNode(options.startNode) ?? undefined)
				: undefined;
			const pinData = options.pinData ?? options.workflowData.pinData;
			const timeoutMs = options.timeoutMs ?? this.config.defaultTimeoutMs;

			const runData = await tenant.run(
				{
					services: support.requiredVendors,
					unmatched: 'block',
				},
				async (scope) => {
					const interceptor = createAiGymScopedInterceptor({
						manifest,
						scope,
						services: support.requiredVendors,
						blockUnmatched: true,
					});

					return await runWithScopedHttpInterceptor(interceptor, async () => {
						const workflowExecute = new WorkflowExecute(additionalData, 'manual');
						const executionPromise = workflowExecute.run({
							workflow,
							startNode: startNodeObj,
							destinationNode: options.destinationNode
								? { nodeName: options.destinationNode, mode: 'inclusive' }
								: undefined,
							pinData,
						});

						let timer: ReturnType<typeof setTimeout> | undefined;
						try {
							const timeoutPromise = new Promise<never>((_, reject) => {
								timer = setTimeout(() => {
									executionPromise.cancel('Simulation timed out');
									reject(new Error(`Workflow simulation timed out after ${timeoutMs}ms`));
								}, timeoutMs);
							});
							return await Promise.race<IRun>([executionPromise, timeoutPromise]);
						} finally {
							if (timer) clearTimeout(timer);
						}
					});
				},
			);

			const events = await tenant.monitor();
			const vendorStates: Record<string, Record<string, unknown>> = {};
			for (const vendor of support.requiredVendors) {
				try {
					vendorStates[vendor] = await tenant.state(vendor);
				} catch {
					// Some stateless vendors (e.g. llm-compat) do not expose a state snapshot.
				}
			}

			const runError = runData.data.resultData.error;
			const status: SimulationResult['status'] =
				runData.status === 'crashed'
					? 'crashed'
					: runError || runData.status === 'error'
						? 'error'
						: 'success';

			this.logger.debug('Completed ai-gym workflow simulation', {
				scopes: ['ai-gym'],
				workflowId: options.workflowData.id,
				status,
				eventCount: events.length,
				durationMs: Date.now() - startedAt,
			});

			return {
				status,
				runData,
				events,
				vendorStates,
				vendorsUsed: support.requiredVendors,
				durationMs: Date.now() - startedAt,
				error: runError?.message,
			};
		} finally {
			await session.close();
		}
	}
}
