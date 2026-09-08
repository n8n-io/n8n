import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as path from 'node:path';

import {
	createRule,
	findJsonProperty,
	findNodeSourceFilesOnDisk,
	isContainedWithin,
	readPackageJsonNodes,
} from '../utils/index.js';

export const NodeRegistrationCompleteRule = createRule({
	name: 'node-registration-complete',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensure every `.node.ts` file in the `nodes/` directory is registered in the "n8n.nodes" array of package.json',
		},
		messages: {
			nodeNotRegistered:
				'The node file "{{ nodeFile }}" is not registered in the "n8n.nodes" array of package.json. Add it so n8n can discover the node.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only inspect the root object of the package.json file.
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				const nodeFilesOnDisk = findNodeSourceFilesOnDisk(context.filename);
				if (nodeFilesOnDisk.length === 0) {
					return;
				}

				const registeredFiles = readPackageJsonNodes(context.filename).map((filePath) =>
					path.resolve(filePath),
				);
				const registered = new Set(registeredFiles);
				// Directories of registered entry files, used to recognise versioned
				// nodes: a `VersionedNodeType` entry file (e.g. `SoterGuard.node.ts`) is
				// registered, and its per-version implementations live in subdirectories
				// (e.g. `v1/SoterGuardV1.node.ts`) pulled in by that entry file.
				const registeredDirs = registeredFiles.map((filePath) => path.dirname(filePath));

				const packageDir = path.dirname(context.filename);
				const reportTarget = resolveReportTarget(node);

				for (const nodeFile of nodeFilesOnDisk) {
					const resolvedNodeFile = path.resolve(nodeFile);
					if (registered.has(resolvedNodeFile)) {
						continue;
					}

					// Skip per-version implementation files nested under a registered
					// versioned node's entry directory.
					if (isRegisteredThroughVersionedEntry(resolvedNodeFile, registeredDirs)) {
						continue;
					}

					context.report({
						node: reportTarget,
						messageId: 'nodeNotRegistered',
						data: { nodeFile: path.relative(packageDir, nodeFile) },
					});
				}
			},
		};
	},
});

/**
 * Determines whether a node file is a per-version implementation of a registered
 * versioned node. Such files sit in a subdirectory of the registered
 * `VersionedNodeType` entry file (e.g. `SoterGuard/v1/SoterGuardV1.node.ts` under
 * the entry `SoterGuard/SoterGuard.node.ts`), so they are discovered through the
 * entry file rather than being listed individually in `n8n.nodes`.
 */
function isRegisteredThroughVersionedEntry(nodeFile: string, registeredDirs: string[]): boolean {
	const nodeDir = path.dirname(nodeFile);
	return registeredDirs.some(
		(registeredDir) => registeredDir !== nodeDir && isContainedWithin(registeredDir, nodeDir),
	);
}

/**
 * Reports against the most specific available node: the `n8n.nodes` array, the
 * `n8n` object, or the package.json root object as a fallback.
 */
function resolveReportTarget(root: TSESTree.ObjectExpression): TSESTree.Node {
	const n8nProperty = findJsonProperty(root, 'n8n');
	if (n8nProperty?.value.type !== AST_NODE_TYPES.ObjectExpression) {
		return n8nProperty ?? root;
	}

	const nodesProperty = findJsonProperty(n8nProperty.value, 'nodes');
	return nodesProperty ?? n8nProperty;
}
