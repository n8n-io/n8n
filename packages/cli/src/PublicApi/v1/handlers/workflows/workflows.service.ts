import { Container } from 'typedi';
import * as Db from '@/Db';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { WorkflowTagMapping } from '@db/entities/WorkflowTagMapping';
import { SharedWorkflow, type WorkflowSharingRole } from '@db/entities/SharedWorkflow';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { Project } from '@/databases/entities/Project';
import { TagRepository } from '@db/repositories/tag.repository';
import { License } from '@/License';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import type { Scope } from '@n8n/permissions';
import config from '@/config';

function insertIf(condition: boolean, elements: string[]): string[] {
	return condition ? elements : [];
}

export async function getSharedWorkflowIds(user: User, scopes: Scope[]): Promise<string[]> {
	if (Container.get(License).isSharingEnabled()) {
		return await Container.get(WorkflowSharingService).getSharedWorkflowIds(user, {
			scopes,
		});
	} else {
		return await Container.get(WorkflowSharingService).getSharedWorkflowIds(user, {
			workflowRoles: ['workflow:owner'],
			projectRoles: ['project:personalOwner'],
		});
	}
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
	personalProject: Project,
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
			project: personalProject,
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
