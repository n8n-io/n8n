import type { IInviteResponse, InvitableRoleName } from './users.types';
import type { CurrentUserResponse } from '@n8n/rest-api-client/api/users';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { IDataObject } from 'n8n-workflow';
import { makeRestApiRequest } from '@n8n/rest-api-client';

type AcceptInvitationParams = {
	token?: string;
	inviterId?: string;
	inviteeId?: string;
	firstName: string;
	lastName: string;
	password: string;
};

export async function inviteUsers(
	context: IRestApiContext,
	params: Array<{ email: string; role: InvitableRoleName }>,
) {
	return await makeRestApiRequest<IInviteResponse[]>(context, 'POST', '/invitations', params);
}

export async function acceptInvitation(context: IRestApiContext, params: AcceptInvitationParams) {
	// Use new /accept endpoint for token-based invitations
	if (params.token) {
		return await makeRestApiRequest<CurrentUserResponse>(
			context,
			'POST',
			'/invitations/accept',
			params as unknown as IDataObject,
		);
	}

	// Use legacy /:id/accept endpoint for inviterId/inviteeId-based invitations
	if (!params.inviteeId) {
		throw new Error('inviteeId is required when not using token');
	}

	const { inviteeId, ...props } = params;
	return await makeRestApiRequest<CurrentUserResponse>(
		context,
		'POST',
		`/invitations/${inviteeId}/accept`,
		props as unknown as IDataObject,
	);
}
