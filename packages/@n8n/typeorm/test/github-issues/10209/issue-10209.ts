import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { LocationEntity } from './entity/location';
import { ConfigurationEntity, ConfigurationStatus } from './entity/configuration';
import { AssetEntity, AssetStatus } from './entity/asset';

describe('github issues > #10209', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				// This test does not work on sqlite because it does not
				// support nested transactions reliably. The fix and the test
				// were even reverted upstream:
				// https://github.com/typeorm/typeorm/pull/11264
				disabledDrivers: ['sqlite-pooled', 'sqlite'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should not fail to run multiple nested transactions in parallel', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const manager = dataSource.createEntityManager();

				await manager.transaction(async (txManager) => {
					const location = txManager.create(LocationEntity);
					location.name = 'location-0';
					location.configurations = [];
					for (let c = 0; c < 3; c++) {
						const config = txManager.create(ConfigurationEntity);
						config.name = `config-${c}`;
						config.status = ConfigurationStatus.new;
						config.assets = [];
						for (let a = 0; a < 5; a++) {
							const asset = txManager.create(AssetEntity);
							asset.name = `asset-${c}-${a}`;
							asset.status = AssetStatus.new;
							config.assets.push(asset);
						}
						location.configurations.push(config);
					}

					await txManager.save(location);
				});

				const location =
					(await manager.findOne(LocationEntity, {
						where: {
							name: 'location-0',
						},
						relations: ['configurations', 'configurations.assets'],
					})) || ({} as LocationEntity);

				await manager.transaction(async (txManager) => {
					return Promise.all(
						location.configurations.map(async (config) => {
							await txManager.transaction(async (txManager2) => {
								await Promise.all(
									config.assets.map(async (asset) => {
										asset.status = AssetStatus.deleted;
										await txManager2.save(asset);
										await txManager2.softDelete(AssetEntity, asset);
									}),
								);
							});

							config.status = ConfigurationStatus.deleted;
							return await txManager.save(config);
						}),
					);
				});
				// We only care that the transaction above didn't fail
				expect(true).to.be.true;
			}),
		));
});
