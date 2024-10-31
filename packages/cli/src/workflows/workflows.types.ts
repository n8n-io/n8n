import type { SharedWorkflow } from '@/databases/entities/shared-workflow';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { SlimProject } from '@/requests';

export interface WorkflowWithSharingsAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	homeProject?: SlimProject;
	sharedWithProjects?: SlimProject[];
	usedCredentials?: CredentialUsedByWorkflow[];
	shared?: SharedWorkflow[];
}

export interface WorkflowWithSharingsMetaDataAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	homeProject?: SlimProject | null;
	sharedWithProjects: SlimProject[];
	usedCredentials?: CredentialUsedByWorkflow[];
}

export interface CredentialUsedByWorkflow {
	id: string;
	name: string;
	type?: string;
	currentUserHasAccess: boolean;
	homeProject: SlimProject | null;
	sharedWithProjects: SlimProject[];
}
