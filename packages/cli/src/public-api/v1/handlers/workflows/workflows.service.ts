import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { WorkflowEntity, WorkflowTagMapping, TagRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { type Scope, type WorkflowSharingRole } from '@n8n/permissions';
import type { WorkflowId } from 'n8n-workflow';

import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

export async function getSharedWorkflowIds(
	user: User,
	scopes: Scope[],
	projectId?: string,
): Promise<string[]> {
	return await Container.get(WorkflowSharingService).getSharedWorkflowIds(user, {
		scopes,
		projectId,
	});
}

export async function getWorkflowForUser(
	user: User,
	workflowId: string,
): Promise<WorkflowEntity | null> {
	const workflowIds = await getSharedWorkflowIds(user, ['workflow:read']);

	if (!workflowIds.includes(workflowId)) {
		return null;
	}

	const relations: string[] = ['project'];
	if (!Container.get(GlobalConfig).tags.disabled) {
		relations.push('tags');
	}

	return await Container.get(WorkflowRepository).findOne({
		where: { id: workflowId },
		relations,
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
	personalProject: Project,
	role: WorkflowSharingRole,
): Promise<WorkflowEntity> {
	const { manager: dbManager } = Container.get(WorkflowRepository);
	return await dbManager.transaction(async (transactionManager) => {
		const newWorkflow = new WorkflowEntity();
		Object.assign(newWorkflow, workflow);
		newWorkflow.projectId = personalProject.id;
		const savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

		return savedWorkflow;
	});
}

export async function setWorkflowAsActive(workflowId: WorkflowId) {
	await Container.get(WorkflowRepository).update(workflowId, {
		active: true,
		updatedAt: new Date(),
	});
}

export async function setWorkflowAsInactive(workflowId: WorkflowId) {
	return await Container.get(WorkflowRepository).update(workflowId, {
		active: false,
		updatedAt: new Date(),
	});
}

export async function deleteWorkflow(workflow: WorkflowEntity): Promise<WorkflowEntity> {
	return await Container.get(WorkflowRepository).remove(workflow);
}

export async function updateWorkflow(existingWorkflow: WorkflowEntity, updateData: WorkflowEntity) {
	// Keep existing settings and only update ones that were sent
	if (updateData.settings && existingWorkflow.settings) {
		updateData.settings = {
			...existingWorkflow.settings,
			...updateData.settings,
		};
	}
	return await Container.get(WorkflowRepository).update(existingWorkflow.id, updateData);
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

export async function updateTags(workflowId: string, newTags: string[]): Promise<void> {
	const { manager: dbManager } = Container.get(WorkflowRepository);
	await dbManager.transaction(async (transactionManager) => {
		const oldTags = await transactionManager.findBy(WorkflowTagMapping, { workflowId });
		if (oldTags.length > 0) {
			await transactionManager.delete(WorkflowTagMapping, oldTags);
		}
		await transactionManager.insert(
			WorkflowTagMapping,
			newTags.map((tagId) => ({ tagId, workflowId })),
		);
	});
}
