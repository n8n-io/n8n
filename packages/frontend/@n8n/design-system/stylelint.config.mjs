import { fileURLToPath } from 'node:url';
import { baseConfig } from '@n8n/stylelint-config/base';
import { componentCssVars } from '@n8n/stylelint-config/rules';

const themeFiles = ['_primitives.scss', '_tokens.scss', '_tokens.legacy.scss'].map((file) =>
	fileURLToPath(new URL(`./src/css/${file}`, import.meta.url)),
);

const componentVariables = (ignoreVariables = []) => [true, { themeFiles, ignoreVariables }];

// These values come from component state or Reka's layout measurements.
const runtimeVariables = {
	'src/components/N8nContextMenu/*.vue': ['--reka-context-menu-content-available-height'],
	'src/components/N8nDropdownMenu/*.vue': ['--reka-dropdown-menu-content-available-height'],
	'src/components/N8nTooltip/Tooltip.vue': [
		'--reka-tooltip-content-available-height',
		'--reka-tooltip-content-transform-origin',
	],
	'src/components/N8nMarkdownEditor/MarkdownEditor.vue': [
		'--markdown-editor-max-height',
		'--markdown-editor-raw-height',
	],
	'src/components/N8nMenuItem/MenuItem.vue': ['--menu-item--label-overflow'],
	'src/components/N8nSpinner/Spinner.vue': ['--spinner-step'],
	'src/components/N8nSticky/Sticky.vue': [
		'--sticky--border-color--custom-dark',
		'--sticky--border-color--custom-light',
		'--sticky--color--text--custom',
	],
	'src/v2/components/Combobox/Combobox.vue': [
		'--reka-combobox-content-available-height',
		'--reka-combobox-trigger-width',
	],
	'src/v2/components/Select/Select.vue': [
		'--reka-select-content-available-height',
		'--reka-select-trigger-width',
	],
	'src/v2/components/Tree/TreeNodeDefault.vue': ['--indent'],
};

export default {
	...baseConfig,
	plugins: [...baseConfig.plugins, componentCssVars],
	rules: {
		...baseConfig.rules,
		'@n8n/css-var-naming': [true, { severity: 'error' }],
	},
	overrides: [
		...baseConfig.overrides,
		{
			files: ['src/components/**/*.{vue,scss}', 'src/v2/components/**/*.{vue,scss}'],
			rules: { '@n8n/component-css-vars': componentVariables() },
		},
		...Object.entries(runtimeVariables).map(([file, variables]) => ({
			files: [file],
			rules: { '@n8n/component-css-vars': componentVariables(variables) },
		})),
	],
};
