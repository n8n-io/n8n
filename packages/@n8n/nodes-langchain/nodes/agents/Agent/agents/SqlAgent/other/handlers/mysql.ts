import { DataSource } from '@n8n/typeorm';
import { type IExecuteFunctions } from 'n8n-workflow';

export async function getMysqlDataSource(this: IExecuteFunctions): Promise<DataSource> {
	const credentials = await this.getCredentials('mySql');

	const dataSource = new DataSource({
		type: 'mysql',
		host: credentials.host as string,
		port: credentials.port as number,
		username: credentials.user as string,
		password: credentials.password as string,
		database: credentials.database as string,
		ssl: {
			rejectUnauthorized: credentials.ssl as boolean,
		},
	});

	return dataSource;
}
