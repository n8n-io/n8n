import type { User } from '../databases/entities/User';

export type Permissions = {
	[credentialId: string]: { ownedBy?: Partial<User>; sharedWith?: Array<Partial<User>> };
};
