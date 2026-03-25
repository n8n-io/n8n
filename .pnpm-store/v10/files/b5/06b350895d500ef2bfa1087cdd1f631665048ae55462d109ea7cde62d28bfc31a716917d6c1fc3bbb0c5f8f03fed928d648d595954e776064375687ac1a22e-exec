// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

const globals = require('globals')
const noOnlyTests = require('eslint-plugin-no-only-tests')
const js = require('@eslint/js')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')
const mochaPlugin = require('eslint-plugin-mocha')
const nodePlugin = require('eslint-plugin-n')

module.exports = [
  js.configs.recommended,
  eslintPluginPrettierRecommended,
  mochaPlugin.configs.flat.recommended,
  nodePlugin.configs['flat/recommended-script'],
  {
    languageOptions: {
      globals: {
        mocha: true,
        es6: true,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 2022,
      },
    },
    files: ['**/*.js', 'lib/http.js'],
    ignores: ['node_modules/*', 'generator/*', 'devtools/generator/'],
    plugins: {
      'no-only-tests': noOnlyTests,
    },
    rules: {
      'no-const-assign': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          args: 'all',
          argsIgnorePattern: '^_',
        },
      ],
      'constructor-super': 'error',
      'valid-typeof': 'error',
      'no-only-tests/no-only-tests': 'error',
      'n/no-deprecated-api': ['error'],
      'n/no-missing-import': ['error'],
      'n/no-missing-require': ['error'],
      'n/no-mixed-requires': ['error'],
      'n/no-new-require': ['error'],
      'n/no-unpublished-import': ['error'],
      'n/no-unpublished-require': [
        'error',
        {
          allowModules: [
            'globals',
            '@eslint/js',
            'eslint-plugin-mocha',
            'eslint-plugin-prettier',
            'eslint-plugin-n',
            'eslint-plugin-no-only-tests',
          ],
          tryExtensions: ['.js'],
        },
      ],
      'n/prefer-node-protocol': ['error'],
      'mocha/no-skipped-tests': ['off'],
      'mocha/no-mocha-arrows': ['off'],
      'mocha/no-setup-in-describe': ['off'],
      'mocha/no-top-level-hooks': ['off'],
      'mocha/no-sibling-hooks': ['off'],
      'mocha/no-exports': ['off'],
      'mocha/no-empty-description': ['off'],
      'mocha/max-top-level-suites': ['off'],
      'mocha/consistent-spacing-between-blocks': ['off'],
      'mocha/no-nested-tests': ['off'],
      'mocha/no-pending-tests': ['off'],
      'mocha/no-identical-title': ['off'],
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'lf',
          printWidth: 120,
          semi: false,
          singleQuote: true,
          trailingComma: 'all',
        },
      ],
    },
  },
]
