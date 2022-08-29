import type { ICredentialsDb } from '../Interfaces';

export interface CredentialWithSharings extends ICredentialsDb {
	ownedBy?: UserSharingsDetails | null;
	sharedWith?: UserSharingsDetails[];
}

export type UserSharingsDetails = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
};
