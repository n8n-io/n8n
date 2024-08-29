import type { ICredentialType } from 'n8n-workflow';
import { CredentialSchema, type InferCredentialSchema } from '../utils/CredentialSchema';

const sftpCredentialSchema = CredentialSchema.create({
	host: CredentialSchema.string({ label: 'Host', placeholder: 'localhost' }),
	port: CredentialSchema.number({ label: 'Port', default: 22 }),
	username: CredentialSchema.string({ label: 'Username' }),
	password: CredentialSchema.password(),
	privateKey: CredentialSchema.password({
		label: 'Private Key',
		description:
			'String that contains a private key for either key-based or hostbased user authentication (OpenSSH format)',
	}),
	passphrase: CredentialSchema.password({
		label: 'Passphrase',
		description: 'For an encrypted private key, this is the passphrase used to decrypt it',
	}),
});

export type SftpCredentialSchema = InferCredentialSchema<typeof sftpCredentialSchema>;

export class Sftp implements ICredentialType {
	name = 'sftp';

	displayName = 'SFTP';

	documentationUrl = 'ftp';

	properties = sftpCredentialSchema.toNodeProperties();
}
