export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	email?: string;
	isOwner: boolean;
	isPendingUser: boolean;
	inviteAcceptUrl?: string;
	disabled: boolean;
	signInType: string;
}

export interface UserAction {
	label: string;
	value: string;
	disabled: boolean;
	type?: 'external-link';
	guard?: (user: IUser) => boolean;
}
