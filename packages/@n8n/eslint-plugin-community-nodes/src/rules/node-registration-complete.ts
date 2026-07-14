import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as path from 'node:path';

import {
	createRule,
	findJsonProperty,
	findNodeSourceFilesOnDisk,
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

				const registered = new Set(
					readPackageJsonNodes(context.filename).map((filePath) => path.resolve(filePath)),
				);

				const packageDir = path.dirname(context.filename);
				const reportTarget = resolveReportTarget(node);

				for (const nodeFile of nodeFilesOnDisk) {
					if (registered.has(path.resolve(nodeFile))) {
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
