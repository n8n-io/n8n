import { frontendConfig } from './frontend.js';

const residualScriptRules = new Set([
	'@typescript-eslint/consistent-type-imports',
	'@typescript-eslint/prefer-optional-chain',
	'import-x/export',
	'no-dupe-args',
	'no-octal',
	'no-undef',
]);

const isResidualRule = (rule: string) =>
	rule.startsWith('vue/') ||
	rule === '@n8n/design-system/require-teleported-tooltip-in-dropdown' ||
	residualScriptRules.has(rule);

export const frontendOxlintResidualConfig = frontendConfig.map((config) => ({
	...config,
	rules: Object.fromEntries(
		Object.entries(config.rules ?? {}).map(([rule, value]) => [
			rule,
			isResidualRule(rule) ? value : 'off',
		]),
	),
}));

frontendOxlintResidualConfig.push({
	files: ['**/*.vue'],
	rules: { 'unused-imports/no-unused-imports': 'error' },
});

export default frontendOxlintResidualConfig;
