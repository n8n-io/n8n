import type { IConnections, INode } from 'n8n-workflow';

import { createNode } from '../../../__tests__/test-helpers';
import {
	binaryInputLoaderToDefaultDataLoader,
	jsonInputLoaderToDefaultDataLoader,
} from '../document-loaders.migration';
import { WorkflowMigrationNodeError } from '../../node-migration';
import type { WorkflowMigration } from '../../node-migration';
import {
	inMemoryInsertToVectorStore,
	inMemoryLoadToVectorStore,
	pineconeInsertToVectorStore,
	pineconeLoadToVectorStore,
	supabaseInsertToVectorStore,
	supabaseLoadToVectorStore,
} from '../vector-stores.migration';

const LOADER = '@n8n/n8n-nodes-langchain.documentDefaultDataLoader';

describe('binaryInputLoaderToDefaultDataLoader migration', () => {
	const binaryLoader = (parameters: Record<string, unknown>) =>
		createNode('Loader', '@n8n/n8n-nodes-langchain.documentBinaryInputLoader', parameters);

	it('is keyed by the Binary Input Loader rule id', () => {
		expect(binaryInputLoaderToDefaultDataLoader.ruleId).toBe('binary-input-loader-removed-v3');
	});

	it('keeps the custom text splitter and writes the old loader default', () => {
		const { node } = binaryInputLoaderToDefaultDataLoader.migrate(binaryLoader({}));

		expect(node).toEqual({
			type: LOADER,
			typeVersion: 1.1,
			parameters: {
				dataType: 'binary',
				binaryMode: 'allInputData',
				// The old default is jsonLoader. The new default is auto.
				loader: 'jsonLoader',
				textSplittingMode: 'custom',
				options: { pointers: '' },
			},
		});
	});

	it('moves PDF settings into options and writes the old split pages default', () => {
		const { node } = binaryInputLoaderToDefaultDataLoader.migrate(
			binaryLoader({ loader: 'pdfLoader', binaryDataKey: 'file' }),
		);

		expect(node.parameters).toMatchObject({
			loader: 'pdfLoader',
			binaryDataKey: 'file',
			options: { splitPages: true },
		});
	});

	it('moves CSV settings and the metadata option into options', () => {
		const metadata = { metadataValues: [{ name: 'source', value: 'crm' }] };

		const { node } = binaryInputLoaderToDefaultDataLoader.migrate(
			binaryLoader({ loader: 'csvLoader', column: 'text', options: { metadata } }),
		);

		expect(node.parameters.options).toEqual({ column: 'text', separator: ',', metadata });
	});

	it('moves no loader settings for a loader that has none', () => {
		const { node } = binaryInputLoaderToDefaultDataLoader.migrate(
			binaryLoader({ loader: 'docxLoader' }),
		);

		expect(node.parameters.options).toEqual({});
	});

	it('refuses a loader set by an expression', () => {
		expect(() =>
			binaryInputLoaderToDefaultDataLoader.migrate(binaryLoader({ loader: '={{ $json.type }}' })),
		).toThrow();
	});
});

describe('jsonInputLoaderToDefaultDataLoader migration', () => {
	const loader = createNode('Loader', '@n8n/n8n-nodes-langchain.documentJsonInputLoader', {
		pointers: '/text',
		options: { metadata: { metadataValues: [{ name: 'a', value: 'b' }] } },
	});
	const splitter = createNode('Splitter', '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter');
	const other = createNode('Other', 'n8n-nodes-base.set');

	const splitterConnections: IConnections = {
		Splitter: { ai_textSplitter: [[{ node: 'Loader', type: 'ai_textSplitter', index: 0 }]] },
	};
	const migrate = (nodes: INode[], connections: IConnections) =>
		jsonInputLoaderToDefaultDataLoader.migrateWorkflow({
			nodes,
			connections,
			affectedNodeIds: new Set([loader.id]),
		});

	it('is keyed by the JSON Input Loader rule id', () => {
		expect(jsonInputLoaderToDefaultDataLoader.ruleId).toBe('json-input-loader-removed-v3');
	});

	it('migrates a loader that has a text splitter and leaves other nodes and connections alone', () => {
		const result = migrate([splitter, loader, other], splitterConnections);

		expect(result.migratedNodeIds).toEqual([loader.id]);
		expect(result.connections).toBe(splitterConnections);
		expect(result.nodes[0]).toBe(splitter);
		expect(result.nodes[2]).toBe(other);
		expect(result.nodes[1]).toEqual({
			...loader,
			type: LOADER,
			typeVersion: 1.1,
			parameters: {
				dataType: 'json',
				jsonMode: 'allInputData',
				textSplittingMode: 'custom',
				options: {
					pointers: '/text',
					metadata: { metadataValues: [{ name: 'a', value: 'b' }] },
				},
			},
		});
	});

	it('refuses a loader with no text splitter, because Default Data Loader always splits', () => {
		const run = () => migrate([loader, other], {});

		expect(run).toThrow(WorkflowMigrationNodeError);
		expect(run).toThrow('no text splitter');
	});

	it('does not count a splitter that is connected to another node', () => {
		const elsewhere: IConnections = {
			Splitter: { ai_textSplitter: [[{ node: 'Other', type: 'ai_textSplitter', index: 0 }]] },
		};

		expect(() => migrate([splitter, loader, other], elsewhere)).toThrow(WorkflowMigrationNodeError);
	});
});

describe('vector store migrations', () => {
	const node = (type: string, parameters: Record<string, unknown> = {}) =>
		createNode('Store', `@n8n/n8n-nodes-langchain.${type}`, parameters);

	// Runs an insert migration on a workflow with `sources` wired to the node's document input.
	const insertInWorkflow = (
		migration: WorkflowMigration,
		store: INode,
		sources: INode[] = [],
		connections: IConnections = {},
	) =>
		migration.migrateWorkflow({
			nodes: [...sources, store],
			connections: {
				...Object.fromEntries(
					sources.map(({ name }) => [
						name,
						{ ai_document: [[{ node: store.name, type: 'ai_document', index: 0 }]] },
					]),
				),
				...connections,
			},
			affectedNodeIds: new Set([store.id]),
		});

	const insert = (migration: WorkflowMigration, store: INode) => {
		const { nodes } = insertInWorkflow(migration, store);
		const { type, typeVersion, parameters } = nodes[nodes.length - 1];
		return { type, typeVersion, parameters };
	};

	describe('document source of Insert', () => {
		const store = node('vectorStoreInMemoryInsert');
		const migrate = (sources: INode[], connections?: IConnections) =>
			insertInWorkflow(inMemoryInsertToVectorStore, store, sources, connections);

		it.each(['documentDefaultDataLoader', 'documentJsonInputLoader', 'documentBinaryInputLoader'])(
			'migrates when the documents come from %s',
			(type) => {
				const result = migrate([createNode('Loader', `@n8n/n8n-nodes-langchain.${type}`)]);

				expect(result.migratedNodeIds).toEqual([store.id]);
			},
		);

		it('migrates when no document source is connected, because both nodes then fail', () => {
			expect(migrate([]).migratedNodeIds).toEqual([store.id]);
		});

		it.each(['documentGithubLoader', 'code'])(
			'refuses when the documents come from %s, because the new node would repeat them for each item',
			(type) => {
				const source = createNode('Source', `@n8n/n8n-nodes-langchain.${type}`);

				expect(() => migrate([createNode('Loader', LOADER), source])).toThrow(
					WorkflowMigrationNodeError,
				);
			},
		);

		it('does not count a source that is connected to another node', () => {
			const github = createNode('Source', '@n8n/n8n-nodes-langchain.documentGithubLoader');
			const result = inMemoryInsertToVectorStore.migrateWorkflow({
				nodes: [github, store],
				connections: {
					Source: { ai_document: [[{ node: 'Other', type: 'ai_document', index: 0 }]] },
				},
				affectedNodeIds: new Set([store.id]),
			});

			expect(result.migratedNodeIds).toEqual([store.id]);
		});

		it('leaves nodes that are not affected as they are', () => {
			const other = createNode('Other', 'n8n-nodes-base.set');
			const { nodes } = inMemoryInsertToVectorStore.migrateWorkflow({
				nodes: [other, store],
				connections: {},
				affectedNodeIds: new Set([store.id]),
			});

			expect(nodes[0]).toBe(other);
		});
	});

	describe('In-Memory', () => {
		it('migrates Insert to insert mode and keeps the memory key', () => {
			const migrated = insert(
				inMemoryInsertToVectorStore,
				node('vectorStoreInMemoryInsert', { memoryKey: 'kb' }),
			);

			expect(migrated).toEqual({
				type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
				typeVersion: 1.1,
				parameters: { mode: 'insert', memoryKey: 'kb' },
			});
		});

		it('refuses Insert with Clear Store on, because the new node clears for each batch', () => {
			expect(() =>
				insert(
					inMemoryInsertToVectorStore,
					node('vectorStoreInMemoryInsert', { clearStore: true }),
				),
			).toThrow('Clear Store');
		});

		it('migrates Load to retrieve mode, not to Get Many, so it keeps the vector store output', () => {
			const { node: migrated } = inMemoryLoadToVectorStore.migrate(
				node('vectorStoreInMemoryLoad', { memoryKey: 'kb' }),
			);

			expect(migrated.parameters).toEqual({ mode: 'retrieve', memoryKey: 'kb' });
			expect(migrated.typeVersion).toBe(1.1);
		});
	});

	describe('Pinecone', () => {
		const pineconeIndex = { __rl: true, mode: 'list', value: 'docs' };

		it('moves the namespace into options on Insert', () => {
			const migrated = insert(
				pineconeInsertToVectorStore,
				node('vectorStorePineconeInsert', { pineconeIndex, pineconeNamespace: 'team-a' }),
			);

			expect(migrated).toEqual({
				type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
				typeVersion: 1.1,
				parameters: { mode: 'insert', pineconeIndex, options: { pineconeNamespace: 'team-a' } },
			});
		});

		it('writes no namespace for an empty one, because the old node treats it as unset', () => {
			const migrated = insert(
				pineconeInsertToVectorStore,
				node('vectorStorePineconeInsert', { pineconeIndex, pineconeNamespace: '' }),
			);

			expect(migrated.parameters.options).toEqual({});
		});

		it('refuses Insert that clears a namespace', () => {
			expect(() =>
				insert(
					pineconeInsertToVectorStore,
					node('vectorStorePineconeInsert', { pineconeNamespace: 'a', clearNamespace: true }),
				),
			).toThrow('Clear Namespace');
		});

		it('allows Clear Namespace when no namespace is set, because it does nothing', () => {
			const migrated = insert(
				pineconeInsertToVectorStore,
				node('vectorStorePineconeInsert', { clearNamespace: true }),
			);

			expect(migrated.parameters.mode).toBe('insert');
		});

		it('migrates Load to retrieve mode with the namespace and metadata filter in options', () => {
			const metadata = { metadataValues: [{ name: 'a', value: 'b' }] };

			const { node: migrated } = pineconeLoadToVectorStore.migrate(
				node('vectorStorePineconeLoad', {
					pineconeIndex,
					pineconeNamespace: 'team-a',
					options: { metadata },
				}),
			);

			expect(migrated.parameters).toEqual({
				mode: 'retrieve',
				pineconeIndex,
				options: { pineconeNamespace: 'team-a', metadata },
			});
		});
	});

	describe('Supabase', () => {
		const tableName = { __rl: true, mode: 'list', value: 'documents' };

		it('moves the query name into options on Insert', () => {
			const migrated = insert(
				supabaseInsertToVectorStore,
				node('vectorStoreSupabaseInsert', { tableName, queryName: 'match_docs' }),
			);

			expect(migrated).toEqual({
				type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
				typeVersion: 1.1,
				parameters: { mode: 'insert', tableName, options: { queryName: 'match_docs' } },
			});
		});

		it('migrates Load to retrieve mode with the query name and metadata filter in options', () => {
			const metadata = { metadataValues: [{ name: 'a', value: 'b' }] };

			const { node: migrated } = supabaseLoadToVectorStore.migrate(
				node('vectorStoreSupabaseLoad', {
					tableName,
					queryName: 'match_docs',
					options: { metadata },
				}),
			);

			expect(migrated.parameters).toEqual({
				mode: 'retrieve',
				tableName,
				options: { queryName: 'match_docs', metadata },
			});
		});
	});
});
