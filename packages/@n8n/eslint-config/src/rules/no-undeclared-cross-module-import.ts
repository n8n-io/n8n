import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { posix } from 'node:path';

const CLI_SRC_MARKER = '/packages/cli/src/';

type Classification = { kind: 'module'; name: string } | { kind: 'core' } | null;

/** `src/modules/<name>/` → that module (name keeps its `.ee` suffix); anything else under `src/` → core. */
function classify(path: string): Classification {
	const index = path.indexOf(CLI_SRC_MARKER);
	if (index === -1) return null;

	const match = /^modules\/([^/]+)\//.exec(path.slice(index + CLI_SRC_MARKER.length));
	return match ? { kind: 'module', name: match[1] } : { kind: 'core' };
}

export interface Options {
	/** module name -> module names it is allowed to import from */
	allowedDependencies: Record<string, string[]>;
}

export const NoUndeclaredCrossModuleImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce backend-module boundaries in `packages/cli/src/modules/`: a module may only import from another module when the edge is declared, and core must not import from modules at all.',
		},
		messages: {
			undeclaredDependency:
				'Module `{{ from }}` imports from module `{{ to }}` without declaring the dependency. Prefer inverting the edge — `{{ to }}` registers a provider into a registry owned by `{{ from }}` (see scripts/backend-module/backend-module-guide.md) — or deliberately declare `{{ to }}` in `allowedDependencies` for `{{ from }}` in packages/cli/eslint.config.mjs.',
			coreImportsModule:
				'Core must not depend on module `{{ to }}` — modules are optional and core has to work without them. Move this code into the module, or have the module register it via a hook/registry owned by core (see scripts/backend-module/backend-module-guide.md).',
		},
		schema: [
			{
				type: 'object',
				properties: {
					allowedDependencies: { type: 'object' },
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ allowedDependencies: {} } as Options],
	create(context, [options]) {
		const filename = context.filename.split('\\').join('/');
		const source = classify(filename);
		if (source === null) return {};

		const srcDir = filename.slice(0, filename.indexOf(CLI_SRC_MARKER) + CLI_SRC_MARKER.length);

		const check = (node: TSESTree.Node, specifier: string) => {
			// module init() imports compiled `.js` paths
			const cleaned = specifier.replace(/\.js$/, '');

			let resolved;
			if (cleaned.startsWith('@/')) {
				resolved = srcDir + cleaned.slice(2);
			} else if (cleaned.startsWith('.')) {
				resolved = posix.resolve(posix.dirname(filename), cleaned);
			} else {
				return; // bare package specifier
			}

			// trailing `/` so directory imports classify as the module
			const target = classify(`${resolved}/`);
			if (target === null || target.kind !== 'module') return;

			if (source.kind === 'core') {
				context.report({ node, messageId: 'coreImportsModule', data: { to: target.name } });
				return;
			}

			if (
				source.name !== target.name &&
				!(options.allowedDependencies[source.name] ?? []).includes(target.name)
			) {
				context.report({
					node,
					messageId: 'undeclaredDependency',
					data: { from: source.name, to: target.name },
				});
			}
		};

		return {
			ImportDeclaration(node) {
				check(node.source, node.source.value);
			},
			ExportNamedDeclaration(node) {
				if (node.source) check(node.source, node.source.value);
			},
			ExportAllDeclaration(node) {
				check(node.source, node.source.value);
			},
			ImportExpression(node) {
				if (
					node.source.type === TSESTree.AST_NODE_TYPES.Literal &&
					typeof node.source.value === 'string'
				) {
					check(node.source, node.source.value);
				}
			},
		};
	},
});
