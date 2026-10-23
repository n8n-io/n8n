import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { UserError, type ICredentialDataDecryptedObject } from 'n8n-workflow';

export function getGoogleServiceAccountCredentials(credentials: ICredentialDataDecryptedObject): {
	client_email: string;
	private_key: string;
} {
	const { email, privateKey } = credentials;
	if (
		typeof email !== 'string' ||
		!email.trim() ||
		typeof privateKey !== 'string' ||
		!privateKey.trim()
	) {
		throw new UserError('Enter a service account email and private key.');
	}

	return { client_email: email.trim(), private_key: formatPemBlock(privateKey) };
}
