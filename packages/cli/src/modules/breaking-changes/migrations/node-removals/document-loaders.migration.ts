import { NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections, INode, INodeParameters } from 'n8n-workflow';

import type { NodeMigration, WorkflowMigration } from '../node-migration';
import { replaceAffectedNodes } from '../node-migration';
import { pickDefined, readOptions, readString } from '../parameter-readers';

const DEFAULT_DATA_LOADER_TYPE = '@n8n/n8n-nodes-langchain.documentDefaultDataLoader';
const DEFAULT_DATA_LOADER_VERSION = 1.1;

// Both old loaders move their settings into the `options` collection of the new node.
// The loader reads each one with a fallback that differs from the old default, so the
// old default has to be written out.
function binaryLoaderOptions(node: INode): INodeParameters {
	const { parameters } = node;
	const loader = readString(parameters, 'loader', 'jsonLoader', 'Loader Type');
	const metadata = pickDefined(readOptions(parameters), ['metadata']);

	switch (loader) {
		case 'pdfLoader':
			return { splitPages: parameters.splitPages ?? true, ...metadata };
		case 'csvLoader':
			return {
				column: parameters.column ?? '',
				separator: parameters.separator ?? ',',
				...metadata,
			};
		case 'jsonLoader':
			return { pointers: parameters.pointers ?? '', ...metadata };
		default:
			return metadata;
	}
}

/**
 * Binary Input Loader to Default Data Loader (binary).
 *
 * Does:
 * - Target: `documentDefaultDataLoader`, version 1.1, `dataType` = `binary`,
 *   `binaryMode` = `allInputData` (the old node always loads all input binary data) and
 *   `textSplittingMode` = `custom`. The old node requires a text splitter, and `simple`
 *   would chunk the text in a different way.
 * - Keeps: `binaryDataKey`, `options.metadata`, and the settings of the selected loader
 *   (`splitPages`, `column`, `separator`, `pointers`). They move into `options`.
 * - Writes: `loader` explicitly, because the old default is `jsonLoader` and the new
 *   default is `auto`. It also writes the old defaults of the loader settings, because
 *   the new loader reads them with other fallbacks.
 *
 * Refuses when:
 * - `loader` is an expression: the migration must know the loader to pick its settings.
 * - `options` is not an object.
 *
 * Accepted changes:
 * - None.
 */
export const binaryInputLoaderToDefaultDataLoader: NodeMigration = {
	ruleId: 'binary-input-loader-removed-v3',
	migrate: (node) => ({
		node: {
			type: DEFAULT_DATA_LOADER_TYPE,
			typeVersion: DEFAULT_DATA_LOADER_VERSION,
			parameters: {
				dataType: 'binary',
				binaryMode: 'allInputData',
				loader: readString(node.parameters, 'loader', 'jsonLoader', 'Loader Type'),
				...pickDefined(node.parameters, ['binaryDataKey']),
				textSplittingMode: 'custom',
				options: binaryLoaderOptions(node),
			},
		},
	}),
};

/** Names of the nodes that have a text splitter connected. */
function nodesWithTextSplitter(connections: IConnections): Set<string> {
	const names = new Set<string>();
	for (const byType of Object.values(connections)) {
		for (const group of byType[NodeConnectionTypes.AiTextSplitter] ?? []) {
			for (const connection of group ?? []) names.add(connection.node);
		}
	}
	return names;
}

/**
 * JSON Input Loader to Default Data Loader (JSON).
 *
 * Does:
 * - Target: `documentDefaultDataLoader`, version 1.1, `dataType` = `json`,
 *   `jsonMode` = `allInputData` and `textSplittingMode` = `custom`.
 * - Keeps: `pointers` and `options.metadata`. They move into `options`.
 * - Needs the connections, so it is a workflow migration.
 *
 * Refuses when:
 * - No text splitter is connected: the old splitter input is optional, but the new
 *   node always splits the text. `simple` would chunk it and `custom` needs a splitter.
 * - `options` is not an object.
 *
 * Accepted changes:
 * - None.
 */
export const jsonInputLoaderToDefaultDataLoader: WorkflowMigration = {
	ruleId: 'json-input-loader-removed-v3',
	migrateWorkflow: ({ nodes, connections, affectedNodeIds }) => {
		const withSplitter = nodesWithTextSplitter(connections);

		const migrated = replaceAffectedNodes(nodes, affectedNodeIds, (node) => {
			if (!withSplitter.has(node.name)) {
				throw new Error(
					'This JSON Input Loader has no text splitter. Default Data Loader always splits the text, so the node cannot be migrated automatically.',
				);
			}

			const options = pickDefined(readOptions(node.parameters), ['metadata']);
			return {
				...node,
				type: DEFAULT_DATA_LOADER_TYPE,
				typeVersion: DEFAULT_DATA_LOADER_VERSION,
				parameters: {
					dataType: 'json',
					jsonMode: 'allInputData',
					textSplittingMode: 'custom',
					options: { ...pickDefined(node.parameters, ['pointers']), ...options },
				},
			} satisfies INode;
		});

		return { ...migrated, connections };
	},
};
