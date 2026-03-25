# stylelint-config-recommended

[![NPM version](https://img.shields.io/npm/v/stylelint-config-recommended.svg)](https://www.npmjs.org/package/stylelint-config-recommended) [![Build Status](https://github.com/stylelint/stylelint-config-recommended/workflows/CI/badge.svg)](https://github.com/stylelint/stylelint-config-recommended/actions)

> The recommended shareable config for Stylelint.

It turns on most of the Stylelint rules that help you [_avoid errors_](https://stylelint.io/user-guide/rules/#avoid-errors).

You can use this as a foundation for your own config, but we suggest most people use our [standard config](https://www.npmjs.com/package/stylelint-config-standard) instead which extends this config and adds a few more rules to enforce common conventions.

## Installation

```bash
npm install stylelint-config-recommended --save-dev
```

## Usage

Set your `stylelint` config to:

```json
{
  "extends": "stylelint-config-recommended"
}
```

### Extending the config

Add a `"rules"` key to your config, then add your overrides and additions there.

For example, to change the `at-rule-no-unknown` rule to use its `ignoreAtRules` option, turn off the `block-no-empty` rule, and add the `unit-allowed-list` rule:

```json
{
  "extends": "stylelint-config-recommended",
  "rules": {
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["extends"]
      }
    ],
    "block-no-empty": null,
    "unit-allowed-list": ["em", "rem", "s"]
  }
}
```

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
