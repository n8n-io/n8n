import type { IUser } from 'n8n-workflow';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';

export interface WorkflowWithSharingsAndCredentials extends WorkflowEntity {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
	usedCredentials?: CredentialUsedByWorkflow[];
}

export interface CredentialUsedByWorkflow {
	id: string;
	name: string;
	userHasAccess: boolean;
}
