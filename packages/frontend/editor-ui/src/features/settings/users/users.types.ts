import type { IUser } from '@n8n/rest-api-client/api/users';
import type { Role, ROLE } from '@n8n/api-types';

export type ILogInStatus = 'LoggedIn' | 'LoggedOut';

export type InvitableRoleName = (typeof ROLE)['Member' | 'Admin' | 'ChatUser'];

export interface IInviteResponse {
	user: {
		id: string;
		email: string;
		emailSent: boolean;
		inviteAcceptUrl: string;
		role: Role;
	};
	error?: string;
}

export interface IUserListAction {
	label: string;
	value: string;
	guard?: (user: IUser) => boolean;
}
