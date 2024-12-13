import { DataSource } from '@n8n/typeorm';
import { type IExecuteFunctions } from 'n8n-workflow';

export async function getPostgresDataSource(this: IExecuteFunctions): Promise<DataSource> {
	const credentials = await this.getCredentials('postgres');

	const dataSource = new DataSource({
		type: 'postgres',
		host: credentials.host as string,
		port: credentials.port as number,
		username: credentials.user as string,
		password: credentials.password as string,
		database: credentials.database as string,
	});

	if (credentials.allowUnauthorizedCerts === true) {
		dataSource.setOptions({
			ssl: {
				rejectUnauthorized: true,
			},
		});
	} else {
		dataSource.setOptions({
			ssl: !['disable', undefined].includes(credentials.ssl as string | undefined),
		});
	}

	return dataSource;
}
