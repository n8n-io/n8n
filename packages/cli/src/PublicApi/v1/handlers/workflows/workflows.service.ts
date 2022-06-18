import { FindManyOptions, In, UpdateResult } from 'typeorm';
import { intersection } from 'lodash';
import type { INode } from 'n8n-workflow';

import { Db } from '../../../..';
import { User } from '../../../../databases/entities/User';
import { WorkflowEntity } from '../../../../databases/entities/WorkflowEntity';
import { SharedWorkflow } from '../../../../databases/entities/SharedWorkflow';
import { isInstanceOwner } from '../users/users.service';
import { Role } from '../../../../databases/entities/Role';
import config from '../../../../../config';

function insertIf(condition: boolean, elements: string[]): string[] {
	return condition ? elements : [];
}

export async function getSharedWorkflowIds(user: User): Promise<number[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: { user },
	});

	return sharedWorkflows.map((workflow) => workflow.workflowId);
}

export async function getSharedWorkflow(
	user: User,
	workflowId?: string | undefined,
): Promise<SharedWorkflow | undefined> {
	return Db.collections.SharedWorkflow.findOne({
		where: {
			...(!isInstanceOwner(user) && { user }),
			...(workflowId && { workflow: { id: workflowId } }),
		},
		relations: [...insertIf(!config.getEnv('workflowTagsDisabled'), ['workflow.tags']), 'workflow'],
	});
}

export async function getSharedWorkflows(
	user: User,
	options: {
		relations?: string[];
		workflowIds?: number[];
	},
): Promise<SharedWorkflow[]> {
	return Db.collections.SharedWorkflow.find({
		where: {
			...(!isInstanceOwner(user) && { user }),
			...(options.workflowIds && { workflow: { id: In(options.workflowIds) } }),
		},
		...(options.relations && { relations: options.relations }),
	});
}

export async function getWorkflowById(id: number): Promise<WorkflowEntity | undefined> {
	return Db.collections.Workflow.findOne({
		where: { id },
	});
}

/**
 * Returns the workflow IDs that have certain tags.
 * Intersection! e.g. workflow needs to have all provided tags.
 */
export async function getWorkflowIdsViaTags(tags: string[]): Promise<number[]> {
	const dbTags = await Db.collections.Tag.find({
		where: { name: In(tags) },
		relations: ['workflows'],
	});

	const workflowIdsPerTag = dbTags.map((tag) => tag.workflows.map((workflow) => workflow.id));

	return intersection(...workflowIdsPerTag);
}

export async function createWorkflow(
	workflow: WorkflowEntity,
	user: User,
	role: Role,
): Promise<WorkflowEntity> {
	return Db.transaction(async (transactionManager) => {
		const newWorkflow = new WorkflowEntity();
		Object.assign(newWorkflow, workflow);
		const savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

		const newSharedWorkflow = new SharedWorkflow();
		Object.assign(newSharedWorkflow, {
			role,
			user,
			workflow: savedWorkflow,
		});
		await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

		return savedWorkflow;
	});
}

export async function setWorkflowAsActive(workflow: WorkflowEntity): Promise<UpdateResult> {
	return Db.collections.Workflow.update(workflow.id, { active: true, updatedAt: new Date() });
}

export async function setWorkflowAsInactive(workflow: WorkflowEntity): Promise<UpdateResult> {
	return Db.collections.Workflow.update(workflow.id, { active: false, updatedAt: new Date() });
}

export async function deleteWorkflow(workflow: WorkflowEntity): Promise<WorkflowEntity> {
	return Db.collections.Workflow.remove(workflow);
}

export async function getWorkflows(
	options: FindManyOptions<WorkflowEntity>,
): Promise<WorkflowEntity[]> {
	return Db.collections.Workflow.find(options);
}

export async function getWorkflowsCount(options: FindManyOptions<WorkflowEntity>): Promise<number> {
	return Db.collections.Workflow.count(options);
}

export async function updateWorkflow(
	workflowId: number,
	updateData: WorkflowEntity,
): Promise<UpdateResult> {
	return Db.collections.Workflow.update(workflowId, updateData);
}

export function hasStartNode(workflow: WorkflowEntity): boolean {
	if (!workflow.nodes.length) return false;

	const found = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.start');

	return Boolean(found);
}

export function getStartNode(): INode {
	return {
		parameters: {},
		name: 'Start',
		type: 'n8n-nodes-base.start',
		typeVersion: 1,
		position: [240, 300],
	};
}

export function parseTagNames(tags: string): string[] {
	return tags.split(',').map((tag) => tag.trim());
}
