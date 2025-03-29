import { DataSource } from '@n8n/typeorm';
import type { OracleNodeCredentials } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/v2/helpers/interfaces';
import { type IExecuteFunctions } from 'n8n-workflow';
import type { TlsOptions } from 'tls';

export async function getOracleDBDataSource(this: IExecuteFunctions): Promise<DataSource> {
	const credentials = await this.getCredentials<OracleDBNodeCredentials>('postgres');

	let ssl: TlsOptions | boolean = !['disable', undefined].includes(credentials.ssl);
	if (credentials.allowUnauthorizedCerts && ssl) {
		ssl = { rejectUnauthorized: false };
	}

	return new DataSource({
		type: 'oracledb',
		host: credentials.host,
		port: credentials.port,
		username: credentials.user,
		password: credentials.password,
		database: credentials.database,
		ssl,
	});
}
