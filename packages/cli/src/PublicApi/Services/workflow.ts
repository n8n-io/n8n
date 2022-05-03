import { User } from '../../databases/entities/User';
import { WorkflowEntity } from '../../databases/entities/WorkflowEntity';
import { Db } from '../..';
import type { INode } from 'n8n-workflow';

export async function getSharedWorkflowIds(user: User): Promise<number[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: {
			user,
		},
	});
	return sharedWorkflows.map((workflow) => workflow.workflowId);
}

export async function getWorkflowAccess(
	user: User,
	workflowId: string | undefined,
): Promise<boolean> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		where: {
			user,
			workflow: { id: workflowId },
		},
	});
	return !!sharedWorkflows.length;
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
	await Db.collections.Workflow.update(workflow.id, { active: true });
}

export async function desactiveWorkflow(workflow: WorkflowEntity): Promise<void> {
	await Db.collections.Workflow.update(workflow.id, { active: false });
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
