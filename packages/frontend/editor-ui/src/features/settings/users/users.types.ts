import type { Role } from '@n8n/api-types';
import type { AssignableGlobalRole } from '@n8n/permissions';
import type { IUser } from '@n8n/rest-api-client/api/users';

export type ILogInStatus = 'LoggedIn' | 'LoggedOut';

// Any global role that can be assigned to a user (system roles except owner, plus custom instance roles).
export type InvitableRoleName = AssignableGlobalRole;

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
