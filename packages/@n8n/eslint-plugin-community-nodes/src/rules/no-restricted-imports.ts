import {
	getModulePath,
	isDirectRequireCall,
	isRequireMemberCall,
	createRule,
	findPackageJson,
	readPackageJsonDevDependencies,
} from '../utils/index.js';

const allowedModules = [
	'n8n-workflow',
	'ai-node-sdk',
	'lodash',
	'moment',
	'p-limit',
	'luxon',
	'zod',
	'crypto',
	'node:crypto',
	'@n8n/ai-node-sdk',
];

const isModuleAllowed = (modulePath: string, devDependencies: Set<string>): boolean => {
	if (modulePath.startsWith('./') || modulePath.startsWith('../')) return true;

	const moduleName = modulePath.startsWith('@')
		? modulePath.split('/').slice(0, 2).join('/')
		: modulePath.split('/')[0];
	if (!moduleName) return true;
	// Dev dependencies (e.g. `vitest`) are never installed at runtime on n8n
	// Cloud, so they are not subject to this rule — it targets runtime
	// dependencies only. `no-runtime-dependencies` already enforces that the
	// package's `dependencies` field is empty, so any external package an
	// author uses must be a devDependency (bundled at build) or a
	// peerDependency (provided by the instance).
	if (devDependencies.has(moduleName)) return true;
	return allowedModules.includes(moduleName);
};

export const NoRestrictedImportsRule = createRule({
	name: 'no-restricted-imports',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow usage of restricted imports in community nodes.',
		},
		messages: {
			restrictedImport:
				"Import of '{{ modulePath }}' is not allowed. n8n Cloud does not allow community nodes with dependencies.",
			restrictedRequire:
				"Require of '{{ modulePath }}' is not allowed. n8n Cloud does not allow community nodes with dependencies.",
			restrictedDynamicImport:
				"Dynamic import of '{{ modulePath }}' is not allowed. n8n Cloud does not allow community nodes with dependencies.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const devDependencies = readPackageJsonDevDependencies(
			findPackageJson(context.physicalFilename),
		);

		return {
			ImportDeclaration(node) {
				const modulePath = getModulePath(node.source);
				if (modulePath && !isModuleAllowed(modulePath, devDependencies)) {
					context.report({
						node,
						messageId: 'restrictedImport',
						data: {
							modulePath,
						},
					});
				}
			},

			ImportExpression(node) {
				const modulePath = getModulePath(node.source);
				if (modulePath && !isModuleAllowed(modulePath, devDependencies)) {
					context.report({
						node,
						messageId: 'restrictedDynamicImport',
						data: {
							modulePath,
						},
					});
				}
			},

			CallExpression(node) {
				if (isDirectRequireCall(node) || isRequireMemberCall(node)) {
					const modulePath = getModulePath(node.arguments[0] ?? null);
					if (modulePath && !isModuleAllowed(modulePath, devDependencies)) {
						context.report({
							node,
							messageId: 'restrictedRequire',
							data: {
								modulePath,
							},
						});
					}
				}
			},
		};
	},
});
