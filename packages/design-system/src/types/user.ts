export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	email?: string;
	isOwner: boolean;
	isPendingUser: boolean;
}

export interface IUserListAction {
	label: string;
	value: string;
	guard?: (user: IUser) => boolean;
}
