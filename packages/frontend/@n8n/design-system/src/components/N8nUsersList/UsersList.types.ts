import type { IUser, UserAction } from '../../types';

export interface UsersListProps<UserType extends IUser = IUser> {
	users: UserType[];
	readonly?: boolean;
	currentUserId?: string | null;
	actions?: Array<UserAction<UserType>>;
	isSamlLoginEnabled?: boolean;
}
