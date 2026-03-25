'use strict';

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended
});

module.exports = [
    {
        ignores: ['node_modules/**', 'CHANGELOG.md']
    },
    ...compat.extends('nodemailer', 'prettier'),
    {
        languageOptions: {
            ecmaVersion: 2017,
            sourceType: 'script'
        },
        rules: {
            'no-useless-concat': 0,
            'no-unused-vars': ['error', { caughtErrors: 'none' }],
            indent: 'off',
            quotes: 'off',
            'linebreak-style': 'off',
            semi: 'off',
            'comma-dangle': 'off',
            'comma-style': 'off',
            'arrow-parens': 'off'
        }
    }
];
