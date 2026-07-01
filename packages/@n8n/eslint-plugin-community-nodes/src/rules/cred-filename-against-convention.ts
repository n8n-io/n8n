import * as path from 'node:path';

import { isCredentialTypeClass, isFileType, createRule } from '../utils/index.js';

export const CredFilenameAgainstConventionRule = createRule({
	name: 'cred-filename-against-convention',
	meta: {
		type: 'problem',
		docs: {
			description: 'Credential filename must match the credential class name',
		},
		messages: {
			renameFile:
				'Credential filename must match the class name "{{className}}". Rename file to "{{expected}}".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.credentials.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const classNameNode = node.id;
				if (!classNameNode) {
					return;
				}

				const className = classNameNode.name;
				const actualBaseName = path.basename(context.filename, '.credentials.ts');

				if (actualBaseName !== className) {
					context.report({
						node: classNameNode,
						messageId: 'renameFile',
						data: { className, expected: `${className}.credentials.ts` },
					});
				}
			},
		};
	},
});
