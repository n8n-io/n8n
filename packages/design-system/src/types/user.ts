export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	email?: string;
	isPendingUser: boolean;
	isOwner: boolean;
}
