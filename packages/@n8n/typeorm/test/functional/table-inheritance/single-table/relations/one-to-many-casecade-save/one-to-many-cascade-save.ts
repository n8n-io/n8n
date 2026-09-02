import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../../utils/test-utils';
import { expect } from 'chai';
import { DataSource } from '../../../../../../src/data-source/DataSource';
import { Faculty } from './entity/Faculty';
import { Professor } from './entity/Professor';
import { Researcher } from './entity/Researcher';

describe('table-inheritance > single-table > relations > one-to-many-cascade-save', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work correctly with OneToMany relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				// -------------------------------------------------------------------------
				// Create
				// -------------------------------------------------------------------------

				const researcher = new Researcher('Economics');
				await connection.getRepository(Researcher).save(researcher);

				const faculty1 = new Faculty();
				faculty1.name = 'Economics';
				faculty1.staff = [new Professor('Economics 101'), researcher];
				await connection.getRepository(Faculty).save(faculty1);

				const loadedFaculty = await connection
					.getRepository(Faculty)
					.findOneByOrFail({ id: faculty1.id });

				expect(loadedFaculty.staff.find((staff) => staff.type === 'PROFESSOR')).to.not.be.undefined;
				expect(loadedFaculty.staff.find((staff) => staff.type === 'RESEARCHER')).to.not.be
					.undefined;
			}),
		));
});
