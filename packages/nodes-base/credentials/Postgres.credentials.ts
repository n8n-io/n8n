/* eslint-disable no-restricted-syntax */
import type { ICredentialType } from 'n8n-workflow';
import { z } from 'zod';
import { sshTunnelProperties } from '@utils/sshTunnel.properties';
import { toNodeProperties } from '@utils/CredentialSchema';

enum SSLOption {
	Allow = 'allow',
	Disable = 'disable',
	Require = 'require',
}

enum SSLAuthOption {
	Password = 'password',
	'Private Key' = 'privateKey',
}

export const PostgresCredentialSchema = z.object({
	host: z.string().displayName('Host').default('localhost'),
	database: z.string().displayName('Database').default('postgres'),
	user: z.string().displayName('User').default('postgres'),
	password: z.string().displayName('Password').sensitive().optional(),
	allowUnauthorizedCerts: z
		.boolean()
		.describe('Whether to connect even if SSL certificate validation is not possible')
		.displayName('Ignore SSL Issues')
		.default(false),
	ssl: z
		.nativeEnum(SSLOption)
		.displayOptions({
			show: {
				allowUnauthorizedCerts: [false],
			},
		})
		.displayName('SSL')
		.default(SSLOption.Disable),
	port: z.number().gt(0).displayName('Port').default(5432),
	sshTunnel: z.boolean().displayName('SSH Tunnel').default(false),
	sshAuthenticateWith: z
		.nativeEnum(SSLAuthOption)
		.displayName('SSH Authenticate with')
		.displayOptions({
			show: {
				sshTunnel: [true],
			},
		})
		.default(SSLAuthOption.Password),
	sshHost: z
		.string()
		.displayName('SSH Host')
		.displayOptions({
			show: {
				sshTunnel: [true],
			},
		})
		.default('localhost'),
	sshPort: z
		.number()
		.displayName('SSH Port')
		.displayOptions({
			show: {
				sshTunnel: [true],
			},
		})
		.default(22),
	sshPostgresPort: z
		.number()
		.displayName('SSH Postgres Port')
		.displayOptions({
			show: {
				sshTunnel: [true],
			},
		})
		.default(5432),
	sshUser: z
		.string()
		.displayName('SSH User')
		.displayOptions({
			show: {
				sshTunnel: [true],
			},
		})
		.default('root'),
	sshPassword: z
		.string()
		.sensitive()
		.displayName('SSH Password')
		.displayOptions({
			show: {
				sshTunnel: [true],
				sshAuthenticateWith: ['password'],
			},
		})
		.optional(),
	privateKey: z
		.string()
		.displayName('Private Key')
		.sensitive()
		.editorRows(4)
		.displayOptions({
			show: {
				sshTunnel: [true],
				sshAuthenticateWith: ['privateKey'],
			},
		})
		.optional(),
	passphrase: z
		.string()
		.describe('Passphrase used to create the key, if no passphrase was used leave empty')
		.displayName('Passphrase')
		.displayOptions({
			show: {
				sshTunnel: [true],
				sshAuthenticateWith: ['privateKey'],
			},
		})
		.optional(),
});

export type PostgresCredentialType = z.infer<typeof PostgresCredentialSchema>;

export class Postgres implements ICredentialType {
	name = 'postgres';

	displayName = 'Postgres';

	documentationUrl = 'postgres';

	properties = {
		...toNodeProperties(PostgresCredentialSchema),
		...sshTunnelProperties,
	};

	schema = PostgresCredentialSchema;
}
