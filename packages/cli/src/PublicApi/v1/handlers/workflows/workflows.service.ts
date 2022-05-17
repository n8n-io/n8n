import type { INode } from 'n8n-workflow';
import { FindManyOptions } from 'typeorm';
import { User } from '../../../../databases/entities/User';
import { WorkflowEntity } from '../../../../databases/entities/WorkflowEntity';
import { Db, InternalHooksManager } from '../../../..';
import { SharedWorkflow } from '../../../../databases/entities/SharedWorkflow';
import { isInstanceOwner } from '../users/users.service';
import { externalHooks } from '../../../../Server';
import { Role } from '../../../../databases/entities/Role';

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

export async function createWorkflow(
	workflow: WorkflowEntity,
	user: User,
	role: Role,
): Promise<WorkflowEntity> {
	let savedWorkflow: unknown;
	await Db.transaction(async (transactionManager) => {
		const newWorkflow = new WorkflowEntity();
		Object.assign(newWorkflow, workflow);
		savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);
		const newSharedWorkflow = new SharedWorkflow();
		Object.assign(newSharedWorkflow, {
			role,
			user,
			workflow: savedWorkflow,
		});
		await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
		await externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowCreated(user.id, newWorkflow, true);
	});
	return savedWorkflow as WorkflowEntity;
}

export async function activeWorkflow(workflow: WorkflowEntity): Promise<void> {
	await Db.collections.Workflow.update(workflow.id, { active: true, updatedAt: new Date() });
}

export async function desactiveWorkflow(workflow: WorkflowEntity): Promise<void> {
	await Db.collections.Workflow.update(workflow.id, { active: false, updatedAt: new Date() });
}

export async function deleteWorkflow(workflow: WorkflowEntity, user: User): Promise<void> {
	await Db.collections.Workflow.remove(workflow);
	void InternalHooksManager.getInstance().onWorkflowDeleted(user.id, workflow.id.toString(), true);
	await externalHooks.run('workflow.afterDelete', [workflow.id.toString()]);
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
	user: User,
): Promise<void> {
	await Db.collections.Workflow.update(workflowId, updateData);
	await externalHooks.run('workflow.afterUpdate', [updateData]);
	void InternalHooksManager.getInstance().onWorkflowSaved(user.id, updateData, true);
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
