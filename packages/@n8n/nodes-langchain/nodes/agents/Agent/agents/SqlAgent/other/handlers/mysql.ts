import { type IExecuteFunctions } from 'n8n-workflow';
import { DataSource } from '@n8n/typeorm';

export async function getMysqlDataSource(this: IExecuteFunctions): Promise<DataSource> {
	const credentials = await this.getCredentials('mySql');

	const dataSource = new DataSource({
		type: 'mysql',
		host: credentials.host as string,
		port: credentials.port as number,
		username: credentials.user as string,
		password: credentials.password as string,
		database: credentials.database as string,
	});

	if (credentials.ssl === true) {
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
