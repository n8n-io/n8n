import type { ICredentialsDb, IUser } from '../Interfaces';

export interface CredentialWithSharings extends ICredentialsDb {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
}
