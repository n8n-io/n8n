import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import path from 'node:path';

import { createRule, isCredentialTypeClass } from '../utils/index.js';

export const CredClassNamingRule = createRule({
	name: 'cred-class-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Credential class names must be suffixed with "Api" and filename must match "[ClassName].credentials.ts"',
		},
		messages: {
			classNameUnsuffixed:
				'Credential class "{{name}}" must be suffixed with "Api" (e.g., "GithubApi")',
			filenameAgainstConvention:
				'Credential filename must follow the pattern "[ClassName].credentials.ts" (e.g., "GithubApi.credentials.ts")',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (!isCredentialTypeClass(node)) return;

				const className = node.id?.type === AST_NODE_TYPES.Identifier ? node.id.name : null;
				if (!className) return;

				if (!className.endsWith('Api')) {
					context.report({
						node: node.id ?? node,
						messageId: 'classNameUnsuffixed',
						data: { name: className },
					});
				}

				const filename = path.basename(context.filename);
				const expectedFilename = `${className}.credentials.ts`;
				if (filename !== expectedFilename) {
					context.report({
						node: node.id ?? node,
						messageId: 'filenameAgainstConvention',
					});
				}
			},
		};
	},
});
