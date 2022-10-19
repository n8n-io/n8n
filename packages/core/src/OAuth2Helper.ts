/* eslint-disable @typescript-eslint/naming-convention */
import { ICredentialDataDecryptedObject } from 'n8n-workflow';
import clientOAuth2 from 'client-oauth2';

export const getClientCredentialsToken = async (
	oAuth2Client: clientOAuth2,
	credentials: ICredentialDataDecryptedObject,
): Promise<clientOAuth2.Token> => {
	const options = {};
	if (credentials.authentication === 'body') {
		Object.assign(options, {
			headers: {
				Authorization: '',
			},
			body: {
				client_id: credentials.clientId as string,
				client_secret: credentials.clientSecret as string,
			},
		});
	}
	return oAuth2Client.credentials.getToken(options);
};
