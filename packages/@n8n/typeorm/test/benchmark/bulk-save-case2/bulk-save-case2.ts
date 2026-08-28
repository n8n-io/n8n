import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Document } from './entity/Document';

describe('benchmark > bulk-save > case2', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('testing bulk save of 10000 objects', () =>
		Promise.all(
			connections.map(async (connection) => {
				const documents: Document[] = [];
				for (let i = 0; i < 10000; i++) {
					const document = new Document();

					document.id = i.toString();
					document.docId = 'label/' + i;
					document.context =
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vel faucibus nunc. Etiam volutpat vel urna in scelerisque. Cras a erat ipsum. ';
					document.label = 'label/' + i;
					document.distributions = [
						{
							weight: '0.9',
							id: i,
							docId: i,
						},
						{
							weight: '0.23123',
							id: i,
							docId: i,
						},
						{
							weight: '0.12312',
							id: i,
							docId: i,
						},
					];
					document.date = new Date();

					documents.push(document);
					// await connection.manager.save(document);
					// await connection.manager.insert(Document, document);
				}

				await connection.manager.save(documents);
				// await connection.manager.insert(Document, documents);
			}),
		));
});
