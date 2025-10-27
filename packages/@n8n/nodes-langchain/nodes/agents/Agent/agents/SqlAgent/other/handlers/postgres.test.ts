import { mock } from 'jest-mock-extended';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/nodes/Postgres/v2/helpers/interfaces';
import type { IExecuteFunctions } from 'n8n-workflow';

import { getPostgresDataSource } from './postgres';

describe('Postgres SSL settings', () => {
	const credentials = mock<PostgresNodeCredentials>({
		host: 'localhost',
		port: 5432,
		user: 'user',
		password: 'password',
		database: 'database',
	});

	test('ssl is disabled + allowUnauthorizedCerts is false', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'disable',
				allowUnauthorizedCerts: false,
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: false,
		});
	});

	test('ssl is disabled + allowUnauthorizedCerts is true', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'disable',
				allowUnauthorizedCerts: true,
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: false,
		});
	});

	test('ssl is disabled + allowUnauthorizedCerts is undefined', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'disable',
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: false,
		});
	});

	test('ssl is allow + allowUnauthorizedCerts is false', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'allow',
				allowUnauthorizedCerts: false,
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: true,
		});
	});

	test('ssl is allow + allowUnauthorizedCerts is true', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'allow',
				allowUnauthorizedCerts: true,
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: { rejectUnauthorized: false },
		});
	});

	test('ssl is allow + allowUnauthorizedCerts is undefined', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'allow',
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: true,
		});
	});

	test('ssl is require + allowUnauthorizedCerts is false', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'require',
				allowUnauthorizedCerts: false,
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: true,
		});
	});

	test('ssl is require + allowUnauthorizedCerts is true', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'require',
				allowUnauthorizedCerts: true,
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: { rejectUnauthorized: false },
		});
	});

	test('ssl is require + allowUnauthorizedCerts is undefined', async () => {
		const context = mock<IExecuteFunctions>({
			getCredentials: jest.fn().mockReturnValue({
				...credentials,
				ssl: 'require',
			}),
		});

		const dataSource = await getPostgresDataSource.call(context);

		expect(dataSource.options).toMatchObject({
			ssl: true,
		});
	});
});
