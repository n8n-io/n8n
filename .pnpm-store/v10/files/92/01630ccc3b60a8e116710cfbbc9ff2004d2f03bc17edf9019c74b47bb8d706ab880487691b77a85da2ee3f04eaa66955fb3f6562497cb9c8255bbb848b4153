'use strict';

const globals = require('globals');

module.exports = [
    {
        ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'build/**', '.nyc_output/**']
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2017,
            sourceType: 'script',
            globals: Object.assign({}, globals.node, globals.es2017, {
                it: true,
                describe: true,
                beforeEach: true,
                afterEach: true
            })
        },
        rules: {
            // Error detection
            'for-direction': 'error',
            'no-await-in-loop': 'error',
            'no-div-regex': 'error',
            eqeqeq: 'error',
            'dot-notation': 'error',
            curly: 'error',
            'no-fallthrough': 'error',
            'no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true
                }
            ],
            'no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],
            'handle-callback-err': 'error',
            'no-new': 'error',
            'new-cap': 'error',
            'no-eval': 'error',
            'no-invalid-this': 'error',
            radix: ['error', 'always'],
            'no-use-before-define': ['error', 'nofunc'],
            'callback-return': ['error', ['callback', 'cb', 'done']],
            'no-regex-spaces': 'error',
            'no-empty': 'error',
            'no-duplicate-case': 'error',
            'no-empty-character-class': 'error',
            'no-redeclare': 'off', // Disabled per project preference
            'block-scoped-var': 'error',
            'no-sequences': 'error',
            'no-throw-literal': 'error',
            'no-useless-call': 'error',
            'no-useless-concat': 'error',
            'no-void': 'error',
            yoda: 'error',
            'no-undef': 'error',
            'global-require': 'error',
            'no-var': 'error',
            'no-bitwise': 'error',
            'no-lonely-if': 'error',
            'no-mixed-spaces-and-tabs': 'error',
            'arrow-body-style': ['error', 'as-needed'],
            'arrow-parens': ['error', 'as-needed'],
            'prefer-arrow-callback': 'error',
            'object-shorthand': 'error',
            'prefer-spread': 'error',
            'no-prototype-builtins': 'off', // Disabled per project preference
            strict: ['error', 'global'],

            // Disable all formatting rules (handled by Prettier)
            indent: 'off',
            quotes: 'off',
            'linebreak-style': 'off',
            semi: 'off',
            'quote-props': 'off',
            'comma-dangle': 'off',
            'comma-style': 'off'
        }
    }
];
