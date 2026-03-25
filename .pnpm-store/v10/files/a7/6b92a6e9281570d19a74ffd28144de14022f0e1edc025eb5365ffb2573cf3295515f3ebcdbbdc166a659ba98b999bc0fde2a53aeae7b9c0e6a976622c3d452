'use strict'
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const rules = fs.readdirSync(path.resolve(__dirname, 'rules')).map(f => f.replace(/\.js$/, ''))
const recommended = {
    plugins: ['lodash'],
    rules: {
        'lodash/callback-binding': 2,
        'lodash/chain-style': [2, 'as-needed'],
        'lodash/chaining': 2,
        'lodash/collection-method-value': 2,
        'lodash/collection-ordering': 2,
        'lodash/collection-return': 2,
        'lodash/consistent-compose': [2, 'flow'],
        'lodash/identity-shorthand': [2, 'always'],
        'lodash/import-scope': [2],
        'lodash/matches-prop-shorthand': [2, 'always'],
        'lodash/matches-shorthand': [2, 'always', 3],
        'lodash/no-commit': 2,
        'lodash/no-double-unwrap': 2,
        'lodash/no-extra-args': 2,
        'lodash/no-unbound-this': 2,
        'lodash/path-style': [2, 'string'],
        'lodash/prefer-compact': 2,
        'lodash/prefer-constant': 2,
        'lodash/prefer-filter': [2, 3],
        'lodash/prefer-find': 2,
        'lodash/prefer-flat-map': 2,
        'lodash/prefer-get': [2, 3],
        'lodash/prefer-immutable-method': 2,
        'lodash/prefer-includes': [2, {includeNative: true}],
        'lodash/prefer-invoke-map': 2,
        'lodash/prefer-is-nil': 2,
        'lodash/prefer-lodash-chain': 2,
        'lodash/prefer-lodash-method': 2,
        'lodash/prefer-lodash-typecheck': 2,
        'lodash/prefer-map': 2,
        'lodash/prefer-matches': [2, 3],
        'lodash/prefer-noop': 2,
        'lodash/prefer-over-quantifier': 2,
        'lodash/prefer-reject': [2, 3],
        'lodash/prefer-some': [2, {includeNative: true}],
        'lodash/prefer-startswith': 2,
        'lodash/prefer-thru': 2,
        'lodash/prefer-times': 2,
        'lodash/prefer-wrapper-method': 2,
        'lodash/preferred-alias': 2,
        'lodash/prop-shorthand': [2, 'always'],
        'lodash/unwrap': 2
    }
}

const plugin = {
    meta:  {
        name: 'eslint-plugin-lodash'
    },
    rules: _.zipObject(rules, rules.map(rule => require(`./rules/${rule}`))),
    configs: {
        recommended,
        canonical: _.defaultsDeep({
            settings: {lodash: {pragma: '_'}},
            rules: {
                'lodash/import-scope': [2, 'full']
            }
        }, recommended),
        v3: {
            settings: {
                lodash: {
                    version: 3,
                    pragma: '_'
                }
            },
            rules: {
                'lodash/callback-binding': 2,
                'lodash/chain-style': [2, 'as-needed'],
                'lodash/chaining': [2, 'implicit'],
                'lodash/collection-method-value': 2,
                'lodash/collection-return': 2,
                'lodash/consistent-compose': [2, 'flow'],
                'lodash/import-scope': [2, 'full'],
                'lodash/identity-shorthand': [2, 'always'],
                'lodash/matches-prop-shorthand': [2, 'always'],
                'lodash/matches-shorthand': [2, 'always', 3],
                'lodash/no-commit': 2,
                'lodash/no-double-unwrap': 2,
                'lodash/no-extra-args': 2,
                'lodash/path-style': [2, 'string'],
                'lodash/prefer-compact': 2,
                'lodash/prefer-constant': 2,
                'lodash/prefer-filter': [2, 3],
                'lodash/prefer-get': [2, 3],
                'lodash/prefer-includes': [2, {includeNative: true}],
                'lodash/prefer-lodash-chain': 2,
                'lodash/prefer-lodash-method': 2,
                'lodash/prefer-lodash-typecheck': 2,
                'lodash/prefer-map': 2,
                'lodash/prefer-matches': [2, 3],
                'lodash/prefer-noop': 2,
                'lodash/prefer-reject': [2, 3],
                'lodash/prefer-some': [2, {includeNative: true}],
                'lodash/prefer-startswith': 2,
                'lodash/prefer-thru': 2,
                'lodash/prefer-times': 2,
                'lodash/prefer-wrapper-method': 2,
                'lodash/preferred-alias': 2,
                'lodash/prop-shorthand': [2, 'always'],
                'lodash/unwrap': 2
            }
        }
    },
    processors: {}
}

module.exports = plugin;
