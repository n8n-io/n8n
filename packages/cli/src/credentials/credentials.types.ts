import type { IUser } from 'n8n-workflow';
import type { ICredentialsDb } from '../Interfaces';

export interface CredentialWithSharings extends ICredentialsDb {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
}
