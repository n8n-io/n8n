import { DataSource } from '@n8n/typeorm';
import type {
	PostgresNodeCredentials,
	PostgresNodeSSLOptions,
} from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import { type IExecuteFunctions } from 'n8n-workflow';
import { type TlsOptions, type ConnectionOptions } from 'tls';

export async function getPostgresDataSource(this: IExecuteFunctions): Promise<DataSource> {
	const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');

	let ssl: ConnectionOptions | boolean = !['disable', undefined].includes(credentials.ssl);
	if (ssl) {
		const sslOpts: ConnectionOptions = {};

		const { caCert, clientCert, clientKey, allowUnauthorizedCerts, servername } =
			credentials as PostgresNodeSSLOptions;
		if (caCert) {
			sslOpts.ca = caCert;
		}
		if (clientCert) {
			sslOpts.cert = clientCert;
		}
		if (clientKey) {
			sslOpts.key = clientKey;
		}
		if (allowUnauthorizedCerts === true) {
			sslOpts.rejectUnauthorized = false;
		}
		if (servername) {
			sslOpts.servername = servername;
		}

		if (Object.keys(sslOpts).length > 0) {
			ssl = sslOpts;
		}
	}

	return new DataSource({
		type: 'postgres',
		host: credentials.host,
		port: credentials.port,
		username: credentials.user,
		password: credentials.password,
		database: credentials.database,
		// typeorm incorrectly types this for the TLSSocket constructor options instead of tls.connect options
		ssl: ssl as boolean | TlsOptions,
	});
}
