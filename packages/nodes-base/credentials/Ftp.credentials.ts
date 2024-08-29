import type { ICredentialType } from 'n8n-workflow';
import { CredentialSchema, type InferCredentialSchema } from '../utils/CredentialSchema';

const ftpCredentialSchema = CredentialSchema.create({
	host: CredentialSchema.string({ label: 'Host', placeholder: 'localhost' }),
	port: CredentialSchema.number({ label: 'Port', default: 21 }),
	username: CredentialSchema.string({ label: 'Username', optional: true }),
	password: CredentialSchema.password({ optional: true }),
});

export type FtpCredentialSchema = InferCredentialSchema<typeof ftpCredentialSchema>;

export class Ftp implements ICredentialType {
	name = 'ftp';

	displayName = 'FTP';

	documentationUrl = 'ftp';

	properties = ftpCredentialSchema.toNodeProperties();
}
