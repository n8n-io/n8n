import type {
	CurrentUserResponse,
	IInviteResponse,
	IRestApiContext,
	InvitableRoleName,
} from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { makeRestApiRequest } from '@/utils/apiUtils';

type AcceptInvitationParams = {
	inviterId: string;
	inviteeId: string;
	firstName: string;
	lastName: string;
	password: string;
};

export async function inviteUsers(
	context: IRestApiContext,
	params: Array<{ email: string; role: InvitableRoleName }>,
) {
	return makeRestApiRequest<IInviteResponse[]>(context, 'POST', '/invitations', params);
}

export async function acceptInvitation(context: IRestApiContext, params: AcceptInvitationParams) {
	const { inviteeId, ...props } = params;
	return makeRestApiRequest<CurrentUserResponse>(
		context,
		'POST',
		`/invitations/${params.inviteeId}/accept`,
		props as unknown as IDataObject,
	);
}
