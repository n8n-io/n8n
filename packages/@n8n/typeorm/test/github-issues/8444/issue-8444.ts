import 'reflect-metadata';
import { expect } from 'chai';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { StrictlyInitializedEntity } from './entity/StrictlyInitializedEntity';
import { DataSource } from '../../../src';

describe('github issues > #8444 entitySkipConstructor not working', () => {
	describe('without entitySkipConstructor', () => {
		it("createTestingConnections should fail with 'someColumn cannot be undefined.'", async () => {
			async function bootstrapWithoutEntitySkipConstructor(): Promise<DataSource[]> {
				return await createTestingConnections({
					driverSpecific: {
						entitySkipConstructor: false,
					},
					entities: [StrictlyInitializedEntity],
					schemaCreate: true,
					dropSchema: true,
				});
			}

			try {
				const dataSources = await bootstrapWithoutEntitySkipConstructor();
				// if we have zero data sources - it means we are testing in mongodb-only mode - we are fine here
				// if we have any data sources - it means test didn't go as we expected
				if (dataSources.length > 0) {
					expect(true).to.be.false;
				}
			} catch (err) {
				expect(err.message).to.contain('someColumn cannot be undefined');
			}
		});
	});

	describe('with entitySkipConstructor', () => {
		let connections: DataSource[] = [];
		afterEach(() => closeTestingConnections(connections));

		it('createTestingConnections should succeed', async () => {
			connections = await createTestingConnections({
				driverSpecific: {
					entitySkipConstructor: true,
				},
				entities: [StrictlyInitializedEntity],
				schemaCreate: true,
				dropSchema: true,
			});
		});
	});
});
