import { createRequire } from 'node:module';
import { defineConfig } from 'oxlint';

// pnpm does not hoist workspace packages, so oxlint cannot resolve this one by name.
const designSystemPlugin = createRequire(import.meta.url).resolve(
	'@n8n/eslint-plugin-design-system',
);

/**
 * oxlint translation of the Vue script rules in `@n8n/eslint-config/frontend`.
 *
 * Oxlint lints only the script block of an SFC. The template and SFC-structure
 * rules run in the Vize CLI, from `@n8n/oxlint-config/vize`.
 */
export const vueConfig = defineConfig({
	plugins: ['vue'],
	jsPlugins: ['@n8n/eslint-config/plugin', designSystemPlugin],
	categories: { correctness: 'off' },
	rules: {
		// ----------------------------------
		//        oxlint native (script)
		// ----------------------------------
		'vue/define-emits-declaration': ['error', 'type-literal'],
		'vue/no-arrow-functions-in-watch': 'error',
		'vue/no-async-in-computed-properties': 'error',
		'vue/no-computed-properties-in-data': 'error',
		'vue/no-deprecated-data-object-declaration': 'error',
		'vue/no-deprecated-delete-set': 'error',
		'vue/no-deprecated-destroyed-lifecycle': 'error',
		'vue/no-deprecated-events-api': 'error',
		'vue/no-deprecated-model-definition': 'error',
		'vue/no-deprecated-props-default-this': 'error',
		'vue/no-deprecated-vue-config-keycodes': 'error',
		'vue/no-dupe-keys': 'error',
		'vue/no-export-in-script-setup': 'error',
		'vue/no-expose-after-await': 'error',
		'vue/no-lifecycle-after-await': 'error',
		'vue/no-reserved-component-names': [
			'error',
			{ disallowVueBuiltInComponents: true, disallowVue3BuiltInComponents: false },
		],
		'vue/no-reserved-keys': 'error',
		'vue/no-reserved-props': 'error',
		'vue/no-shared-component-data': 'error',
		'vue/no-watch-after-await': 'error',
		'vue/prefer-import-from-vue': 'error',
		'vue/prop-name-casing': ['error', 'camelCase'],
		'vue/require-prop-type-constructor': 'error',
		'vue/require-render-return': 'error',
		'vue/require-slots-as-functions': 'error',
		'vue/return-in-emits-validator': 'error',
		'vue/valid-define-emits': 'error',
		'vue/valid-define-options': 'error',
		'vue/valid-define-props': 'error',
		'vue/valid-next-tick': 'error',

		// ----------------------------------
		//         n8n ports of Vue rules
		// ----------------------------------
		'n8n-local-rules/require-macro-variable-name': 'error',
		'@n8n/design-system/require-teleported-tooltip-in-dropdown': 'error',
	},
});

export default vueConfig;
