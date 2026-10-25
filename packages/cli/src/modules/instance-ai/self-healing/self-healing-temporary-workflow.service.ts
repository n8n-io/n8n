import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { TransactionRunner, UserRepository, WorkflowEntity, type User } from '@n8n/db';
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

export const SELF_HEALING_CLEANUP_BUDGET_MS = Time.minutes.toMilliseconds;

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
		private readonly users: UserRepository,
	) {}

	async create({ user: actor, baseline, graph }: TemporaryWorkflowInput) {
		const user = await this.users.findByIdWithRole(actor.id);
		if (!user || user.disabled || user.id !== baseline.backgroundUserId) {
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
		workflow.name = `[n8n Assistant test copy] ${baseline.original.name}`.slice(0, 128);
		workflow.description = 'Temporary copy created by n8n Assistant to test a proposed fix.';
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
		const deadline = AbortSignal.timeout(SELF_HEALING_CLEANUP_BUDGET_MS);
		signal = signal ? AbortSignal.any([signal, deadline]) : deadline;
		if (signal?.aborted) return;

		const before = new Date(Date.now() - TEMPORARY_VERIFICATION_RETENTION_MS);
		for (const workflowId of await this.workflows.findAbandonedIds(before)) {
			if (signal?.aborted) return;

			await this.cleanup(workflowId, signal);
		}
	}

	async cleanup(workflowId: string, signal?: AbortSignal): Promise<void> {
		try {
			if (signal?.aborted) return;
			for (const executionId of await this.workflows.findUnfinishedExecutionIds(workflowId)) {
				if (signal?.aborted) return;
				await this.executionService.stop(executionId, [workflowId]);
			}

			// Cancellation can return before a worker finishes its final writes.
			if (signal?.aborted) return;
			if (!(await this.workflows.canDelete(workflowId))) return;

			if (signal?.aborted) return;
			// An execution deletion already in progress finishes before cleanup stops.
			await this.executions.hardDeleteByWorkflowId(workflowId);
			if (signal?.aborted) return;
			await this.workflows.deleteTemporary(workflowId);
		} catch (error) {
			if (signal?.aborted) return;
			this.logger.warn('Could not clean up an Assistant verification workflow.', {
				workflowId,
				error: getErrorMessage(error),
			});
		}
	}
}
