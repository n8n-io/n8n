import type { IUser, UserAction } from '../../types';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface UsersListProps<UserType extends IUser = IUser> {
	users: UserType[];
	readonly?: boolean;
	currentUserId?: string | null;
	actions?: Array<UserAction<UserType>>;
	isSamlLoginEnabled?: boolean;
}
