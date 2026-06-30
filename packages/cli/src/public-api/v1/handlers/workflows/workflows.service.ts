import { GlobalConfig } from '@n8n/config';
import type { SharedWorkflow, User, WorkflowEntity } from '@n8n/db';
import {
	WorkflowTagMapping,
	TagRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';

import { License } from '@/license';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
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
			projectRoles: [PROJECT_OWNER_ROLE_SLUG],
			projectId,
		});
	}
}

export async function getSharedWorkflow(
	user: User,
	workflowId?: string,
): Promise<SharedWorkflow | null> {
	return await Container.get(SharedWorkflowRepository).findOne({
		where: {
			...(!hasGlobalScope(user, ['workflow:read']) && { userId: user.id }),
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
	user: User,
	body: WorkflowEntity & { projectId?: string },
): Promise<WorkflowEntity> {
	const { projectId, ...rest } = body;
	const workflow = createWorkflowEntityFromPayload(rest);

	// A policy supplied via the API is explicit intent, so a below-floor value is
	// rejected (422) rather than silently seeded up to the floor — matching the
	// update endpoint. An absent policy is left for WorkflowCreationService to seed.
	await Container.get(RedactionEnforcementService).assertNewPolicyAllowed(
		workflow.settings?.redactionPolicy,
	);

	return await Container.get(WorkflowCreationService).createWorkflow(user, workflow, {
		projectId,
		publicApi: true,
		source: 'api',
	});
}

export async function deleteWorkflow(workflow: WorkflowEntity): Promise<WorkflowEntity> {
	return await Container.get(WorkflowRepository).remove(workflow);
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
	const { manager: dbManager } = Container.get(SharedWorkflowRepository);
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
