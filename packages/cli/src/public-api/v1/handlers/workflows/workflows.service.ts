import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { WorkflowId } from 'n8n-workflow';

import type { Project } from '@/databases/entities/project';
import { SharedWorkflow, type WorkflowSharingRole } from '@/databases/entities/shared-workflow';
import type { User } from '@/databases/entities/user';
import { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { WorkflowTagMapping } from '@/databases/entities/workflow-tag-mapping';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import * as Db from '@/db';
import { License } from '@/license';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

function insertIf(condition: boolean, elements: string[]): string[] {
	return condition ? elements : [];
}

export async function getSharedWorkflowIds(
	user: User,
	scopes: Scope[],
	projectId?: string,
): Promise<string[]> {
	if (Container.get(License).isSharingEnabled()) {
		return await Container.get(WorkflowSharingService).getSharedWorkflowIds(user, {
			scopes,
			projectId,
		});
	} else {
		return await Container.get(WorkflowSharingService).getSharedWorkflowIds(user, {
			workflowRoles: ['workflow:owner'],
			projectRoles: ['project:personalOwner'],
			projectId,
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
		relations: [
			...insertIf(!Container.get(GlobalConfig).tags.disabled, ['workflow.tags']),
			'workflow',
		],
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
