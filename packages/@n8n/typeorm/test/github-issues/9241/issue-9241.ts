import 'reflect-metadata';
import { expect } from 'chai';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource, DeepPartial } from '../../../src';

import { Employee } from './entity/Employee';
import { Photo } from './entity/Photo';

describe('github issues > #9241 Incorrect insert order when cascade inserting parent inherited relations', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should save entities properly', async () => {
		for (const connection of connections) {
			const photos: DeepPartial<Photo>[] = [{ name: 'Photo 1' }, { name: 'Photo 2' }];

			await connection.getRepository(Photo).save(photos);

			const employee: DeepPartial<Employee> = {
				name: 'test name',
				salary: 12345,
				userPhotos: [
					{
						photo: photos[0],
						isProfilePhoto: true,
					},
					{
						photo: photos[1],
						isProfilePhoto: false,
					},
				],
			};

			const employeeRepository = connection.getRepository(Employee);
			const createdEmployee = employeeRepository.create(employee);

			await expect(employeeRepository.save(createdEmployee)).to.eventually.be.fulfilled;
		}
	});
});
