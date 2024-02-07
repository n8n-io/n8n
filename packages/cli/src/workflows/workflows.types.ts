import type { IUser } from 'n8n-workflow';
import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';

export interface WorkflowWithSharingsAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
	usedCredentials?: CredentialUsedByWorkflow[];
	shared?: SharedWorkflow[];
}

export interface CredentialUsedByWorkflow {
	id: string;
	name: string;
	type?: string;
	currentUserHasAccess: boolean;
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
}
