import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Lease, LeaseHandler } from '@n8n/leases';
import { UnexpectedError, Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { LeasedTriggerRegistry } from './leased-trigger-registry';

/**
 * Arms one leased trigger node while its lease is held, and disarms it when the
 * lease ends. Leased triggers live in {@link LeasedTriggerRegistry}, so the
 * leader's reconciliation, ghost sweeps and stepdown teardown never see them.
 *
 * A trigger that fails at runtime ends the hold with its error; the scheduler
 * then hands the lease out again after a backoff, on this main or another.
 */
@Service()
export class WorkflowTriggerLeaseHolder implements LeaseHandler {
	constructor(
		private readonly logger: Logger,
		private readonly registry: LeasedTriggerRegistry,
		private readonly workflows: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly registrar: NonWebhookTriggerRegistrar,
		private readonly executionContexts: TriggerExecutionContextFactory,
		private readonly staticData: WorkflowStaticDataService,
	) {
		this.logger = this.logger.scoped('workflow-activation');
	}

	async hold(lease: Lease): Promise<void> {
		const { workflowId, nodeId } = parseLeaseData(lease);
		const dbWorkflow = await this.workflows.findOneBy({ id: workflowId });
		if (!dbWorkflow?.activeVersionId) {
			throw new UnexpectedError('Leased trigger belongs to a workflow that is not published', {
				extra: { workflowId, nodeId },
			});
		}
		const versionData = await this.executionContexts.loadPublishedWorkflowData(workflowId, {
			bypassCache: true,
		});
		dbWorkflow.nodes = versionData.nodes;
		dbWorkflow.connections = versionData.connections;

		const workflow = new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: dbWorkflow.nodes,
			connections: dbWorkflow.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId,
			workflowSettings: dbWorkflow.settings,
		});

		let failRuntime: (error: Error) => void = () => {};
		const runtimeFailure = new Promise<Error>((resolve) => {
			failRuntime = resolve;
		});
		const registration = this.registrar.createRegistrationContext(dbWorkflow, {
			activationMode: 'activate',
			executionMode: 'trigger',
			additionalData,
			resolveWorkflowData: async () =>
				await this.executionContexts.loadPublishedWorkflowData(workflowId),
			onTriggerFailure: ({ error }) => failRuntime(error),
		});

		await workflow.expression.acquireIsolate();
		try {
			await this.registry.addTriggers(
				workflowId,
				workflow,
				[nodeId],
				additionalData,
				'trigger',
				'activate',
				registration.getTriggerFunctions,
				registration.getPollFunctions,
			);
		} finally {
			await workflow.expression.releaseIsolate();
		}
		this.logger.debug('Armed leased trigger', {
			workflowId,
			nodeId,
			fencingToken: lease.fencingToken,
		});

		await lease.ready();
		const ended = await Promise.race([leaseEnd(lease.signal), runtimeFailure]);

		try {
			await this.registry.removeTriggers(workflowId, new Set([nodeId]));
			await this.staticData.saveStaticData(workflow);
		} finally {
			this.logger.debug('Disarmed leased trigger', {
				workflowId,
				nodeId,
				fencingToken: lease.fencingToken,
			});
		}
		if (ended instanceof Error) throw ended;
	}
}

function parseLeaseData(lease: Lease): { workflowId: string; nodeId: string } {
	const { workflowId, nodeId } = lease.data;
	if (typeof workflowId !== 'string' || typeof nodeId !== 'string') {
		throw new UnexpectedError('Leased trigger has invalid lease data', {
			extra: { key: lease.key },
		});
	}
	return { workflowId, nodeId };
}

async function leaseEnd(signal: AbortSignal): Promise<void> {
	if (signal.aborted) return;
	await new Promise<void>((resolve) => {
		signal.addEventListener('abort', () => resolve(), { once: true });
	});
}
