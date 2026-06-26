import '../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { User } from './entity/User';
import { DataSource } from '../../../src';
import { expect } from 'chai';

describe('custom repository', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [User],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('withRepository must work properly in transactions', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const CustomRepository = dataSource.getRepository(User).extend({
					findOneByName(name: string) {
						return this.findOneBy({ name });
					},
				});

				// check if custom repository function works
				await CustomRepository.save({ name: 'Timber Saw' });
				const user = await CustomRepository.findOneByName('Timber Saw');
				expect(user).to.be.eql({
					id: 1,
					name: 'Timber Saw',
				});

				// now check it in the transaction
				await dataSource.manager.transaction(async (transactionalManager) => {
					const transactionalCustomRepository =
						await transactionalManager.withRepository(CustomRepository);
					await transactionalCustomRepository.save({
						name: 'Natures Prophet',
					});
					const user = await transactionalCustomRepository.findOneByName('Natures Prophet');
					expect(user).to.be.eql({
						id: 2,
						name: 'Natures Prophet',
					});
				});
			}),
		));
});
