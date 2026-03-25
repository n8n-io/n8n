module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/standard',
    // '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'indent': ['off'],
		'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/script-indent': ['error', 2, { baseIndent: 1, switchCase: 1 }],
    'vue/html-closing-bracket-spacing': ['error', { selfClosingTag: 'never' }],
    // 'vue/component-definition-name-casing': ['error', 'kebab-case'],
    'vue/singleline-html-element-content-newline': ['off'],
    'vue/require-default-prop': ['off'],
    'vue/max-attributes-per-line': ['off'],
    'vue/no-unused-components': ['warn'],
    'no-unused-vars': ['warn'],
    'vue/html-self-closing': ['warn', { html: { void: 'always' } }],
    'curly': ['error', 'multi-line'],
    'arrow-parens': ['warn', 'as-needed'],
    'no-return-assign': ['off'],
    'require-await': ['off'],
    'vue/no-v-html': ['off'],
    'quote-props': ['warn', 'consistent-as-needed'],
    'vue/order-in-components': ['error', {
      order: [
        'el',
        'name',
        'key',
        'parent',
        'functional',
        ['delimiters', 'comments'],
        ['components', 'directives', 'filters'],
        'icons',
        'extends',
        'mixins',
        ['provide', 'inject'],
        'ROUTER_GUARDS',
        'layout',
        'middleware',
        'validations',
        'validationConfig',
        'scrollToTop',
        'transition',
        'loading',
        'inheritAttrs',
        'model',
        ['props', 'propsData'],
        'emits',
        'setup',
        'asyncData',
        'head',
        'data',
        'fetch',
        'computed',
        'watch',
        'watchQuery',
        'LIFECYCLE_HOOKS',
        'methods',
        ['template', 'render'],
        'renderError'
      ]
    }]
  },
	overrides: [
		{
			files: [
				'**/__tests__/*.{j,t}s?(x)',
				'**/tests/unit/**/*.spec.{j,t}s?(x)'
			],
			env: {
				jest: true
			}
		}
	],
}
