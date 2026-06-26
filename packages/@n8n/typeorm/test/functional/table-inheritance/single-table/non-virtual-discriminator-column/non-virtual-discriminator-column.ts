import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { Student } from './entity/Student';
import { Employee } from './entity/Employee';
import { Person } from './entity/Person';

describe('table-inheritance > single-table > non-virtual-discriminator-column', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return non virtual discriminator column as well', () =>
		Promise.all(
			connections.map(async (connection) => {
				// -------------------------------------------------------------------------
				// Create
				// -------------------------------------------------------------------------

				const student = new Student();
				student.name = 'Alice';
				student.faculty = 'Economics';
				await connection.getRepository(Student).save(student);

				const employee = new Employee();
				employee.name = 'Roger';
				employee.salary = 1000;
				await connection.getRepository(Employee).save(employee);

				// -------------------------------------------------------------------------
				// Select
				// -------------------------------------------------------------------------

				let persons = await connection.manager
					.createQueryBuilder(Person, 'person')
					.addOrderBy('person.id')
					.getMany();

				persons[0].id.should.be.equal(1);
				persons[0].type.should.be.equal('student-type');
				persons[0].name.should.be.equal('Alice');
				(persons[0] as Student).faculty.should.be.equal('Economics');

				persons[1].id.should.be.equal(2);
				persons[1].type.should.be.equal('employee-type');
				persons[1].name.should.be.equal('Roger');
				(persons[1] as Employee).salary.should.be.equal(1000);
			}),
		));
});
