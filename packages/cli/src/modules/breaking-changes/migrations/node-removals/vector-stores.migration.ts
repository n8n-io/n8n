import { NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

import type { NodeMigration, WorkflowMigration } from '../node-migration';
import { replaceAffectedNodes } from '../node-migration';
import { pickDefined, readOptions } from '../parameter-readers';

/**
 * The old Insert and Load nodes became one node per vector store with a `mode`.
 *
 * Insert maps to `insert`. Load maps to `retrieve`, not to `load` (Get Many). The old
 * Load nodes output `ai_vectorStore`, and so does `retrieve`. `load` needs a main input
 * and a `prompt` and outputs main items, which would break the connections.
 *
 * Version 1.1 is the target. In-Memory 1.2 and later stops prefixing the key with the
 * workflow id, which would hide the data that the old nodes stored.
 *
 * Insert refusals, common to all Insert migrations:
 * - The clear refusals exist because the new insert works in batches of 200 documents
 *   and clears the store on every batch. The old nodes cleared it once.
 * - The document source refusal exists because the old insert reads the documents once
 *   for all input items, and the new insert reads them for each input item. A loader
 *   gives the documents of its own item. Any other source gives one fixed list, which
 *   the new insert would store again for each input item.
 */
const VERSION = 1.1;

const isOff = (value: unknown) => value === undefined || value === false;

const refuseClear = (label: string) =>
	new Error(
		`"${label}" is turned on, and the new node handles it differently. Some of your stored documents could be lost. Replace this node by hand.`,
	);

// Document loaders whose documents the old and the new insert read in the same way.
// They include the removed loaders, because their own migrations replace them with the first one.
const DOCUMENT_LOADER_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
	'@n8n/n8n-nodes-langchain.documentJsonInputLoader',
	'@n8n/n8n-nodes-langchain.documentBinaryInputLoader',
]);

/** Node types that feed `nodeName` through its `ai_document` input. */
function documentSourceTypes(
	nodeName: string,
	nodes: INode[],
	connections: IConnections,
): string[] {
	const typeByName = new Map(nodes.map(({ name, type }) => [name, type]));
	const types: string[] = [];
	for (const [source, byType] of Object.entries(connections)) {
		for (const group of byType[NodeConnectionTypes.AiDocument] ?? []) {
			for (const connection of group ?? []) {
				if (connection.node === nodeName) types.push(typeByName.get(source) ?? 'unknown');
			}
		}
	}
	return types;
}

/**
 * The old insert reads documents once for all input items. The new insert reads them for each
 * input item. A loader gives the documents of its own item, so the result is the same.
 * Any other source (the GitHub loader, a Code node) gives one fixed list of documents.
 * The new insert would then store that list once for each input item.
 * So an insert migrates only when all its document sources are loaders.
 */
function insertMigration(ruleId: string, migrate: NodeMigration['migrate']): WorkflowMigration {
	return {
		ruleId,
		migrateWorkflow: ({ nodes, connections, affectedNodeIds }) => {
			const migrated = replaceAffectedNodes(nodes, affectedNodeIds, (node) => {
				const unsupported = documentSourceTypes(node.name, nodes, connections).find(
					(type) => !DOCUMENT_LOADER_TYPES.has(type),
				);
				if (unsupported !== undefined) {
					throw new Error(
						'The documents come from a node that the migration does not support, so they could be saved more than once. Replace this node by hand.',
					);
				}

				const { node: replacement } = migrate(node);
				return { ...node, ...replacement } satisfies INode;
			});

			return { ...migrated, connections };
		},
	};
}

// In-Memory

/**
 * In Memory Vector Store Insert to Simple Vector Store (Insert Documents).
 *
 * Does:
 * - Target: `vectorStoreInMemory`, version 1.1, `mode` = `insert`. Version 1.2 and later
 *   stops prefixing the key with the workflow id, which would hide the stored data.
 * - Keeps: `memoryKey`.
 * - A workflow migration, because it reads the `ai_document` connections.
 *
 * Refuses when:
 * - `clearStore` is on: the new node clears the store for every batch of documents, and
 *   the old node cleared it once.
 * - A document source is not a loader (see the top of this file).
 *
 * Accepted changes:
 * - None.
 */
export const inMemoryInsertToVectorStore = insertMigration(
	'in-memory-vector-store-insert-removed-v3',
	(node) => {
		if (!isOff(node.parameters.clearStore)) throw refuseClear('Clear Store');

		return {
			node: {
				type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
				typeVersion: VERSION,
				parameters: { mode: 'insert', ...pickDefined(node.parameters, ['memoryKey']) },
			},
		};
	},
);

/**
 * In Memory Vector Store Load to Simple Vector Store (Retrieve).
 *
 * Does:
 * - Target: `vectorStoreInMemory`, version 1.1, `mode` = `retrieve` (see the top of this
 *   file for why it is not `load`).
 * - Keeps: `memoryKey`.
 *
 * Refuses when:
 * - Never refuses.
 *
 * Accepted changes:
 * - None.
 */
export const inMemoryLoadToVectorStore: NodeMigration = {
	ruleId: 'in-memory-vector-store-load-removed-v3',
	migrate: (node) => ({
		node: {
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			typeVersion: VERSION,
			parameters: { mode: 'retrieve', ...pickDefined(node.parameters, ['memoryKey']) },
		},
	}),
};

// Pinecone

const PINECONE_TYPE = '@n8n/n8n-nodes-langchain.vectorStorePinecone';

/**
 * Pinecone: Insert to Pinecone Vector Store (Insert Documents).
 *
 * Does:
 * - Target: `vectorStorePinecone`, version 1.1, `mode` = `insert`. The credentials keep
 *   their type (`pineconeApi`).
 * - Keeps: `pineconeIndex`. `pineconeNamespace` moves to `options.pineconeNamespace`. An
 *   empty namespace means no namespace.
 * - Drops: `clearNamespace` when no namespace is set. Both nodes ignore it then.
 * - A workflow migration, because it reads the `ai_document` connections.
 *
 * Refuses when:
 * - `clearNamespace` is on and a namespace is set: the new node clears the namespace for
 *   every batch of documents, and the old node cleared it once.
 * - A document source is not a loader (see the top of this file).
 *
 * Accepted changes:
 * - None.
 */
export const pineconeInsertToVectorStore = insertMigration('pinecone-insert-removed-v3', (node) => {
	const { pineconeNamespace, clearNamespace } = node.parameters;
	const hasNamespace = pineconeNamespace !== undefined && pineconeNamespace !== '';
	// Both nodes clear only when a namespace is set.
	if (hasNamespace && !isOff(clearNamespace)) throw refuseClear('Clear Namespace');

	return {
		node: {
			type: PINECONE_TYPE,
			typeVersion: VERSION,
			parameters: {
				mode: 'insert',
				...pickDefined(node.parameters, ['pineconeIndex']),
				// An empty namespace and no namespace are the same for the old node.
				options: hasNamespace ? { pineconeNamespace } : {},
			},
		},
	};
});

/**
 * Pinecone: Load to Pinecone Vector Store (Retrieve).
 *
 * Does:
 * - Target: `vectorStorePinecone`, version 1.1, `mode` = `retrieve`. The credentials keep
 *   their type (`pineconeApi`).
 * - Keeps: `pineconeIndex`, `pineconeNamespace` (to `options.pineconeNamespace`) and
 *   `options.metadata`.
 *
 * Refuses when:
 * - `options` is not an object.
 *
 * Accepted changes:
 * - None.
 */
export const pineconeLoadToVectorStore: NodeMigration = {
	ruleId: 'pinecone-load-removed-v3',
	migrate: (node) => {
		const { pineconeNamespace } = node.parameters;
		const hasNamespace = pineconeNamespace !== undefined && pineconeNamespace !== '';

		return {
			node: {
				type: PINECONE_TYPE,
				typeVersion: VERSION,
				parameters: {
					mode: 'retrieve',
					...pickDefined(node.parameters, ['pineconeIndex']),
					options: {
						...(hasNamespace ? { pineconeNamespace } : {}),
						...pickDefined(readOptions(node.parameters), ['metadata']),
					},
				},
			},
		};
	},
};

// Supabase

const SUPABASE_TYPE = '@n8n/n8n-nodes-langchain.vectorStoreSupabase';

/**
 * Supabase: Insert to Supabase Vector Store (Insert Documents).
 *
 * Does:
 * - Target: `vectorStoreSupabase`, version 1.1, `mode` = `insert`. The credentials keep
 *   their type (`supabaseApi`).
 * - Keeps: `tableName`. `queryName` moves to `options.queryName`.
 * - A workflow migration, because it reads the `ai_document` connections.
 *
 * Refuses when:
 * - A document source is not a loader (see the top of this file).
 *
 * Accepted changes:
 * - None.
 */
export const supabaseInsertToVectorStore = insertMigration(
	'supabase-insert-removed-v3',
	(node) => ({
		node: {
			type: SUPABASE_TYPE,
			typeVersion: VERSION,
			parameters: {
				mode: 'insert',
				...pickDefined(node.parameters, ['tableName']),
				options: pickDefined(node.parameters, ['queryName']),
			},
		},
	}),
);

/**
 * Supabase: Load to Supabase Vector Store (Retrieve).
 *
 * Does:
 * - Target: `vectorStoreSupabase`, version 1.1, `mode` = `retrieve`. The credentials keep
 *   their type (`supabaseApi`).
 * - Keeps: `tableName`, `queryName` (to `options.queryName`) and `options.metadata`.
 *
 * Refuses when:
 * - `options` is not an object.
 *
 * Accepted changes:
 * - None.
 */
export const supabaseLoadToVectorStore: NodeMigration = {
	ruleId: 'supabase-load-removed-v3',
	migrate: (node) => ({
		node: {
			type: SUPABASE_TYPE,
			typeVersion: VERSION,
			parameters: {
				mode: 'retrieve',
				...pickDefined(node.parameters, ['tableName']),
				options: {
					...pickDefined(node.parameters, ['queryName']),
					...pickDefined(readOptions(node.parameters), ['metadata']),
				},
			},
		},
	}),
};
