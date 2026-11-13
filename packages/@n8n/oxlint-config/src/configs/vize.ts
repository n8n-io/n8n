/**
 * Shared `vize lint` config for the Vue templates of the frontend packages.
 *
 * Oxlint lints only the script blocks of an SFC. Vize lints the template and
 * the SFC structure, so together they replace `eslint-plugin-vue`. The
 * `incremental` preset runs only the rules listed here. Each rule is one that
 * `@n8n/eslint-config/frontend` enforced at `error`, under Vize's name for it.
 *
 * A package passes a config file that default-exports `vizeConfig()` to
 * `vize lint -c <file>`. Vize does not read a file named `vize.config.*` as a
 * `-c` file, so do not use that name.
 *
 * The rule set and options were measured with Vize 0.715.0. Two rules that
 * ESLint enforced are not listed, because Vize 0.715.0 maps them but reports
 * nothing: `vue/valid-attribute-name` and `vue/valid-template-root`. Before you
 * raise the `vize` pin, do the checks in
 * `scripts/lint-parity/OXLINT_MIGRATION_BLOCKERS.md`, "Raise the Vize pin".
 */

type Severity = 'off' | 'warn' | 'error';

export interface VizeLintConfig {
	vue: {
		linter: {
			preset: 'incremental';
			rules: Record<string, Severity>;
			ruleOptions: Record<string, unknown>;
		};
	};
}

export interface VizeConfigOptions {
	/**
	 * Component names that `vue/require-component-registration` accepts without
	 * an import or a registration. Same as the `ignorePatterns` of ESLint's
	 * `vue/no-undef-components`.
	 */
	componentGlobals?: string[];
}

export const defaultComponentGlobals = [
	'RouterLink', // Vue Router global component
	'RouterView', // Vue Router global component
	'Teleport', // Vue 3 built-in
	'Transition', // Vue 3 built-in
	'TransitionGroup', // Vue 3 built-in
	'KeepAlive', // Vue 3 built-in
	'Suspense', // Vue 3 built-in
];

export const vizeRules: Record<string, Severity> = {
	'script/no-deprecated-dollar-listeners-api': 'error',
	'script/no-deprecated-dollar-scopedslots-api': 'error',
	'script/no-ref-as-operand': 'error',
	'script/no-use-computed-property-like-method': 'error',
	'script/require-valid-default-prop': 'error',
	'vue/attribute-hyphenation': 'error',
	'vue/comment-directive': 'error',
	'vue/component-name-in-template-casing': 'error',
	'vue/jsx-uses-vars': 'error',
	'vue/no-child-content': 'error',
	'vue/no-deprecated-filter': 'error',
	'vue/no-deprecated-functional-template': 'error',
	'vue/no-deprecated-html-element-is': 'error',
	'vue/no-deprecated-inline-template': 'error',
	'vue/no-deprecated-router-link-tag-prop': 'error',
	'vue/no-deprecated-scope-attribute': 'error',
	'vue/no-deprecated-slot-attribute': 'error',
	'vue/no-deprecated-slot-scope-attribute': 'error',
	'vue/no-deprecated-v-bind-sync': 'error',
	'vue/no-deprecated-v-is': 'error',
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
	// ESLint: `vue/no-undef-components`.
	'vue/require-component-registration': 'error',
	'vue/require-toggle-inside-transition': 'error',
	'vue/require-v-for-key': 'error',
	// ESLint: `vue/block-order`.
	'vue/sfc-element-order': 'error',
	'vue/use-v-on-exact': 'error',
	'vue/v-slot-style': 'error',
	'vue/valid-v-bind': 'error',
	'vue/valid-v-cloak': 'error',
	'vue/valid-v-else': 'error',
	'vue/valid-v-else-if': 'error',
	'vue/valid-v-for': 'error',
	'vue/valid-v-html': 'error',
	'vue/valid-v-if': 'error',
	'vue/valid-v-is': 'error',
	'vue/valid-v-memo': 'error',
	'vue/valid-v-model': 'error',
	'vue/valid-v-on': 'error',
	'vue/valid-v-once': 'error',
	'vue/valid-v-pre': 'error',
	'vue/valid-v-show': 'error',
	'vue/valid-v-slot': 'error',
	'vue/valid-v-text': 'error',
};

export const vizeConfig = ({
	componentGlobals = defaultComponentGlobals,
}: VizeConfigOptions = {}): VizeLintConfig => ({
	vue: {
		linter: {
			preset: 'incremental',
			rules: vizeRules,
			ruleOptions: {
				'vue/attribute-hyphenation': 'always',
				'vue/component-name-in-template-casing': {
					casing: 'PascalCase',
					registeredComponentsOnly: false,
				},
				'vue/require-component-registration': { globals: componentGlobals },
				'vue/sfc-element-order': { order: ['script', 'template', 'style'] },
			},
		},
	},
});

export default vizeConfig;
