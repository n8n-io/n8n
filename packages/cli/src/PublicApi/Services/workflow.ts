import type { INode } from 'n8n-workflow';
import { FindManyOptions } from 'typeorm';
import { User } from '../../databases/entities/User';
import { WorkflowEntity } from '../../databases/entities/WorkflowEntity';
import { Db } from '../..';
import { isInstanceOwner } from './user';
import { SharedWorkflow } from '../../databases/entities/SharedWorkflow';

export async function getSharedWorkflowIds(user: User): Promise<number[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: {
			user,
		},
	});
	return sharedWorkflows.map((workflow) => workflow.workflowId);
}

export async function getSharedWorkflow(
	user: User,
	workflowId?: string | undefined,
): Promise<SharedWorkflow | undefined> {
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			...(!isInstanceOwner(user) && { user }),
			...(workflowId && { workflow: { id: workflowId } }),
		},
		relations: ['workflow'],
	});
	return sharedWorkflow;
}

export async function getSharedWorkflows(
	user: User,
	resolveWorkflows = false,
): Promise<SharedWorkflow[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: {
			...(!isInstanceOwner(user) && { user }),
		},
		...(resolveWorkflows && { relations: ['workflow'] }),
	});
	return sharedWorkflows;
}

export async function getWorkflowById(id: number): Promise<WorkflowEntity | undefined> {
	const workflow = await Db.collections.Workflow.findOne({
		where: {
			id,
		},
	});
	return workflow;
}

export async function activeWorkflow(workflow: WorkflowEntity): Promise<void> {
	await Db.collections.Workflow.update(workflow.id, { active: true, updatedAt: new Date() });
}

export async function desactiveWorkflow(workflow: WorkflowEntity): Promise<void> {
	await Db.collections.Workflow.update(workflow.id, { active: false, updatedAt: new Date() });
}

export async function deleteWorkflow(workflow: WorkflowEntity): Promise<void> {
	await Db.collections.Workflow.remove(workflow);
}

export async function getWorkflows(
	options: FindManyOptions<WorkflowEntity>,
): Promise<WorkflowEntity[]> {
	const workflows = await Db.collections.Workflow.find(options);
	return workflows;
}

export async function getWorkflowsCount(options: FindManyOptions<WorkflowEntity>): Promise<number> {
	const count = await Db.collections.Workflow.count(options);
	return count;
}

export async function updateWorkflow(
	workflowId: number,
	updateData: WorkflowEntity,
): Promise<void> {
	await Db.collections.Workflow.update(workflowId, updateData);
}

export function hasStartNode(workflow: WorkflowEntity): boolean {
	return !(
		!workflow.nodes.length || !workflow.nodes.find((node) => node.type === 'n8n-nodes-base.start')
	);
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
