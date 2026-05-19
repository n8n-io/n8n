import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Document } from '../bulk-save-case2/entity/Document';

describe('benchmark > bulk-save > case-querybuilder', () => {
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
					document.date = new Date();

					documents.push(document);
				}

				await connection
					.createQueryRunner()
					.query(
						`CREATE TABLE "document" ("id" text NOT NULL, "docId" text NOT NULL, "label" text NOT NULL, "context" text NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
					);
				await connection.manager
					.createQueryBuilder()
					.insert()
					.into('document', ['id', 'docId', 'label', 'context', 'date'])
					.values(documents)
					.execute();
			}),
		));
});
