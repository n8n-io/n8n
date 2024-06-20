import type { IUser } from 'n8n-workflow';
import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
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
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
}
