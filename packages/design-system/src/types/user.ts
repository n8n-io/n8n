export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	isPending: boolean;
	isOwner: boolean;
}
