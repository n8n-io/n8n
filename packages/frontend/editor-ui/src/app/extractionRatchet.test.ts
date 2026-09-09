import { modulePackages } from '@n8n/frontend-vite-config';
import { ESLint } from 'eslint';

/**
 * The two module ratchets must hold for every file under `src`: an extracted feature
 * must not reappear at its old path, and a module package is reachable only at the
 * entries its `exports` map declares.
 *
 * `no-restricted-imports` is not mergeable across flat-config blocks — a later
 * block replaces the rule outright. That is exactly how the ratchet was turned off
 * for `src/features/agents/**` once already: a narrower block set the rule without
 * spreading `moduleBoundaryPatterns`. A comment cannot hold that, so this asserts
 * the *resolved* config rather than the config source.
 *
 * Add a block that sets `no-restricted-imports` for some subtree and forgets the
 * spread, and the matching path below fails. `moduleEntries.test.ts` holds the other
 * half: that the deep-import patterns say what they mean.
 */
type RestrictedImports = [
	string | number,
	{ patterns?: Array<{ group?: string[]; message?: string }> },
];

const EXTRACTED_MODULES = [
	{ group: '@/features/instanceRegistry', package: '@n8n/frontend-module-instance-registry' },
	{ group: '@/features/settings/otel', package: '@n8n/frontend-module-otel' },
	{ group: '@/features/execution/insights', package: '@n8n/frontend-module-insights' },
];

// One representative path per block in `eslint.config.mjs` that sets the rule, plus
// plain feature and app paths. `features/agents` is the subtree that regressed.
const PATHS = [
	'src/app/main.ts',
	'src/app/views/WorkflowsView.vue',
	'src/features/agents/views/AgentsListView.vue',
	'src/features/agents/agents.store.ts',
	'src/features/credentials/views/CredentialsView.vue',
	'src/features/collaboration/projects/projects.routes.ts',
	'src/features/ndv/ndv.store.ts',
];

describe('extraction ratchet', () => {
	let configs: Map<string, RestrictedImports | undefined>;

	beforeAll(async () => {
		const eslint = new ESLint({ cwd: process.cwd() });
		configs = new Map();
		for (const path of PATHS) {
			const config = (await eslint.calculateConfigForFile(path)) as {
				rules?: Record<string, unknown>;
			};
			configs.set(
				path,
				config.rules?.['@typescript-eslint/no-restricted-imports'] as RestrictedImports | undefined,
			);
		}
	}, 60000);

	it.each(PATHS)('restricts every extracted module for %s', (path) => {
		const rule = configs.get(path);
		expect(rule, `no-restricted-imports is unset for ${path}`).toBeDefined();

		// ESLint normalises the severity, so `error` arrives as 2.
		const [severity, options] = rule as RestrictedImports;
		expect(severity).toBe(2);

		const groups = (options.patterns ?? []).flatMap((pattern) => pattern.group ?? []);
		for (const { group, package: pkg } of EXTRACTED_MODULES) {
			expect(groups, `${path} does not restrict ${pkg}'s old path`).toContain(group);
		}
	});

	it.each(PATHS)('restricts every undeclared path inside a module package for %s', (path) => {
		const groups = ((configs.get(path) as RestrictedImports)[1].patterns ?? []).flatMap(
			(pattern) => pattern.group ?? [],
		);

		for (const { name } of modulePackages) {
			expect(groups, `${path} lets a deep import into ${name} through`).toContain(`${name}/**`);
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
