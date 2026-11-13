import { createRequire } from 'node:module';
import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';

const require = createRequire(import.meta.url);

export const frontendConfig = defineConfig({
	extends: [baseConfig],
	plugins: ['vue'],
	jsPlugins: [
		{
			name: '@n8n/design-system',
			specifier: require.resolve('@n8n/eslint-plugin-design-system'),
		},
	],
	env: { browser: true, node: true },
	rules: {
		'@stylistic/member-delimiter-style': 'off',
		'unicorn/filename-case': 'off',
		'@n8n/design-system/no-direct-component-imports': 'error',
		'typescript/no-deprecated': 'off',
		// The base layer leaves this rule off, because its fixer can remove an
		// import that `emitDecoratorMetadata` needs. No frontend package uses decorators.
		'typescript/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
		// Oxlint reads `./X.vue?raw` as a second import of `./X.vue`. import-x
		// resolves them to different modules, so a Vite query import is not a duplicate.
		'import/no-duplicates': ['error', { considerQueryString: true }],

		// The script-side rules of `eslint-plugin-vue`. They also check
		// `defineComponent` objects in `.ts` files, so they apply to every file.
		// Vize checks the templates (`@n8n/oxlint-config/vize`).
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
		'vue/no-reserved-keys': 'error',
		'vue/no-reserved-props': 'error',
		'vue/no-shared-component-data': 'error',
		'vue/no-side-effects-in-computed-properties': 'error',
		'vue/no-watch-after-await': 'error',
		'vue/prefer-import-from-vue': 'error',
		// ESLint's default options. The `**/*.vue` override below sets n8n's options.
		'vue/no-reserved-component-names': 'error',
		'vue/require-prop-type-constructor': 'error',
		'vue/require-render-return': 'error',
		'vue/require-slots-as-functions': 'error',
		'vue/return-in-computed-property': 'error',
		'vue/return-in-emits-validator': 'error',
		'vue/valid-define-emits': 'error',
		'vue/valid-define-options': 'error',
		'vue/valid-define-props': 'error',
		'vue/valid-next-tick': 'error',
	},
	overrides: [
		{
			files: ['**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts', '**/*.stories.ts'],
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: {
				// TODO: remove these
				'n8n-local-rules/no-internal-package-import': 'warn',
			},
		},
		{
			files: ['**/*.vue'],
			// An override that names a jsPlugin rule must re-declare the plugin.
			jsPlugins: [
				'@n8n/eslint-config/plugin',
				{
					name: '@n8n/design-system',
					specifier: require.resolve('@n8n/eslint-plugin-design-system'),
				},
			],
			rules: {
				'constructor-super': 'error',
				'getter-return': 'error',
				'no-class-assign': 'error',
				'no-const-assign': 'error',
				'no-dupe-class-members': 'error',
				'no-dupe-keys': 'error',
				'no-func-assign': 'error',
				'no-import-assign': 'error',
				'no-new-native-nonconstructor': 'error',
				'no-obj-calls': 'error',
				'no-redeclare': 'error',
				'no-setter-return': 'error',
				'no-this-before-super': 'error',
				'no-unreachable': 'error',
				'no-unsafe-negation': 'error',
				'no-with': 'error',
				'unused-imports/no-unused-imports': 'off',
				'vue/define-emits-declaration': ['error', 'type-literal'],
				'vue/no-reserved-component-names': [
					'error',
					{ disallowVueBuiltInComponents: true, disallowVue3BuiltInComponents: false },
				],
				'vue/prop-name-casing': ['error', 'camelCase'],
				'n8n-local-rules/require-macro-variable-name': 'error',
				// Oxlint runs it only on an SFC with a `<script>` block.
				'@n8n/design-system/require-teleported-tooltip-in-dropdown': 'error',

				// TODO: remove these
				'vue/no-side-effects-in-computed-properties': 'warn',
				'vue/return-in-computed-property': 'warn',
				'n8n-local-rules/no-internal-package-import': 'warn',
			},
		},
	],
});

export default frontendConfig;
