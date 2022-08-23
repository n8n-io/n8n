import type { User } from '../databases/entities/User';
import type { ICredentialsDb } from '../Interfaces';

export type Permissions = {
	[credentialId: string]: { ownedBy?: Partial<User>; sharedWith?: Array<Partial<User>> };
};

export type CredentialWithPermissions = ICredentialsDb & Permissions[string];
