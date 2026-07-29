import type { AssignableGlobalRole } from '@n8n/permissions';
import type { IUser } from '@n8n/rest-api-client/api/users';

export type ILogInStatus = 'LoggedIn' | 'LoggedOut';

// Any global role that can be assigned to a user (system roles except owner, plus custom instance roles).
export type InvitableRoleName = AssignableGlobalRole;

// `IInviteResponse` moved to `@n8n/stores/invitation.api` alongside the invitation
// API; re-exported here so existing importers stay unchanged.
export type { IInviteResponse } from '@n8n/stores/invitation.api';

export interface IUserListAction {
	label: string;
	value: string;
	guard?: (user: IUser) => boolean;
}
