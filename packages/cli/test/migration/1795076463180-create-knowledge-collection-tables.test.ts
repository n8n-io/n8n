import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';

const migrationName = 'CreateKnowledgeCollectionTables1795076463180';

const tables = [
	'knowledge_collection',
	'shared_knowledge_collection',
	'knowledge_file',
	'knowledge_vector_store',
	'agent_knowledge_dependency',
];

type Row = Record<string, string | number | boolean | Date | null>;

/** The rows that one fixture creates, by role. */
interface Graph {
	authorId: string;
	ownerProjectId: string;
	shareProjectId: string;
	agentId: string;
	credentialId: string;
	embeddingCredentialId: string;
	sharedCollectionId: string;
	agentCollectionId: string;
	fileId: string;
	storeId: string;
}

const newSlug = () => `kc-${generateNanoId()}`;

describe('CreateKnowledgeCollectionTables migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const initial = createTestMigrationContext(dataSource);
		try {
			await initial.queryRunner.clearDatabase();
		} finally {
			await initial.queryRunner.release();
		}

		await initDbUpToMigration(migrationName);
		await runSingleMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	describe('with the tables in place', () => {
		let context: TestMigrationContext;

		beforeEach(() => {
			context = createTestMigrationContext(dataSource);
		});

		afterEach(async () => {
			await context.queryRunner.release();
		});

		const insertRow = async (tableName: string, values: Row) => {
			const columns = Object.keys(values);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName(tableName)}
				 (${columns.map((name) => context.escape.columnName(name)).join(', ')})
				 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
				values,
			);
		};

		const deleteRow = async (tableName: string, column: string, value: string) => {
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName(tableName)} WHERE ${context.escape.columnName(column)} = :value`,
				{ value },
			);
		};

		const countRows = async (tableName: string, column: string, value: string) => {
			const rows = await context.runQuery<Array<{ count: number | string }>>(
				`SELECT COUNT(*) AS ${context.escape.columnName('count')} FROM ${context.escape.tableName(tableName)}
				 WHERE ${context.escape.columnName(column)} = :value`,
				{ value },
			);
			return Number(rows[0].count);
		};

		/** The value of one column of the row with this id. */
		const readColumn = async (tableName: string, column: string, id: string) => {
			const rows = await context.runQuery<Array<{ value: string | null }>>(
				`SELECT ${context.escape.columnName(column)} AS ${context.escape.columnName('value')}
				 FROM ${context.escape.tableName(tableName)} WHERE ${context.escape.columnName('id')} = :id`,
				{ id },
			);
			return rows.map((row) => row.value);
		};

		const insertUser = async () => {
			const id = randomUUID();
			// Roles go in as parameters: the Postgres helper reads `:word` in a literal as one.
			await insertRow('user', { id, email: `${id}@test.com`, roleSlug: 'global:member' });
			return id;
		};

		const insertProject = async () => {
			const id = randomUUID();
			await insertRow('project', { id, name: 'Knowledge project', type: 'team' });
			return id;
		};

		const insertAgent = async (projectId: string) => {
			const id = randomUUID();
			const identityId = randomUUID();
			await insertRow('user', { id: identityId, kind: 'service', roleSlug: 'global:agent' });
			await insertRow('agents', { id, name: 'Knowledge agent', projectId, identityId });
			return id;
		};

		const insertCredential = async () => {
			const id = generateNanoId();
			await insertRow('credentials_entity', {
				id,
				name: `Credential ${id}`,
				data: 'encrypted',
				type: 'pineconeApi',
			});
			return id;
		};

		const insertSharedCollection = async (ownerProjectId: string, values: Row = {}) => {
			const id = generateNanoId();
			await insertRow('knowledge_collection', {
				id,
				name: `Handbook ${id}`,
				description: 'Use for HR questions',
				slug: newSlug(),
				kind: 'shared',
				projectId: ownerProjectId,
				...values,
			});
			return id;
		};

		const insertAgentCollection = async (agentId: string, values: Row = {}) => {
			const id = generateNanoId();
			await insertRow('knowledge_collection', {
				id,
				name: 'Agent knowledge',
				slug: newSlug(),
				kind: 'agent',
				agentId,
				...values,
			});
			return id;
		};

		const insertShare = async (knowledgeCollectionId: string, projectId: string, role: string) => {
			await insertRow('shared_knowledge_collection', { knowledgeCollectionId, projectId, role });
		};

		const insertFile = async (knowledgeCollectionId: string, values: Row = {}) => {
			const id = generateNanoId();
			await insertRow('knowledge_file', {
				id,
				knowledgeCollectionId,
				name: 'leave-policy.pdf',
				storageKey: `knowledge/${id}`,
				mimeType: 'application/pdf',
				fileSizeBytes: 1024,
				...values,
			});
			return id;
		};

		const insertStore = async (knowledgeCollectionId: string, values: Row = {}) => {
			const id = generateNanoId();
			await insertRow('knowledge_vector_store', {
				id,
				knowledgeCollectionId,
				name: 'policies',
				description: 'Search when the user asks about a policy',
				provider: 'pinecone',
				embeddingModel: 'openai/text-embedding-3-small',
				config: JSON.stringify({ indexName: 'policies' }),
				...values,
			});
			return id;
		};

		/**
		 * One shared collection with an owner row, a user row, a file, a store and an
		 * agent that uses it, and the private collection of that agent.
		 */
		const insertGraph = async (): Promise<Graph> => {
			const authorId = await insertUser();
			const ownerProjectId = await insertProject();
			const shareProjectId = await insertProject();
			const agentId = await insertAgent(ownerProjectId);
			const credentialId = await insertCredential();
			const embeddingCredentialId = await insertCredential();
			const sharedCollectionId = await insertSharedCollection(ownerProjectId, {
				createdById: authorId,
			});
			const agentCollectionId = await insertAgentCollection(agentId);
			await insertShare(sharedCollectionId, ownerProjectId, 'knowledgeCollection:owner');
			await insertShare(sharedCollectionId, shareProjectId, 'knowledgeCollection:user');
			const fileId = await insertFile(sharedCollectionId, { createdById: authorId });
			const storeId = await insertStore(sharedCollectionId, {
				credentialId,
				embeddingCredentialId,
				createdById: authorId,
			});
			await insertRow('agent_knowledge_dependency', {
				agentId,
				knowledgeCollectionId: sharedCollectionId,
			});

			return {
				authorId,
				ownerProjectId,
				shareProjectId,
				agentId,
				credentialId,
				embeddingCredentialId,
				sharedCollectionId,
				agentCollectionId,
				fileId,
				storeId,
			};
		};

		describe('knowledge_collection', () => {
			it('rejects a second collection with the same slug', async () => {
				const projectId = await insertProject();
				const slug = newSlug();
				await insertSharedCollection(projectId, { slug });

				await expect(insertSharedCollection(projectId, { slug })).rejects.toThrow();
			});

			it('rejects a second shared collection with the same name in one project', async () => {
				const projectId = await insertProject();
				const otherProjectId = await insertProject();
				await insertSharedCollection(projectId, { name: 'Handbook' });

				await expect(insertSharedCollection(projectId, { name: 'Handbook' })).rejects.toThrow();
				await expect(
					insertSharedCollection(otherProjectId, { name: 'Handbook' }),
				).resolves.not.toThrow();
			});

			it('rejects a second private collection for one agent', async () => {
				const agentId = await insertAgent(await insertProject());
				await insertAgentCollection(agentId);

				await expect(insertAgentCollection(agentId)).rejects.toThrow();
			});

			it('accepts many agent collections with the same name, which have no project', async () => {
				const projectId = await insertProject();
				const firstId = await insertAgentCollection(await insertAgent(projectId));
				const secondId = await insertAgentCollection(await insertAgent(projectId));

				expect(await countRows('knowledge_collection', 'id', firstId)).toBe(1);
				expect(await countRows('knowledge_collection', 'id', secondId)).toBe(1);
			});

			// Each case breaks one part of CHK_knowledge_collection_owner. The project and
			// the agent exist, so no foreign key rejects the row first.
			it.each<[string, (owners: { projectId: string; agentId: string }) => Row]>([
				[
					'a collection with a project and an agent',
					({ projectId, agentId }) => ({ kind: 'shared', projectId, agentId }),
				],
				['a collection without a project or an agent', () => ({ kind: 'shared' })],
				[
					'an agent collection that a project owns',
					({ projectId }) => ({ kind: 'agent', projectId }),
				],
				['a shared collection that an agent owns', ({ agentId }) => ({ kind: 'shared', agentId })],
				[
					'a global agent collection',
					({ agentId }) => ({ kind: 'agent', agentId, isGlobal: true }),
				],
			])('rejects %s', async (_, collectionColumns) => {
				const projectId = await insertProject();
				const agentId = await insertAgent(projectId);
				const row = {
					id: generateNanoId(),
					name: 'Handbook',
					slug: newSlug(),
					...collectionColumns({ projectId, agentId }),
				};

				await expect(insertRow('knowledge_collection', row)).rejects.toThrow(
					`CHK_${context.tablePrefix}knowledge_collection_owner`,
				);
			});

			it('rejects a collection without a name', async () => {
				const projectId = await insertProject();

				await expect(insertSharedCollection(projectId, { name: null })).rejects.toThrow();
			});

			it('accepts a collection without a description', async () => {
				const id = await insertSharedCollection(await insertProject(), { description: null });

				expect(await countRows('knowledge_collection', 'id', id)).toBe(1);
			});

			it('accepts a kind that the code does not know yet', async () => {
				const id = await insertSharedCollection(await insertProject(), { kind: 'team' });

				expect(await countRows('knowledge_collection', 'id', id)).toBe(1);
			});

			it('accepts a global shared collection', async () => {
				const id = await insertSharedCollection(await insertProject(), { isGlobal: true });

				expect(await countRows('knowledge_collection', 'id', id)).toBe(1);
			});
		});

		describe('shared_knowledge_collection', () => {
			it('rejects a second owner row for one collection and accepts more user rows', async () => {
				const ownerProjectId = await insertProject();
				const otherProjectId = await insertProject();
				const collectionId = await insertSharedCollection(ownerProjectId);
				await insertShare(collectionId, ownerProjectId, 'knowledgeCollection:owner');

				await expect(
					insertShare(collectionId, otherProjectId, 'knowledgeCollection:owner'),
				).rejects.toThrow();
				await expect(
					insertShare(collectionId, otherProjectId, 'knowledgeCollection:user'),
				).resolves.not.toThrow();
			});

			it('accepts a role that the code does not know yet', async () => {
				const projectId = await insertProject();
				const collectionId = await insertSharedCollection(projectId);

				await expect(
					insertShare(collectionId, projectId, 'knowledgeCollection:editor'),
				).resolves.not.toThrow();
			});
		});

		describe('knowledge_file', () => {
			it('rejects a duplicate file name in one collection', async () => {
				const collectionId = await insertSharedCollection(await insertProject());
				await insertFile(collectionId, { name: 'handbook.pdf' });

				await expect(insertFile(collectionId, { name: 'handbook.pdf' })).rejects.toThrow();
			});

			it('rejects a storedAt outside the list', async () => {
				const collectionId = await insertSharedCollection(await insertProject());

				await expect(insertFile(collectionId, { storedAt: 'gc' })).rejects.toThrow(
					`CHK_${context.tablePrefix}knowledge_file_storedAt`,
				);
			});

			it('stores a file in the database by default', async () => {
				const fileId = await insertFile(await insertSharedCollection(await insertProject()));

				expect(await readColumn('knowledge_file', 'storedAt', fileId)).toEqual(['db']);
			});

			it('rejects a file for a collection that does not exist', async () => {
				await expect(insertFile(generateNanoId())).rejects.toThrow(
					context.isSqlite ? 'FOREIGN KEY constraint failed' : 'violates foreign key constraint',
				);
			});
		});

		describe('knowledge_vector_store', () => {
			it('rejects a duplicate store name in one collection', async () => {
				const collectionId = await insertSharedCollection(await insertProject());
				await insertStore(collectionId, { name: 'policies' });

				await expect(insertStore(collectionId, { name: 'policies' })).rejects.toThrow();
			});

			// The service checks the provider, because the list of providers grows.
			it('accepts a provider that the code does not know yet', async () => {
				const collectionId = await insertSharedCollection(await insertProject());
				const storeId = await insertStore(collectionId, { provider: 'weaviate' });

				expect(await readColumn('knowledge_vector_store', 'provider', storeId)).toEqual([
					'weaviate',
				]);
			});
		});

		describe('foreign keys', () => {
			interface ForeignKeyCase {
				child: string;
				column: string;
				parent: string;
				/** The graph row to delete. */
				parentRow: keyof Graph;
				/**
				 * The child row, found by its `id`. The tables with a composite key have no
				 * `id`: their row is found by `column`, which is part of the key.
				 */
				childRow?: keyof Graph;
				onDelete: 'CASCADE' | 'SET NULL';
			}

			const foreignKeys: ForeignKeyCase[] = [
				{
					child: 'knowledge_collection',
					column: 'projectId',
					parent: 'project',
					parentRow: 'ownerProjectId',
					childRow: 'sharedCollectionId',
					onDelete: 'CASCADE',
				},
				{
					child: 'knowledge_collection',
					column: 'agentId',
					parent: 'agents',
					parentRow: 'agentId',
					childRow: 'agentCollectionId',
					onDelete: 'CASCADE',
				},
				{
					child: 'knowledge_collection',
					column: 'createdById',
					parent: 'user',
					parentRow: 'authorId',
					childRow: 'sharedCollectionId',
					onDelete: 'SET NULL',
				},
				{
					child: 'shared_knowledge_collection',
					column: 'knowledgeCollectionId',
					parent: 'knowledge_collection',
					parentRow: 'sharedCollectionId',
					onDelete: 'CASCADE',
				},
				{
					child: 'shared_knowledge_collection',
					column: 'projectId',
					parent: 'project',
					parentRow: 'shareProjectId',
					onDelete: 'CASCADE',
				},
				{
					child: 'knowledge_file',
					column: 'knowledgeCollectionId',
					parent: 'knowledge_collection',
					parentRow: 'sharedCollectionId',
					childRow: 'fileId',
					onDelete: 'CASCADE',
				},
				{
					child: 'knowledge_file',
					column: 'createdById',
					parent: 'user',
					parentRow: 'authorId',
					childRow: 'fileId',
					onDelete: 'SET NULL',
				},
				{
					child: 'knowledge_vector_store',
					column: 'knowledgeCollectionId',
					parent: 'knowledge_collection',
					parentRow: 'sharedCollectionId',
					childRow: 'storeId',
					onDelete: 'CASCADE',
				},
				{
					child: 'knowledge_vector_store',
					column: 'credentialId',
					parent: 'credentials_entity',
					parentRow: 'credentialId',
					childRow: 'storeId',
					onDelete: 'SET NULL',
				},
				{
					child: 'knowledge_vector_store',
					column: 'embeddingCredentialId',
					parent: 'credentials_entity',
					parentRow: 'embeddingCredentialId',
					childRow: 'storeId',
					onDelete: 'SET NULL',
				},
				{
					child: 'knowledge_vector_store',
					column: 'createdById',
					parent: 'user',
					parentRow: 'authorId',
					childRow: 'storeId',
					onDelete: 'SET NULL',
				},
				{
					child: 'agent_knowledge_dependency',
					column: 'agentId',
					parent: 'agents',
					parentRow: 'agentId',
					onDelete: 'CASCADE',
				},
				{
					child: 'agent_knowledge_dependency',
					column: 'knowledgeCollectionId',
					parent: 'knowledge_collection',
					parentRow: 'sharedCollectionId',
					onDelete: 'CASCADE',
				},
			];

			it.each(foreignKeys)(
				'applies $onDelete on $column of $child when its $parent row is deleted',
				async ({ child, column, parent, parentRow, childRow, onDelete }) => {
					const graph = await insertGraph();
					const parentId = graph[parentRow];
					const [findColumn, findValue]: [string, string] = childRow
						? ['id', graph[childRow]]
						: [column, parentId];
					expect(await countRows(child, findColumn, findValue)).toBeGreaterThan(0);

					await deleteRow(parent, 'id', parentId);

					if (onDelete === 'CASCADE') {
						expect(await countRows(child, findColumn, findValue)).toBe(0);
					} else {
						expect(await readColumn(child, column, findValue)).toEqual([null]);
					}
				},
			);
		});

		describe('rows that stay', () => {
			it('keeps a collection with its files and stores when a project with only a share is deleted', async () => {
				const graph = await insertGraph();

				await deleteRow('project', 'id', graph.shareProjectId);

				expect(await countRows('knowledge_collection', 'id', graph.sharedCollectionId)).toBe(1);
				expect(await countRows('knowledge_file', 'id', graph.fileId)).toBe(1);
				expect(await countRows('knowledge_vector_store', 'id', graph.storeId)).toBe(1);
				expect(
					await countRows('shared_knowledge_collection', 'projectId', graph.ownerProjectId),
				).toBe(1);
				expect(
					await countRows('shared_knowledge_collection', 'projectId', graph.shareProjectId),
				).toBe(0);
			});

			it('removes only the dependency row when an agent that uses a shared collection is deleted', async () => {
				const graph = await insertGraph();
				const consumerAgentId = await insertAgent(graph.shareProjectId);
				await insertRow('agent_knowledge_dependency', {
					agentId: consumerAgentId,
					knowledgeCollectionId: graph.sharedCollectionId,
				});

				await deleteRow('agents', 'id', consumerAgentId);

				expect(await countRows('agent_knowledge_dependency', 'agentId', consumerAgentId)).toBe(0);
				expect(await countRows('agent_knowledge_dependency', 'agentId', graph.agentId)).toBe(1);
				expect(await countRows('knowledge_collection', 'id', graph.sharedCollectionId)).toBe(1);
				expect(
					await countRows(
						'shared_knowledge_collection',
						'knowledgeCollectionId',
						graph.sharedCollectionId,
					),
				).toBe(2);
				expect(await countRows('knowledge_file', 'id', graph.fileId)).toBe(1);
				expect(await countRows('knowledge_vector_store', 'id', graph.storeId)).toBe(1);
			});

			it.each([
				['credentialId', 'embeddingCredentialId'],
				['embeddingCredentialId', 'credentialId'],
			] as const)(
				'keeps a store when its %s credential is deleted and clears only that id',
				async (deletedColumn, keptColumn) => {
					const graph = await insertGraph();

					await deleteRow('credentials_entity', 'id', graph[deletedColumn]);

					expect(await readColumn('knowledge_vector_store', deletedColumn, graph.storeId)).toEqual([
						null,
					]);
					expect(await readColumn('knowledge_vector_store', keptColumn, graph.storeId)).toEqual([
						graph[keptColumn],
					]);
				},
			);
		});
	});

	it('drops the five tables on down and creates them again on up', async () => {
		const tableExists = async (name: string) => {
			const context = createTestMigrationContext(dataSource);
			try {
				return await context.queryRunner.hasTable(`${context.tablePrefix}${name}`);
			} finally {
				await context.queryRunner.release();
			}
		};

		await undoLastSingleMigration();

		for (const name of tables) {
			expect(await tableExists(name)).toBe(false);
		}

		await runSingleMigration(migrationName);

		for (const name of tables) {
			expect(await tableExists(name)).toBe(true);
		}
	});
});
