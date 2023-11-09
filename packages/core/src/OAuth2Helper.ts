import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { ClientOAuth2, ClientOAuth2Options, ClientOAuth2Token } from '@n8n/client-oauth2';

export const getClientCredentialsToken = async (
	oAuth2Client: ClientOAuth2,
	credentials: ICredentialDataDecryptedObject,
): Promise<ClientOAuth2Token> => {
	const options = {};
	if (credentials.authentication === 'body') {
		Object.assign(options, {
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Authorization: '',
			},
			body: {
				client_id: credentials.clientId as string,
				client_secret: credentials.clientSecret as string,
			},
		});
	}
	return oAuth2Client.credentials.getToken(options as ClientOAuth2Options);
};
