import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as path from 'node:path';

import { createRule, findFilesInPackageDirs } from '../utils/index.js';

// Package subdirectories that ship in the published artifact and should stay clean.
const SCAN_DIRS = ['nodes', 'credentials'];

const DEAD_FILE_MATCHERS: Array<(fileName: string) => boolean> = [
	(fileName) => fileName.endsWith('.backup'),
	(fileName) => fileName.endsWith('.bak'),
	// Windows "mark of the web" ADS files, extracted as literal filenames on
	// filesystems without alternate data streams (e.g. `Foo.node.ts:Zone.Identifier`).
	(fileName) => fileName.endsWith('Zone.Identifier'),
	(fileName) => fileName === 'test.js',
	(fileName) => fileName === 'test.ts',
];

/**
 * Returns true if the given filename looks like a leftover backup, editor, or
 * test-artifact file that should not ship with a community node.
 */
export function isDeadFileName(fileName: string): boolean {
	return DEAD_FILE_MATCHERS.some((matches) => matches(fileName));
}

export const NoDeadFilesRule = createRule({
	name: 'no-dead-files',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow leftover backup, editor, and test-artifact files in the `nodes/` and `credentials/` directories of a community node package',
		},
		messages: {
			deadFileFound:
				'Remove the leftover file "{{ file }}". Backup, editor, and test-artifact files should not be published with a community node.',
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
				// Only inspect the root object of the package.json file, so the scan runs once.
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				const packageDir = path.dirname(context.filename);

				for (const deadFile of findFilesInPackageDirs(
					context.filename,
					SCAN_DIRS,
					isDeadFileName,
				)) {
					context.report({
						node,
						messageId: 'deadFileFound',
						data: { file: path.relative(packageDir, deadFile) },
					});
				}
			},
		};
	},
});
