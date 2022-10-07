import type { IUser } from 'n8n-workflow';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';

export interface WorkflowWithSharings extends WorkflowEntity {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
}
