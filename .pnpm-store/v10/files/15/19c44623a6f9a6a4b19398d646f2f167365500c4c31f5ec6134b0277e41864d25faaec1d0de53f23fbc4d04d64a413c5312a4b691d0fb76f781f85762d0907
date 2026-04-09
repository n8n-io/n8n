import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([
  globalIgnores(['src/**/*.d.ts']),
  {
    extends: compat.extends('plugin:@typescript-eslint/eslint-recommended'),

    plugins: {
      '@typescript-eslint': typescriptEslint,
      '@stylelistic': stylistic,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: './tsconfig.json',
      },
    },

    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'arrow-parens': ['error', 'always'],

      'arrow-spacing': ['error', {
        before: true,
        after: true,
      }],

      'block-spacing': 'error',

      'brace-style': ['error', '1tbs', {
        allowSingleLine: true,
      }],

      'comma-dangle': ['error', 'only-multiline'],
      'comma-spacing': 'error',
      'comma-style': 'error',
      'computed-property-spacing': 'error',
      'constructor-super': 'error',
      'dot-location': ['error', 'property'],
      'dot-notation': 'error',
      'eol-last': 'error',
      'eqeqeq': ['error', 'smart'],
      'for-direction': 'error',
      'func-call-spacing': 'error',
      'func-name-matching': 'error',

      'func-style': ['error', 'declaration', {
        allowArrowFunctions: true,
      }],

      'indent': ['error', 2, {
        ArrayExpression: 'first',

        CallExpression: {
          arguments: 'first',
        },

        FunctionDeclaration: {
          parameters: 'first',
        },

        FunctionExpression: {
          parameters: 'first',
        },

        MemberExpression: 'off',
        ObjectExpression: 'first',
        SwitchCase: 1,
      }],

      'key-spacing': ['error', {
        mode: 'strict',
      }],

      'keyword-spacing': 'error',
      'linebreak-style': ['error', 'unix'],
      'new-parens': 'error',
      'no-class-assign': 'error',
      'no-confusing-arrow': 'error',
      'no-const-assign': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-delete-var': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'error',
      'no-empty-character-class': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-parens': ['error', 'functions'],
      'no-extra-semi': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-lonely-if': 'error',
      'no-misleading-character-class': 'error',
      'no-mixed-requires': 'error',
      'no-mixed-spaces-and-tabs': 'error',

      'no-multi-spaces': ['error', {
        ignoreEOLComments: true,
      }],

      'no-multiple-empty-lines': ['error', {
        max: 2,
        maxEOF: 0,
        maxBOF: 0,
      }],

      'no-negated-in-lhs': 'error',
      'no-new-require': 'error',
      'no-new-symbol': 'error',
      'no-obj-calls': 'error',
      'no-octal': 'error',
      'no-path-concat': 'error',
      'no-proto': 'error',
      'no-redeclare': 'error',
      'no-restricted-modules': ['error', 'sys'],

      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.name='setTimeout'][arguments.length<2]",
        message: '`setTimeout()` must be invoked with at least two arguments.',
      }, {
        selector: "CallExpression[callee.name='setInterval'][arguments.length<2]",
        message: '`setInterval()` must be invoked with at least two arguments.',
      }, {
        selector: 'ThrowStatement > CallExpression[callee.name=/Error$/]',
        message: 'Use `new` keyword when throwing an `Error`.',
      }],

      'no-return-await': 'off',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-tabs': 'error',
      'no-template-curly-in-string': 'error',
      'no-this-before-super': 'error',
      'no-throw-literal': 'error',
      'no-trailing-spaces': 2,
      'no-undef-init': 'error',
      'no-unexpected-multiline': 2,
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unused-labels': 'error',

      'no-unused-vars': ['error', {
        args: 'none',
        caughtErrors: 'all',
      }],

      'no-use-before-define': ['error', {
        classes: true,
        functions: false,
        variables: false,
      }],

      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'no-whitespace-before-property': 'error',
      'no-with': 'error',
      'object-curly-spacing': ['error', 'always'],

      'one-var': ['error', {
        initialized: 'never',
      }],

      'one-var-declaration-per-line': 'error',
      'operator-linebreak': ['error', 'after'],

      'prefer-const': ['error', {
        ignoreReadBeforeAssign: true,
      }],

      'quotes': ['error', 'single', {
        avoidEscape: true,
      }],

      'quote-props': ['error', 'consistent'],
      'rest-spread-spacing': 'error',
      'semi': 'error',
      'semi-spacing': 'error',
      'space-before-blocks': ['error', 'always'],

      'space-before-function-paren': ['error', {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always',
      }],

      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',

      'spaced-comment': ['error', 'always', {
        block: {
          balanced: true,
        },

        exceptions: ['-'],
      }],

      'symbol-description': 'error',
      'template-curly-spacing': 'error',
      'unicode-bom': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
  {
    files: ['**/*.ts'],

    rules: {
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',

      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',

      '@typescript-eslint/consistent-type-assertions': 'error',

      '@stylelistic/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },

        singleline: {
          delimiter: 'comma',
          requireLast: false,
        },
      }],

      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',

      '@typescript-eslint/no-this-alias': ['error', {
        allowDestructuring: true,
        allowedNames: ['self'],
      }],

      'no-unused-vars': 'off',

      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'none',
        caughtErrors: 'all',
      }],

      'no-use-before-define': 'off',

      '@typescript-eslint/no-use-before-define': ['error', {
        classes: true,
        functions: false,
        variables: false,
      }],

      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      '@stylelistic/type-annotation-spacing': 'error',
      '@typescript-eslint/return-await': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
    },
  },
  {
    files: ['test/**/*'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  }
]);
