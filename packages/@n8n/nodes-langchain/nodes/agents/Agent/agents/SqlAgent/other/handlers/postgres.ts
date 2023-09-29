import { type IExecuteFunctions } from 'n8n-workflow';
import { DataSource } from 'typeorm';

export async function getPostgresDataSource(this: IExecuteFunctions): Promise<DataSource> {
	const credentials = await this.getCredentials('postgres');

	const dataSource = new DataSource({
		type: 'postgres',
		host: credentials.host as string,
		port: credentials.port as number,
		username: credentials.user as string,
		password: credentials.password as string,
		database: credentials.database as string,
		ssl: {
			rejectUnauthorized: !(credentials.allowUnauthorizedCerts as boolean),
		},
	});

	return dataSource;
}
