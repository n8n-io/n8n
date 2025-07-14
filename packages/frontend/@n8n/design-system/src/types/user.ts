export type IUser = {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	fullName?: string;
	role?: string;
	email?: string | null;
	signInType?: string;
	isOwner?: boolean;
	isPendingUser?: boolean;
	inviteAcceptUrl?: string;
	disabled?: boolean;
	mfaEnabled?: boolean;
};

export interface UserAction<UserType extends IUser> {
	label: string;
	value: string;
	disabled?: boolean;
	type?: 'external-link';
	tooltip?: string;
	guard?: (user: UserType) => boolean;
}

export type UserStackGroups = { [groupName: string]: IUser[] };
