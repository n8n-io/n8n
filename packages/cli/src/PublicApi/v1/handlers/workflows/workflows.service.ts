import { Container } from 'typedi';
import * as Db from '@/Db';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { WorkflowTagMapping } from '@db/entities/WorkflowTagMapping';
import { SharedWorkflow, type WorkflowSharingRole } from '@db/entities/SharedWorkflow';
import config from '@/config';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowTagMappingRepository } from '@db/repositories/workflowTagMapping.repository';
import { TagRepository } from '@db/repositories/tag.repository';

function insertIf(condition: boolean, elements: string[]): string[] {
	return condition ? elements : [];
}

export async function getSharedWorkflowIds(user: User): Promise<string[]> {
	const where = ['global:owner', 'global:admin'].includes(user.role) ? {} : { userId: user.id };
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
	return await Container.get(SharedWorkflowRepository).findOne({
		where: {
			...(!['global:owner', 'global:admin'].includes(user.role) && { userId: user.id }),
			...(workflowId && { workflowId }),
		},
		relations: [...insertIf(!config.getEnv('workflowTagsDisabled'), ['workflow.tags']), 'workflow'],
	});
}

export async function getWorkflowById(id: string): Promise<WorkflowEntity | null> {
	return await Container.get(WorkflowRepository).findOne({
		where: { id },
	});
}

export async function createWorkflow(
	workflow: WorkflowEntity,
	user: User,
	role: WorkflowSharingRole,
): Promise<WorkflowEntity> {
	return await Db.transaction(async (transactionManager) => {
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
	return await Container.get(WorkflowRepository).update(workflow.id, {
		active: false,
		updatedAt: new Date(),
	});
}

export async function deleteWorkflow(workflow: WorkflowEntity): Promise<WorkflowEntity> {
	return await Container.get(WorkflowRepository).remove(workflow);
}

export async function updateWorkflow(workflowId: string, updateData: WorkflowEntity) {
	return await Container.get(WorkflowRepository).update(workflowId, updateData);
}

export function parseTagNames(tags: string): string[] {
	return tags.split(',').map((tag) => tag.trim());
}

export async function getWorkflowTags(workflowId: string) {
	return await Container.get(TagRepository).find({
		select: ['id', 'name', 'createdAt', 'updatedAt'],
		where: {
			workflowMappings: {
				...(workflowId && { workflowId }),
			},
		},
	});
}

export async function updateTags(workflowId: string, newTags: string[]): Promise<any> {
	await Db.transaction(async (transactionManager) => {
		const oldTags = await Container.get(WorkflowTagMappingRepository).findBy({
			workflowId,
		});
		if (oldTags.length > 0) {
			await transactionManager.delete(WorkflowTagMapping, oldTags);
		}
		await transactionManager.insert(
			WorkflowTagMapping,
			newTags.map((tagId) => ({ tagId, workflowId })),
		);
	});
}
