import type { VizeConfig } from 'vize';

/**
 * Vize translation of the template and SFC-structure rules that
 * `eslint-plugin-vue` enforced in `@n8n/eslint-config/frontend`.
 *
 * Vize parses the whole SFC, so it reports exact template positions, lints an
 * SFC without a `<script>` block, and reports template parse errors. The
 * `incremental` preset runs only the rules listed here.
 *
 * Vize does not read `extends` from a JSON path, so a package config imports
 * this object: `defineConfig(vizeConfig)`, or spreads it to add `entries`.
 * To suppress a rule for some files, add an `entries` item with `files` and
 * `linter.rules`. Globs resolve from the config file.
 *
 * `vue/no-deprecated-filter` is retired. Vize reads the `|` of a TypeScript
 * union in a template cast (`el as Element | null`) as a Vue 2 filter.
 */
export const vizeConfig: VizeConfig = {
	linter: {
		enabled: true,
		preset: 'incremental',
		rules: {
			'vue/attribute-hyphenation': 'error',
			'vue/component-name-in-template-casing': 'error',
			'vue/no-child-content': 'error',
			'vue/no-deprecated-functional-template': 'error',
			'vue/no-deprecated-html-element-is': 'error',
			'vue/no-deprecated-inline-template': 'error',
			'vue/no-deprecated-router-link-tag-prop': 'error',
			'vue/no-deprecated-scope-attribute': 'error',
			'vue/no-deprecated-slot-attribute': 'error',
			'vue/no-deprecated-slot-scope-attribute': 'error',
			'vue/no-deprecated-v-bind-sync': 'error',
			'vue/no-deprecated-v-on-native-modifier': 'error',
			'vue/no-deprecated-v-on-number-modifiers': 'error',
			'vue/no-dupe-v-else-if': 'error',
			'vue/no-duplicate-attributes': 'error',
			'vue/no-multiple-template-root': 'error',
			'vue/no-template-key': 'error',
			'vue/no-textarea-mustache': 'error',
			'vue/no-unused-components': 'error',
			'vue/no-unused-vars': 'error',
			'vue/no-use-v-if-with-v-for': 'error',
			'vue/no-useless-template-attributes': 'error',
			'vue/no-v-for-template-key-on-child': 'error',
			'vue/no-v-html': 'error',
			'vue/require-component-is': 'error',
			// eslint-plugin-vue: `no-undef-components`.
			'vue/require-component-registration': 'error',
			'vue/require-toggle-inside-transition': 'error',
			'vue/require-v-for-key': 'error',
			// eslint-plugin-vue: `block-order`.
			'vue/sfc-element-order': 'error',
			'vue/use-v-on-exact': 'error',
			'vue/v-slot-style': 'error',
			'vue/valid-attribute-name': 'error',
			'vue/valid-template-root': 'error',
			'vue/valid-v-bind': 'error',
			'vue/valid-v-cloak': 'error',
			'vue/valid-v-else': 'error',
			'vue/valid-v-for': 'error',
			'vue/valid-v-html': 'error',
			'vue/valid-v-if': 'error',
			'vue/valid-v-memo': 'error',
			'vue/valid-v-model': 'error',
			'vue/valid-v-on': 'error',
			'vue/valid-v-once': 'error',
			'vue/valid-v-show': 'error',
			'vue/valid-v-slot': 'error',
			'vue/valid-v-text': 'error',
			'script/no-deprecated-dollar-listeners-api': 'error',
			'script/no-deprecated-dollar-scopedslots-api': 'error',
			'script/no-ref-as-operand': 'error',
			'script/no-use-computed-property-like-method': 'error',
			'script/require-valid-default-prop': 'error',
		},
		ruleOptions: {
			'vue/attribute-hyphenation': 'always',
			'vue/component-name-in-template-casing': { casing: 'PascalCase' },
			'vue/sfc-element-order': { order: ['script', 'template', 'style'] },
		},
	},
};

export default vizeConfig;
