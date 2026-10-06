import { createRequire } from 'node:module';
import { defineConfig } from 'oxlint';

// pnpm does not hoist workspace packages, so oxlint cannot resolve this one by name.
const designSystemPlugin = createRequire(import.meta.url).resolve(
	'@n8n/eslint-plugin-design-system',
);

/**
 * oxlint translation of the Vue rules in `@n8n/eslint-config/frontend`.
 *
 * Oxlint lints only the script block of an SFC. Vize (`oxlint-plugin-vize`)
 * parses the whole SFC and adds the template and SFC-structure rules as
 * `vize/vue/*` and `vize/script/*`. The `incremental` preset runs only the
 * rules listed here.
 *
 * Vize reports a template diagnostic at the start of the script block, because
 * oxlint rejects a location outside it. The message ends with the real
 * position, for example `(at <template>:12:5)`. A `.vue` file without a
 * `<script>` block gets no Vize diagnostics.
 *
 * To suppress a template rule, put `<!-- eslint-disable-next-line vue/<rule> -->`
 * in the template. Vize reads that comment itself.
 *
 * oxlint does not pass `settings` or `ignorePatterns` through `extends`. A
 * package config that extends this layer must set `settings: vueConfig.settings`
 * (or `frontendConfig.settings` for the frontend layer). Without it, Vize
 * applies its default preset and silently skips every listed rule outside it.
 */
export const vueConfig = defineConfig({
	plugins: ['vue'],
	jsPlugins: ['oxlint-plugin-vize', '@n8n/eslint-config/plugin', designSystemPlugin],
	categories: { correctness: 'off' },
	settings: {
		vize: { preset: 'incremental', helpLevel: 'none' },
	},
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
		//        Vize (template and SFC)
		// ----------------------------------
		'vize/vue/attribute-hyphenation': ['error', 'always'],
		'vize/vue/component-name-in-template-casing': ['error', 'PascalCase'],
		'vize/vue/no-child-content': 'error',
		// `vue/no-deprecated-filter` is retired. Vize reads the `|` of a TypeScript
		// union in a template cast (`el as Element | null`) as a Vue 2 filter.
		'vize/vue/no-deprecated-functional-template': 'error',
		'vize/vue/no-deprecated-html-element-is': 'error',
		'vize/vue/no-deprecated-inline-template': 'error',
		'vize/vue/no-deprecated-router-link-tag-prop': 'error',
		'vize/vue/no-deprecated-scope-attribute': 'error',
		'vize/vue/no-deprecated-slot-attribute': 'error',
		'vize/vue/no-deprecated-slot-scope-attribute': 'error',
		'vize/vue/no-deprecated-v-bind-sync': 'error',
		'vize/vue/no-deprecated-v-on-native-modifier': 'error',
		'vize/vue/no-deprecated-v-on-number-modifiers': 'error',
		'vize/vue/no-dupe-v-else-if': 'error',
		'vize/vue/no-duplicate-attributes': 'error',
		'vize/vue/no-multiple-template-root': 'error',
		'vize/vue/no-template-key': 'error',
		'vize/vue/no-textarea-mustache': 'error',
		'vize/vue/no-unused-components': 'error',
		'vize/vue/no-unused-vars': 'error',
		'vize/vue/no-use-v-if-with-v-for': 'error',
		'vize/vue/no-useless-template-attributes': 'error',
		'vize/vue/no-v-for-template-key-on-child': 'error',
		'vize/vue/no-v-html': 'error',
		'vize/vue/require-component-is': 'error',
		// eslint-plugin-vue: `no-undef-components`.
		'vize/vue/require-component-registration': 'error',
		'vize/vue/require-toggle-inside-transition': 'error',
		'vize/vue/require-v-for-key': 'error',
		// eslint-plugin-vue: `block-order`.
		'vize/vue/sfc-element-order': ['error', { order: ['script', 'template', 'style'] }],
		'vize/vue/use-v-on-exact': 'error',
		'vize/vue/v-slot-style': 'error',
		'vize/vue/valid-attribute-name': 'error',
		'vize/vue/valid-template-root': 'error',
		'vize/vue/valid-v-bind': 'error',
		'vize/vue/valid-v-cloak': 'error',
		'vize/vue/valid-v-else': 'error',
		'vize/vue/valid-v-for': 'error',
		'vize/vue/valid-v-html': 'error',
		'vize/vue/valid-v-if': 'error',
		'vize/vue/valid-v-memo': 'error',
		'vize/vue/valid-v-model': 'error',
		'vize/vue/valid-v-on': 'error',
		'vize/vue/valid-v-once': 'error',
		'vize/vue/valid-v-show': 'error',
		'vize/vue/valid-v-slot': 'error',
		'vize/vue/valid-v-text': 'error',
		'vize/script/no-deprecated-dollar-listeners-api': 'error',
		'vize/script/no-deprecated-dollar-scopedslots-api': 'error',
		'vize/script/no-ref-as-operand': 'error',
		'vize/script/no-use-computed-property-like-method': 'error',
		'vize/script/require-valid-default-prop': 'error',

		// ----------------------------------
		//         n8n ports of Vue rules
		// ----------------------------------
		'n8n-local-rules/require-macro-variable-name': 'error',
		'@n8n/design-system/require-teleported-tooltip-in-dropdown': 'error',
	},
});

export default vueConfig;
