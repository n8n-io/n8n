import { matchesGlob, resolve } from 'node:path';

/**
 * The extraction ratchet must hold for every file under `src`.
 *
 * `no-restricted-imports` is not mergeable across Oxlint overrides — a later
 * override replaces the rule outright. That is exactly how the ratchet was turned off
 * for `src/features/agents/**` once already: a narrower block set the rule without
 * spreading `extractedFeatures`. A comment cannot hold that, so this asserts
 * the *resolved* config rather than the config source.
 *
 * Add an override that sets `no-restricted-imports` for some subtree and forgets the
 * spread, and the matching path below fails.
 */
type RuleEntry = string | [string, ...unknown[]];

interface OxlintConfig {
	extends?: OxlintConfig[];
	rules?: Record<string, RuleEntry>;
	overrides?: Array<{ files: string[]; rules?: Record<string, RuleEntry> }>;
}

type RestrictedImports = [string, { patterns?: Array<{ group?: string[]; message?: string }> }];

const EXTRACTED_MODULES = [
	{ group: '@/features/instanceRegistry', package: '@n8n/frontend-module-instance-registry' },
	{ group: '@/features/settings/otel', package: '@n8n/frontend-module-otel' },
	{ group: '@/features/execution/insights', package: '@n8n/frontend-module-insights' },
	{ group: '@/features/ai/mcpAccess', package: '@n8n/frontend-module-mcp' },
];

// One representative path per block in `oxlint.config.mts` that sets the rule, plus
// plain feature and app paths. `features/agents` is the subtree that regressed.
const PATHS = [
	'src/app/main.ts',
	'src/app/views/WorkflowsView.vue',
	'src/features/agents/views/AgentsListView.vue',
	'src/features/agents/agents.store.ts',
	'src/features/credentials/views/CredentialsView.vue',
	'src/features/collaboration/projects/projects.routes.ts',
	'src/features/ndv/ndv.store.ts',
	'src/features/shared/editors/utils/loadPrettier.ts',
];

/** Resolves a rule for a file as Oxlint does: `extends` first, then each matching override. */
function resolveRule(config: OxlintConfig, file: string, ruleId: string): RuleEntry | undefined {
	let rule: RuleEntry | undefined;
	for (const parent of config.extends ?? []) rule = resolveRule(parent, file, ruleId) ?? rule;
	rule = config.rules?.[ruleId] ?? rule;
	for (const override of config.overrides ?? []) {
		if (override.files.some((pattern) => matchesGlob(file, pattern))) {
			rule = override.rules?.[ruleId] ?? rule;
		}
	}
	return rule;
}

describe('extraction ratchet', () => {
	let configs: Map<string, RuleEntry | undefined>;

	beforeAll(async () => {
		// Not a static import: the config is not part of the app's TypeScript program.
		const configPath = resolve(process.cwd(), 'oxlint.config.mts');
		const { default: config } = (await import(/* @vite-ignore */ configPath)) as {
			default: OxlintConfig;
		};
		configs = new Map(
			PATHS.map((path) => [path, resolveRule(config, path, 'no-restricted-imports')]),
		);
	}, 60000);

	it.each(PATHS)('restricts every extracted module for %s', (path) => {
		const rule = configs.get(path);
		expect(rule, `no-restricted-imports is unset for ${path}`).toBeDefined();

		const [severity, options] = rule as RestrictedImports;
		expect(severity).toBe('error');

		const groups = (options.patterns ?? []).flatMap((pattern) => pattern.group ?? []);
		for (const { group, package: pkg } of EXTRACTED_MODULES) {
			expect(groups, `${path} does not restrict ${pkg}'s old path`).toContain(group);
		}
	});

	it('keeps the agents-only RunData restriction alongside the ratchet', () => {
		// The pattern the regression dropped. It proves the narrow block still sets its
		// own patterns rather than being replaced by the wide one.
		const rule = configs.get('src/features/agents/views/AgentsListView.vue');
		const groups = ((rule as RestrictedImports)[1].patterns ?? []).flatMap(
			(pattern) => pattern.group ?? [],
		);

		expect(groups).toContain('**/ndv/runData/components/RunData.vue');
	});
});
