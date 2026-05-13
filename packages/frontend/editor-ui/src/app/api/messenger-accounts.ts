import type { MessengerAccountDto, MessengerPlatform } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function getMessengerAccounts(context: IRestApiContext) {
	return await makeRestApiRequest<MessengerAccountDto[]>(context, 'GET', '/me/messenger-accounts');
}

export async function verifyMessengerCode(context: IRestApiContext, code: string) {
	return await makeRestApiRequest<MessengerAccountDto>(
		context,
		'POST',
		'/me/messenger-accounts/verify',
		{ code },
	);
}

export async function unlinkMessengerAccount(
	context: IRestApiContext,
	platform: MessengerPlatform,
) {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`/me/messenger-accounts/${platform}`,
	);
}
