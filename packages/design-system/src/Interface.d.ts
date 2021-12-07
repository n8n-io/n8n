export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	globalRole: {
		name: string;
		id: string;
	};
}
