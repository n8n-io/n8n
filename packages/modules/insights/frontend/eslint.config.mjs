import { frontendConfig } from '@n8n/eslint-config/frontend';
import { defineConfig } from 'eslint/config';

export default defineConfig(frontendConfig, {
	/**
	 * Suppressions inherited with the code, not granted to it.
	 *
	 * These files came from `editor-ui/src/features/execution/insights`, where
	 * `eslint.config.mjs` turns each of these rules off or down to `warn` for the
	 * whole shell. The move is content-pristine on purpose — blame and `--follow`
	 * survive — so the debt travels with it instead of being rewritten in the same
	 * PR. `warn` here, never `off`: the count is visible and can only go down.
	 *
	 * Most of it is one root cause: `chart.js` / `vue-chartjs` option and dataset
	 * types degrade to `any`, which propagates through the chart components. The
	 * `naming-convention` hits are data keys (`2weeks`, `6months`, `update:options`)
	 * that cannot be camelCase — those need a narrow inline disable, not a fix.
	 *
	 * Boundary rules are untouched and stay at error: nothing here relaxes what
	 * this module may import.
	 */
	files: ['src/**/*.ts', 'src/**/*.vue'],
	rules: {
		'@typescript-eslint/naming-convention': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/await-thenable': 'warn',
		'@typescript-eslint/require-await': 'warn',
	},
});
