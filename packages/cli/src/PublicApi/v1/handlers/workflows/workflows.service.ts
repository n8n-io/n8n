import * as Db from '@/Db';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { Role } from '@db/entities/Role';
import config from '@/config';
import Container from 'typedi';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';

function insertIf(condition: boolean, elements: string[]): string[] {
	return condition ? elements : [];
}

export async function getSharedWorkflowIds(user: User): Promise<string[]> {
	const where = ['owner', 'admin'].includes(user.globalRole.name) ? {} : { userId: user.id };
	const sharedWorkflows = await Container.get(SharedWorkflowRepository).find({
		where,
		select: ['workflowId'],
	});
	return sharedWorkflows.map(({ workflowId }) => workflowId);
}

export async function getSharedWorkflow(
	user: User,
	workflowId?: string | undefined,
): Promise<SharedWorkflow | null> {
	return Container.get(SharedWorkflowRepository).findOne({
		where: {
			...(!['owner', 'admin'].includes(user.globalRole.name) && { userId: user.id }),
			...(workflowId && { workflowId }),
		},
		relations: [...insertIf(!config.getEnv('workflowTagsDisabled'), ['workflow.tags']), 'workflow'],
	});
}

export async function getWorkflowById(id: string): Promise<WorkflowEntity | null> {
	return Container.get(WorkflowRepository).findOne({
		where: { id },
	});
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

export async function setWorkflowAsActive(workflow: WorkflowEntity) {
	await Container.get(WorkflowRepository).update(workflow.id, {
		active: true,
		updatedAt: new Date(),
	});
}

export async function setWorkflowAsInactive(workflow: WorkflowEntity) {
	return Container.get(WorkflowRepository).update(workflow.id, {
		active: false,
		updatedAt: new Date(),
	});
}

export async function deleteWorkflow(workflow: WorkflowEntity): Promise<WorkflowEntity> {
	return Container.get(WorkflowRepository).remove(workflow);
}

export async function updateWorkflow(workflowId: string, updateData: WorkflowEntity) {
	return Container.get(WorkflowRepository).update(workflowId, updateData);
}

export function parseTagNames(tags: string): string[] {
	return tags.split(',').map((tag) => tag.trim());
}
