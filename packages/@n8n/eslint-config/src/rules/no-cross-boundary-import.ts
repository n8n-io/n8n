import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Package boundary definitions.
 *
 * Each key is a path segment that identifies a package (matched against the
 * file's absolute path). The value is an array of npm package names that are
 * FORBIDDEN imports for files in that package.
 *
 * The dependency flow is:
 *
 *   @n8n/api-types ─┐
 *   n8n-workflow ────┤  (foundation — no upward imports)
 *                    ↓
 *   n8n-core ────────┤  (can import workflow, not cli/frontend)
 *                    ↓
 *   n8n (cli) ───────┤  (orchestrator — can import most things)
 *                    ↓
 *   n8n-editor-ui    │  (frontend — no backend imports except types/workflow)
 *   @n8n/design-system  (pure UI — no backend imports at all)
 */
const BOUNDARY_RULES: Array<{ pathSegment: string; forbidden: string[] }> = [
	{
		pathSegment: 'packages/workflow/',
		forbidden: [
			'n8n-core',
			'n8n-editor-ui',
			'@n8n/design-system',
			'n8n-nodes-base',
			'@n8n/n8n-nodes-langchain',
		],
	},
	{
		pathSegment: 'packages/@n8n/api-types/',
		forbidden: [
			'n8n-core',
			'n8n-editor-ui',
			'@n8n/design-system',
			'n8n-nodes-base',
			'@n8n/n8n-nodes-langchain',
		],
	},
	{
		pathSegment: 'packages/core/',
		forbidden: ['n8n-editor-ui', '@n8n/design-system'],
	},
	{
		pathSegment: 'packages/nodes-base/',
		forbidden: ['n8n-core', 'n8n-editor-ui', '@n8n/design-system'],
	},
	{
		pathSegment: 'packages/frontend/@n8n/design-system/',
		forbidden: [
			'n8n-core',
			'n8n-editor-ui',
			'n8n-nodes-base',
			'@n8n/n8n-nodes-langchain',
			'@n8n/api-types',
		],
	},
	{
		pathSegment: 'packages/frontend/editor-ui/',
		forbidden: ['n8n-core', 'n8n-nodes-base', '@n8n/n8n-nodes-langchain'],
	},
];

/**
 * Normalize a raw import specifier to a package name.
 * '@n8n/foo/bar' → '@n8n/foo', 'n8n-core/utils' → 'n8n-core'
 */
function toPackageName(specifier: string): string {
	if (specifier.startsWith('@')) {
		return specifier.split('/').slice(0, 2).join('/');
	}
	return specifier.split('/')[0];
}

export const NoCrossBoundaryImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow imports that cross package architectural boundaries. See docs/principles/golden-rules.md for the expected dependency flow.',
		},
		messages: {
			forbiddenImport:
				'Do not import "{{ imported }}" from this package — it violates the architectural boundary. See docs/principles/golden-rules.md for the expected dependency flow.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const filename = context.filename ?? context.getFilename();

		// Find which boundary rule applies to this file
		const rule = BOUNDARY_RULES.find((r) => filename.includes(r.pathSegment));
		if (!rule) return {};

		function checkImport(specifier: string, node: TSESTree.Node) {
			// Skip relative imports
			if (specifier.startsWith('.') || specifier.startsWith('/')) return;

			const pkg = toPackageName(specifier);
			if (rule!.forbidden.includes(pkg)) {
				context.report({
					node,
					messageId: 'forbiddenImport',
					data: { imported: pkg },
				});
			}
		}

		return {
			ImportDeclaration(node) {
				checkImport(node.source.value, node.source);
			},
			ImportExpression(node) {
				if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
					checkImport(node.source.value, node.source);
				}
			},
		};
	},
});
