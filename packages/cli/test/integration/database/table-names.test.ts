import { GlobalConfig } from '@n8n/config';
import * as pluralize from 'pluralize';
import Container from 'typedi';

import * as testDb from '../shared/test-db';

pluralize.addUncountableRule('data');
pluralize.addUncountableRule('metadata');
// "migrations" it's the only table that we keep as plural so ignore it
pluralize.addUncountableRule('migrations');
pluralize.addUncountableRule('statistics');

describe('TableNames', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('Should be singular', async () => {
		// Arrange

		const globalConfig = Container.get(GlobalConfig);
		const tablePrefix = globalConfig.database.tablePrefix;
		const tableNames = await testDb.getTableNames();

		// Assert

		tableNames.forEach((tableName) => {
			const tableNameParts = tableName.replace(tablePrefix, '').split('_');
			tableNameParts.forEach((tableNamePart) => {
				if (!pluralize.isSingular(tableNamePart)) {
					throw Error(
						`Table name "${tableName}" is not singular. Specifically part "${tableNamePart}"`,
					);
				}
			});
		});
	});
});
