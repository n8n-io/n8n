import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowEntity, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { randomUUID } from 'node:crypto';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	SelfHealingTemporaryWorkflowRepository,
	TEMPORARY_VERIFICATION_RETENTION_MS,
} from './database/self-healing-temporary-workflow.repository';

type TemporaryWorkflowInput = {
	user: User;
	baseline: WorkflowSuggestionBaseline;
	graph: WorkflowSuggestionGraph;
};

@Service()
export class SelfHealingTemporaryWorkflowService {
	constructor(
		private readonly workflows: SelfHealingTemporaryWorkflowRepository,
		private readonly finder: WorkflowFinderService,
		private readonly policy: PolicyEnforcementService,
		private readonly transactions: TransactionRunner,
		private readonly executions: ExecutionPersistence,
		private readonly executionService: ExecutionService,
		private readonly logger: Logger,
	) {}

	async withTemporaryWorkflow<T>(
		input: TemporaryWorkflowInput,
		verify: (workflowId: string) => Promise<T>,
	): Promise<T> {
		const workflow = await this.create(input);

		try {
			return await verify(workflow.id);
		} finally {
			await this.cleanup(workflow.id);
		}
	}

	private async create({ user, baseline, graph }: TemporaryWorkflowInput) {
		if (user.disabled || user.id !== baseline.backgroundUserId) {
			throw new ForbiddenError('Workflow edit and execution access is required.');
		}

		const original = await this.finder.findWorkflowForUser(baseline.workflowId, user, [
			'workflow:read',
			'workflow:update',
			'workflow:execute',
		]);
		if (
			!original ||
			!original.shared.some(
				({ projectId, role }) => projectId === baseline.projectId && role === 'workflow:owner',
			)
		) {
			throw new ForbiddenError('Workflow edit and execution access is required.');
		}

		const workflow = new WorkflowEntity();
		workflow.name = baseline.original.name;
		workflow.nodes = structuredClone(graph.nodes);
		workflow.connections = structuredClone(graph.connections);
		workflow.settings = structuredClone(baseline.original.settings);
		workflow.pinData = structuredClone(baseline.original.pinData);
		workflow.staticData = structuredClone(original.staticData);
		workflow.nodeGroups = structuredClone(baseline.original.nodeGroups ?? []);
		workflow.isArchived = true;
		// oxlint-disable-next-line typescript/no-deprecated
		workflow.active = false;
		workflow.activeVersionId = null;
		workflow.versionId = randomUUID();

		const policyCleared = await this.policy.enforceWorkflowSave(
			{
				workflow: { id: null, name: workflow.name, nodes: workflow.nodes },
				storedWorkflow: null,
				projectId: baseline.projectId,
			},
			{ kind: 'user', user },
		);

		return await this.transactions.run(
			{ policyCleared },
			async (ctx) => await this.workflows.createTemporary(workflow, original.id, ctx),
		);
	}

	async cleanupAbandoned(signal?: AbortSignal): Promise<void> {
		if (signal?.aborted) return;

		const before = new Date(Date.now() - TEMPORARY_VERIFICATION_RETENTION_MS);
		for (const workflowId of await this.workflows.findAbandonedIds(before)) {
			if (signal?.aborted) return;

			await this.cleanup(workflowId);
		}
	}

	private async cleanup(workflowId: string): Promise<void> {
		try {
			for (const executionId of await this.workflows.findUnfinishedExecutionIds(workflowId)) {
				await this.executionService.stop(executionId, [workflowId]);
			}

			// Cancellation can return before a worker finishes its final writes.
			if (!(await this.workflows.canDelete(workflowId))) return;

			await this.executions.hardDeleteByWorkflowId(workflowId);
			await this.workflows.deleteTemporary(workflowId);
		} catch (error) {
			this.logger.warn('Could not clean up an Assistant verification workflow.', {
				workflowId,
				error: getErrorMessage(error),
			});
		}
	}
}
