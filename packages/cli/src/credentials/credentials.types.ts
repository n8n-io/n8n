import type { User } from '../databases/entities/User';

export type Permissions = {
	[credentialId: string]: { ownedBy?: User; sharedWith?: Array<Partial<User>> };
};
