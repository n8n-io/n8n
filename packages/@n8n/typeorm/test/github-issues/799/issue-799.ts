import 'reflect-metadata';
import * as assert from 'assert';
import rimraf from 'rimraf';
import { dirname } from 'path';
import { DataSource } from '../../../src/data-source/DataSource';
import { getTypeOrmConfig } from '../../utils/test-utils';

describe("github issues > #799 sqlite: 'database' path should be created", () => {
	let dataSource: DataSource | undefined;

	const path = `${__dirname}/tmp/sqlitedb.db`;

	before(() => rimraf(dirname(path)));
	after(() => rimraf(dirname(path)));

	afterEach(async () => {
		if (dataSource && dataSource.isInitialized) {
			await dataSource.destroy();
		}
	});

	it('should create the whole path to database file', async function () {
		// run test only if better-sqlite3 is enabled in ormconfig
		const isEnabled = getTypeOrmConfig().some(
			(conf) => conf.type === 'sqlite' && conf.skip === false,
		);
		if (isEnabled === false) return;

		dataSource = new DataSource({
			name: 'sqlite',
			type: 'sqlite',
			database: path,
		});
		await dataSource.initialize();

		assert.strictEqual(dataSource.isInitialized, true);
	});
});
