import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`.
	ignorePatterns: frontendConfig.ignorePatterns,
	/**
	 * Suppressions inherited with the code, not granted to it.
	 *
	 * These files came from `editor-ui/src/features/execution/insights`, where
	 * the shell config turns each of these rules off or down to `warn`. The move
	 * is content-pristine on purpose — blame and `--follow` survive — so the debt
	 * travels with it instead of being rewritten in the same PR. `warn` here,
	 * never `off`: the count is visible and can only go down.
	 *
	 * Most of it is one root cause: `chart.js` / `vue-chartjs` option and dataset
	 * types degrade to `any`, which propagates through the chart components.
	 *
	 * Boundary rules are untouched and stay at error: nothing here relaxes what
	 * this module may import.
	 */
	rules: {
		'typescript/no-unsafe-argument': 'warn',
		'typescript/no-unsafe-assignment': 'warn',
		'typescript/no-unsafe-call': 'warn',
		'typescript/no-unsafe-member-access': 'warn',
		'typescript/no-unsafe-return': 'warn',
		'typescript/await-thenable': 'warn',
		'typescript/require-await': 'warn',
	},
});
