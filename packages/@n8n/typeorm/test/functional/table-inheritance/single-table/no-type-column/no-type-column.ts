import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src';
import { Author } from './entity/Author';
import { Employee } from './entity/Employee';
import { PostItNote } from './entity/PostItNote';
import { StickyNote } from './entity/StickyNote';

describe('table-inheritance > single-table > no-type-column', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return subclass in relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postItRepo = connection.getRepository(PostItNote);
				const stickyRepo = connection.getRepository(StickyNote);

				// -------------------------------------------------------------------------
				// Create
				// -------------------------------------------------------------------------

				const employee = new Employee();
				employee.name = 'alicefoo';
				employee.employeeName = 'Alice Foo';
				await connection.getRepository(Employee).save(employee);

				const author = new Author();
				author.name = 'bobbar';
				author.authorName = 'Bob Bar';
				await connection.getRepository(Author).save(author);

				await postItRepo.insert({
					postItNoteLabel: 'A post-it note',
					owner: employee,
				} as PostItNote);
				await stickyRepo.insert({
					stickyNoteLabel: 'A sticky note',
					owner: author,
				} as StickyNote);

				// -------------------------------------------------------------------------
				// Select
				// -------------------------------------------------------------------------

				const [postIt] = await postItRepo.find({
					relations: { owner: true },
				});

				postIt.owner.should.be.an.instanceOf(Employee);
				postIt.owner.name.should.be.equal('alicefoo');
				postIt.owner.employeeName.should.be.equal('Alice Foo');

				const [sticky] = await stickyRepo.find({
					relations: { owner: true },
				});

				sticky.owner.should.be.an.instanceOf(Author);
				sticky.owner.name.should.be.equal('bobbar');
				sticky.owner.authorName.should.be.equal('Bob Bar');
			}),
		));
});
