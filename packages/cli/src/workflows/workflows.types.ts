import type { IUser } from 'n8n-workflow';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';

export interface WorkflowWithSharingsAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
	usedCredentials?: CredentialUsedByWorkflow[];
	shared?: SharedWorkflow[];
}

export interface CredentialUsedByWorkflow {
	id: string;
	name: string;
	currentUserHasAccess: boolean;
}
