import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * SPIKE: generalized library tagging + module-boundary enforcement.
 *
 * Every workspace package gets two tags: a `type` (its layer) and a `scope`
 * (its domain/owner). Import edges between packages are then policed by two
 * matrices:
 *   - type hierarchy: e.g. a `data-access` package may not import a UI package.
 *   - scope rules: a package may only import its own scope, a `shared` scope,
 *     or a scope it has explicitly opted into depending on.
 *
 * This is the n8n-native version of NX's enforce-module-boundaries, built on
 * the same custom-rule machinery n8n already uses for `misplaced-n8n-typeorm-import`
 * and `no-import-enterprise-edition` — no new dependency.
 *
 * ponytail: tags are passed as options here so the rule stays hermetic and
 * testable. Real wiring would generate the package list from each package.json's
 * `n8n.tags` field at config-build time (one fs scan, cached). Add when adopted.
 */

export type BoundaryType = 'app' | 'feature' | 'data-access' | 'domain-ui' | 'ui' | 'util';

export interface PackageTag {
	name: string;
	path: string;
	type: BoundaryType;
	scope: string;
}

export interface Options {
	packages: PackageTag[];
	/** importer type -> target types it may import. Overrides the default hierarchy. */
	allowedTypes?: Partial<Record<BoundaryType, BoundaryType[]>>;
	/** scopes any package may import regardless of its own scope. */
	sharedScopes?: string[];
	/** importer scope -> extra scopes it has opted into importing. */
	allowedScopeDependencies?: Record<string, string[]>;
}

// Konstantin's hierarchy: apps glue everything, features slice vertically and
// must not import each other, data-access stays UI-free, utils are universal.
const DEFAULT_ALLOWED_TYPES: Record<BoundaryType, BoundaryType[]> = {
	app: ['app', 'feature', 'data-access', 'domain-ui', 'ui', 'util'],
	feature: ['data-access', 'domain-ui', 'ui', 'util'],
	'data-access': ['data-access', 'util'],
	'domain-ui': ['domain-ui', 'ui', 'util'],
	ui: ['ui', 'util'],
	util: ['util'],
};

export const EnforceModuleBoundariesRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce type (layer) and scope (domain) import boundaries between tagged workspace packages.',
		},
		messages: {
			forbiddenType:
				'A "{{ fromType }}" package cannot import a "{{ toType }}" package ({{ toName }}).',
			forbiddenScope:
				'Scope "{{ fromScope }}" cannot import scope "{{ toScope }}" ({{ toName }}). Add it to allowedScopeDependencies or expose a shared package.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					packages: { type: 'array' },
					allowedTypes: { type: 'object' },
					sharedScopes: { type: 'array', items: { type: 'string' } },
					allowedScopeDependencies: { type: 'object' },
				},
				required: ['packages'],
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ packages: [] } as Options],
	create(context, [options]) {
		const { packages, allowedScopeDependencies = {} } = options;
		const allowedTypes = { ...DEFAULT_ALLOWED_TYPES, ...options.allowedTypes };
		const sharedScopes = options.sharedScopes ?? ['shared'];

		const filename = context.filename.split('\\').join('/');

		// Longest-matching path wins so nested packages resolve to themselves.
		const fromPkg = packages
			.filter((p) => filename.includes(p.path))
			.sort((a, b) => b.path.length - a.path.length)[0];

		if (!fromPkg) return {};

		const resolveTarget = (specifier: string) =>
			packages.find((p) => specifier === p.name || specifier.startsWith(`${p.name}/`));

		return {
			ImportDeclaration(node) {
				if (typeof node.source.value !== 'string') return;

				const toPkg = resolveTarget(node.source.value);
				if (!toPkg || toPkg.name === fromPkg.name) return; // external dep or self import

				if (!allowedTypes[fromPkg.type].includes(toPkg.type)) {
					context.report({
						node: node.source,
						messageId: 'forbiddenType',
						data: { fromType: fromPkg.type, toType: toPkg.type, toName: toPkg.name },
					});
					return;
				}

				const scopeAllowed =
					fromPkg.type === 'app' || // apps glue every scope together
					fromPkg.scope === toPkg.scope ||
					sharedScopes.includes(toPkg.scope) ||
					(allowedScopeDependencies[fromPkg.scope] ?? []).includes(toPkg.scope);

				if (!scopeAllowed) {
					context.report({
						node: node.source,
						messageId: 'forbiddenScope',
						data: { fromScope: fromPkg.scope, toScope: toPkg.scope, toName: toPkg.name },
					});
				}
			},
		};
	},
});
