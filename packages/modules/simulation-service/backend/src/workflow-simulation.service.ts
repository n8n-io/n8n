import { Logger } from '@n8n/backend-common';
import { runWithScopedHttpInterceptor } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { WorkflowExecute } from 'n8n-core';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { SimulationServiceConfig } from './simulation-service.config';
import { SimulationServiceRuntimeService } from './simulation-service-runtime.service';
import { UnsupportedWorkflowNodesError } from './errors/unsupported-workflow-nodes.error';
import { checkWorkflowSupport } from './node-support-validator';
import { SimulationCredentialsHelper } from './simulation-credentials-helper';
import { createSimulationServiceScopedInterceptor } from './simulation-transport';
import { SimulationServiceExecutionHostPort } from './types';
import {
	applyVendorSeed,
	buildVendorCapabilities,
	executePendingApiSeedActions,
	type PendingApiSeedAction,
} from './vendor-seed-schemas';
import type {
	SimulateWorkflowOptions,
	SimulationResult,
	WorkflowSupportCheckResult,
} from './types';

/**
 * Runs ephemeral, in-process workflow simulations backed by `@n8n/ai-gym`.
 *
 * Simulations do not persist execution rows to the database, synthesize tenant-minted
 * credentials when nodes are unconfigured (while honoring non-secret fields on real
 * credentials if configured), and fail fast if the workflow contains unsupported nodes.
 */
@Service()
export class WorkflowSimulationService {
	constructor(
		private readonly runtime: SimulationServiceRuntimeService,
		private readonly host: SimulationServiceExecutionHostPort,
		private readonly config: SimulationServiceConfig,
		private readonly logger: Logger,
	) {}

	async checkSupport(workflow: Pick<IWorkflowBase, 'nodes'>): Promise<WorkflowSupportCheckResult> {
		const manifest = await this.runtime.getManifest();
		const nodeTypes = this.host.getNodeTypes();
		return checkWorkflowSupport(workflow, manifest, nodeTypes);
	}

	async getCapabilities() {
		const manifest = await this.runtime.getManifest();
		return {
			vendors: manifest.vendors.map((v) => buildVendorCapabilities(v)),
		};
	}

	async simulate(options: SimulateWorkflowOptions): Promise<SimulationResult> {
		const startedAt = Date.now();
		const manifest = await this.runtime.getManifest();
		const nodeTypes = this.host.getNodeTypes();
		const support = checkWorkflowSupport(options.workflowData, manifest, nodeTypes);

		if (!support.supported) {
			throw new UnsupportedWorkflowNodesError(support.unsupportedNodes);
		}

		const session = await this.runtime.createSession({
			llmBackend: options.llmBackend,
		});

		try {
			const { tenant } = session;

			const pendingSeedActions: PendingApiSeedAction[] = [];
			if (options.seeds) {
				let seedSeq = 0;
				for (const [service, payloadOrList] of Object.entries(options.seeds)) {
					const payloads = Array.isArray(payloadOrList) ? payloadOrList : [payloadOrList];
					for (const payload of payloads) {
						if (payload && typeof payload === 'object') {
							const actions = await applyVendorSeed({
								tenant,
								vendor: service,
								payload,
								nextSeq: () => ++seedSeq,
							});
							pendingSeedActions.push(...actions);
						}
					}
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
					const interceptor = createSimulationServiceScopedInterceptor({
						manifest,
						scope,
						services: support.requiredVendors,
						blockUnmatched: true,
					});

					return await runWithScopedHttpInterceptor(interceptor, async () => {
						if (pendingSeedActions.length > 0) {
							await executePendingApiSeedActions(tenant, pendingSeedActions);
						}
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

			this.logger.debug('Completed simulation-service workflow simulation', {
				scopes: ['simulation-service'],
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
