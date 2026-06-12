import type { InstanceAiEvalSeedWorkflow } from '@n8n/api-types';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowNode(value: unknown): value is INode {
	if (!isRecord(value)) return false;
	return (
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.type === 'string' &&
		typeof value.typeVersion === 'number' &&
		Array.isArray(value.position) &&
		value.position.length === 2 &&
		value.position.every((coordinate) => typeof coordinate === 'number') &&
		isRecord(value.parameters)
	);
}

function isConnections(value: unknown): value is IConnections {
	return isRecord(value);
}

/**
 * Recreates the workflow artifacts a conversation seed references, so a
 * restored message history's workflow ids resolve on this instance. Used by
 * the eval restore-thread endpoint.
 */
@Service()
export class EvalThreadRestoreService {
	constructor(
		private readonly workflowRepo: WorkflowRepository,
		private readonly sharedWorkflowRepo: SharedWorkflowRepository,
	) {}

	async restoreWorkflows(
		workflows: InstanceAiEvalSeedWorkflow[],
		projectId: string,
	): Promise<void> {
		for (const workflow of workflows) {
			await this.createWorkflowPinnedToId(workflow, projectId);
		}
	}

	/**
	 * Insert a workflow at its seeded id (the BeforeInsert hook only generates
	 * an id when unset) and make the project its owner so the agent can find and
	 * edit it. Idempotent: `save` upserts at the pinned id, and ownership is
	 * only granted on first create to avoid a duplicate shared-workflow row.
	 *
	 * Node credentials are stripped: the eval credential pin only filters
	 * `list()`, so a pre-attached credential id would bypass the thread's
	 * pinned credential view (and dangle anyway — the source instance's
	 * credentials don't exist here).
	 */
	private async createWorkflowPinnedToId(
		workflow: InstanceAiEvalSeedWorkflow,
		projectId: string,
	): Promise<void> {
		const nodes = workflow.nodes.map((node, index) => {
			if (!isWorkflowNode(node)) {
				throw new BadRequestError(
					`Seed workflow ${workflow.id} node at index ${index} is not a valid workflow node`,
				);
			}
			const { credentials: _stripped, ...rest } = node;
			return rest;
		});
		if (!isConnections(workflow.connections)) {
			throw new BadRequestError(`Seed workflow ${workflow.id} connections must be an object`);
		}

		const alreadyExists = await this.workflowRepo.existsBy({ id: workflow.id });
		await this.workflowRepo.save(
			this.workflowRepo.create({
				id: workflow.id,
				name: workflow.name,
				nodes,
				connections: workflow.connections,
				active: false,
				versionId: randomUUID(),
			}),
		);
		if (!alreadyExists) {
			await this.sharedWorkflowRepo.makeOwner([workflow.id], projectId);
		}
	}
}
