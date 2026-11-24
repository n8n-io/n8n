import '../../utils/test-setup';
import { createDataSource, setupTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';
import { expect } from 'chai';
import { DataSource } from '../../../src';

describe('base entity', () => {
	it('test if DataSource calls `useDataSource` of the provided entities', async () => {
		let dataSource: DataSource | undefined;
		try {
			const dataSourceOptions = setupTestingConnections({
				entities: [User],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			});
			if (!dataSourceOptions.length) return;

			// reset data source just to make sure inside DataSource it's really being set
			User.useDataSource(null);

			dataSource = new DataSource(dataSourceOptions[0]);
			await dataSource.initialize();
			await dataSource.synchronize(true);

			await User.save({ name: 'Timber Saw' });
			const timber = await User.findOneByOrFail({ name: 'Timber Saw' });
			expect(timber).to.be.eql({
				id: 1,
				name: 'Timber Saw',
			});
		} finally {
			if (dataSource) {
				await dataSource.destroy();
			}
		}
	});

	it('test if DataSource calls `useDataSource` of the provided entities in the entities directory', async () => {
		let dataSource: DataSource | undefined;
		try {
			const dataSourceOptions = setupTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			});
			if (!dataSourceOptions.length) return;

			// reset data source just to make sure inside DataSource it's really being set
			User.useDataSource(null);

			dataSource = createDataSource(dataSourceOptions[0]);
			await dataSource.initialize();
			await dataSource.synchronize(true);

			await User.save({ name: 'Timber Saw' });
			const timber = await User.findOneByOrFail({ name: 'Timber Saw' });
			expect(timber).to.be.eql({
				id: 1,
				name: 'Timber Saw',
			});
		} finally {
			if (dataSource) {
				await dataSource.destroy();
			}
		}
	});
});
