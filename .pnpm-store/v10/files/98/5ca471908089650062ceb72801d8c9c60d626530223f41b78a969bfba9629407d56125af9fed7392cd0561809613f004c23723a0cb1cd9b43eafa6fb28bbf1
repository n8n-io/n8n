# eslint-doc-generator<!-- omit from toc -->

[![npm version][npm-image]][npm-url] ![test coverage](https://img.shields.io/badge/test%20coverage-100%25-green)

Automatic documentation generator for [ESLint](https://eslint.org/) plugins and rules. Inspired by documentation conventions from ESLint and [top](#users) ESLint [plugins](https://eslint.org/docs/latest/developer-guide/working-with-plugins).

Generates the following documentation covering a [wide variety](#column-and-notice-types) of rule metadata:

- `README.md` rules table
- `README.md` configs table
- Rule doc titles and notices
- Rule doc options lists

Also performs [configurable](#configuration-options) section consistency checks on rule docs:

- Contains an `## Options` or  `## Config` section and mentions each named option (for rules with options)

## Table of contents<!-- omit from toc -->

- [Motivation](#motivation)
- [Setup](#setup)
  - [Scripts](#scripts)
  - [Update `README.md`](#update-readmemd)
  - [Update rule docs](#update-rule-docs)
  - [Configure linting](#configure-linting)
- [Usage](#usage)
- [Examples](#examples)
  - [Rules list table](#rules-list-table)
  - [Configs list table](#configs-list-table)
  - [Rule doc notices](#rule-doc-notices)
  - [Rule doc options lists](#rule-doc-options-lists)
  - [Users](#users)
- [Configuration options](#configuration-options)
  - [Column and notice types](#column-and-notice-types)
  - [`--config-format`](#--config-format)
  - [`--rule-doc-title-format`](#--rule-doc-title-format)
  - [Configuration file](#configuration-file)
  - [Badges](#badges)
- [Compatibility](#compatibility)
  - [Build tools](#build-tools)
  - [markdownlint](#markdownlint)
  - [prettier](#prettier)
- [Semantic versioning policy](#semantic-versioning-policy)
- [Related](#related)

## Motivation

- Standardize documentation across thousands of ESLint plugins and rules
- Improve the discoverability of key rule information and thus rule usability
- Streamline the process of adding/updating rules while ensuring documentation is kept up-to-date
- Eliminate the custom documentation scripts and tests previously built and maintained by many ESLint plugins

## Setup

Install it:

```sh
npm i --save-dev eslint-doc-generator
```

### Scripts

Add scripts to `package.json`:

- Both a lint script to ensure everything is up-to-date in CI and an update script for contributors to run locally
- Add any [config options](#configuration-options) in the `update:eslint-docs` script only (or use a [config file](#configuration-file))
- Alternative scripts may be needed with [build tools](#build-tools), [markdownlint](#markdownlint), or [prettier](#prettier)

```json
{
  "scripts": {
    "lint": "npm-run-all \"lint:*\"",
    "lint:docs": "markdownlint \"**/*.md\"",
    "lint:eslint-docs": "npm run update:eslint-docs -- --check",
    "lint:js": "eslint .",
    "update:eslint-docs": "eslint-doc-generator"
  }
}
```

### Update `README.md`

Delete any old rules list from your `README.md`. A new one will be automatically added to your `## Rules` section (along with the following marker comments if they don't already exist):

```md
<!-- begin auto-generated rules list -->
<!-- end auto-generated rules list -->
```

Optionally, add these marker comments to your `README.md` in a `## Configs` section or similar location (uses the `meta.docs.description` property exported by each config if available):

```md
<!-- begin auto-generated configs list -->
<!-- end auto-generated configs list -->
```

### Update rule docs

Delete any old recommended/fixable/etc. notices from your rule docs. A new title and notices will be automatically added to the top of each rule doc (along with a marker comment if it doesn't already exist).

```md
<!-- end auto-generated rule header -->
```

Optionally, add these marker comments to your rule docs in an `## Options` section or similar location:

```md
<!-- begin auto-generated rule options list -->
<!-- end auto-generated rule options list -->
```

Note that rule option lists are subject-to-change as we add support for more kinds and properties of schemas. To fully take advantage of them, you'll want to ensure your rules have the `meta.schema` property fleshed out with properties like `description`, `type`, `enum`, `default`, `required`, `deprecated`.

### Configure linting

And be sure to enable the `recommended` rules from [eslint-plugin-eslint-plugin](https://github.com/eslint-community/eslint-plugin-eslint-plugin) as well as:

- [eslint-plugin/require-meta-docs-description](https://github.com/eslint-community/eslint-plugin-eslint-plugin/blob/main/docs/rules/require-meta-docs-description.md) to ensure your rules have consistent descriptions for use in the generated docs
- [eslint-plugin/require-meta-docs-url](https://github.com/eslint-community/eslint-plugin-eslint-plugin/blob/main/docs/rules/require-meta-docs-url.md) to ensure your rule docs are linked to by editors on highlighted violations
- [eslint-plugin/require-meta-schema](https://github.com/eslint-community/eslint-plugin-eslint-plugin/blob/main/docs/rules/require-meta-schema.md) to ensure your rules have schemas for use in determining options

## Usage

Run the script from `package.json` to start out or any time you add a rule or update rule metadata in your plugin:

```sh
npm run update:eslint-docs
```

## Examples

For examples, see our [users](#users) or the in-house examples below. Note that the in-house examples intentionally show all possible columns and notices.

### Rules list table

See the generated rules table and legend in our example [`README.md`](./docs/examples/eslint-plugin-test/README.md#rules).

### Configs list table

See the generated configs table in our example [`README.md`](./docs/examples/eslint-plugin-test/README.md#configs).

### Rule doc notices

See the generated rule doc title and notices in our example rule docs [`no-foo.md`](./docs/examples/eslint-plugin-test/docs/rules/no-foo.md), [`prefer-bar.md`](./docs/examples/eslint-plugin-test/docs/rules/prefer-bar.md), [`require-baz.md`](./docs/examples/eslint-plugin-test/docs/rules/require-baz.md).

### Rule doc options lists

See the generated rule doc options lists in our example rule doc [`no-foo.md`](./docs/examples/eslint-plugin-test/docs/rules/no-foo.md).

### Users

This tool is used by popular ESLint plugins like:

- [eslint-plugin-ava](https://github.com/avajs/eslint-plugin-ava#rules)
- [eslint-plugin-ember](https://github.com/ember-cli/eslint-plugin-ember#-rules)
- [eslint-plugin-eslint-plugin](https://github.com/eslint-community/eslint-plugin-eslint-plugin#rules)
- [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import#rules)
- [eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest#rules)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y#supported-rules)
- [eslint-plugin-promise](https://github.com/eslint-community/eslint-plugin-promise#rules)
- [eslint-plugin-qunit](https://github.com/platinumazure/eslint-plugin-qunit#rules)
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react#list-of-supported-rules)
- [eslint-plugin-unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn#rules)

## Configuration options

These can be provided as CLI options or as [config file](#configuration-file) options. All options are optional.

The CLI has an optional path argument if you need to point the CLI to an ESLint plugin directory that isn't just the current directory:

```sh
eslint-doc-generator path/to/eslint-plugin
```

There's also a `postprocess` option that's only available via a [config file](#configuration-file).

| Name | Description | Default |
| :-- | :-- | :-- |
| `--check` | Whether to check for and fail if there is a diff. Any diff will be displayed but no output will be written to files. Typically used during CI. | `false` |
| `--config-emoji` | Custom emoji to use for a config. Format is `config-name,emoji`. Option can be repeated. | Default emojis are provided for [common configs](./lib/emojis.ts). See [Badges](#badges) for an alternative to emojis. |
| `--config-format` | The format to use for config names. See choices in below [table](#--config-format). | `name` |
| `--ignore-config` | Config to ignore from being displayed. Often used for an `all` config. Option can be repeated. | |
| `--ignore-deprecated-rules` | Whether to ignore deprecated rules from being checked, displayed, or updated. | `false` |
| `--init-rule-docs` | Whether to create rule doc files if they don't yet exist. | `false` |
| `--path-rule-doc` | Path to markdown file for each rule doc. Use `{name}` placeholder for the rule name. A function can also be provided for this option via a [config file](#configuration-file). | `docs/rules/{name}.md` |
| `--path-rule-list` | Path to markdown file where the rules table list should live. Option can be repeated. | `README.md` |
| `--rule-doc-notices` | Ordered, comma-separated list of notices to display in rule doc. Non-applicable notices will be hidden. See choices in below [table](#column-and-notice-types). | `deprecated`, `configs`, `fixableAndHasSuggestions`, `requiresTypeChecking` |
| `--rule-doc-section-exclude` | Disallowed section in each rule doc. Exit with failure if present. Option can be repeated. | |
| `--rule-doc-section-include` | Required section in each rule doc. Exit with failure if missing. Option can be repeated. | |
| `--rule-doc-section-options` | Whether to require an "Options" or "Config" rule doc section and mention of any named options for rules with options. | `true` |
| `--rule-doc-title-format` | The format to use for rule doc titles. See choices in below [table](#--rule-doc-title-format). | `desc-parens-prefix-name` |
| `--rule-list-columns` | Ordered, comma-separated list of columns to display in rule list. Empty columns will be hidden. See choices in below [table](#column-and-notice-types). | `name`, `description`, `configsError`, `configsWarn`, `configsOff`, `fixable`, `hasSuggestions`, `requiresTypeChecking`, `deprecated` |
| `--rule-list-split` | Rule property(s) to split the rules list by. A separate list and header will be created for each value. Example: `meta.type`. A function can also be provided for this option via a [config file](#configuration-file). | |
| `--url-configs` | Link to documentation about the ESLint configurations exported by the plugin. | |
| `--url-rule-doc` | Link to documentation for each rule. Useful when it differs from the rule doc path on disk (e.g. custom documentation site in use). Use `{name}` placeholder for the rule name. A function can also be provided for this option via a [config file](#configuration-file). | |

### Column and notice types

These are the types of rule metadata that are available for display in rule list columns (`--rule-list-columns`) and/or rule doc notices (`--rule-doc-notices`).

| Emoji | Type | Column? | Notice? | Description |
| :-- | :-- | :-- | :-- | :-- |
| 💼 | `configsError` | Yes | No | Whether a rule is set to `error` in a config. |
| 🚫 | `configsOff` | Yes | No | Whether a rule is set to `off` in a config. |
| ⚠️ | `configsWarn` | Yes | No | Whether a rule is set to `warn` in a config. |
| 💼 | `configs` | No | Yes | What configs set a rule to what [severities](https://eslint.org/docs/latest/user-guide/configuring/rules#rule-severities). |
| ❌ | `deprecated`  | Yes | Yes | Whether a rule is deprecated (i.e. likely to be removed/renamed in a future major version). |
| | `description`  | Yes | Yes | The rule description. |
| 🔧💡 | `fixableAndHasSuggestions` | Yes | Yes | Whether a rule is [fixable](https://eslint.org/docs/latest/developer-guide/working-with-rules#applying-fixes) and/or has [suggestions](https://eslint.org/docs/latest/developer-guide/working-with-rules#providing-suggestions). |
| 🔧 | `fixable` | Yes | Yes | Whether a rule is [fixable](https://eslint.org/docs/latest/developer-guide/working-with-rules#applying-fixes). |
| 💡 | `hasSuggestions` | Yes | Yes | Whether a rule has [suggestions](https://eslint.org/docs/latest/developer-guide/working-with-rules#providing-suggestions). |
| | `name` | Yes | No | The rule name. |
| ⚙️ | `options` | Yes | Yes | Whether a rule has [options](https://eslint.org/docs/latest/developer-guide/working-with-rules#options-schemas). |
| 💭 | `requiresTypeChecking` | Yes | Yes | Whether a rule requires [type checking](https://typescript-eslint.io/linting/typed-linting/). |
| 🗂️ | `type` | Yes | Yes | The rule [type](https://eslint.org/docs/latest/developer-guide/working-with-rules#rule-basics) (`problem`, `suggestion`, or `layout`). |

### `--config-format`

Where `recommended` is the config name and `eslint-plugin-test` is the plugin name.

| Value | Example |
| :-- | :-- |
| `name` (default) | `recommended` |
| `plugin-colon-prefix-name` | `plugin:test/recommended` |
| `prefix-name` | `test/recommended` |

### `--rule-doc-title-format`

Where `no-foo` is the rule name, `Disallow use of foo` is the rule description, and `eslint-plugin-test` is the plugin name.

| Value | Example |
| :-- | :-- |
| `desc` | `# Disallow use of foo` |
| `desc-parens-name` | `# Disallow use of foo (no-foo)` |
| `desc-parens-prefix-name` (default) | `# Disallow use of foo (test/no-foo)` |
| `name` | `# no-foo` |
| `prefix-name` | `# test/no-foo` |

### Configuration file

There are a few ways to create a config file (as an alternative to passing the options via CLI):

- An object exported by `.eslint-doc-generatorrc.js`, `.eslint-doc-generatorrc.json`, or any other config file format/name supported by [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#searchplaces)
- An object under the `eslint-doc-generator` key in `package.json`

Config files support all the [CLI options](#configuration-options) but in camelCase.

Some options are exclusive to a JavaScript-based config file:

- `postprocess` - A function-only option useful for applying custom transformations such as formatting with tools like prettier. See [prettier example](#prettier).
- [`ruleListSplit`](#configuration-options) with a function - This is useful for customizing the grouping of rules into lists.

Example `.eslint-doc-generatorrc.js`:

```js
/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  ignoreConfig: ['all'],
};

module.exports = config;
```

Example `.eslint-doc-generatorrc.js` with `pathRuleDoc` function:

```js
/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  pathRuleDoc(name) {
    // e.g. rule name format is `some-plugin/some-rule`, and rule is in a monorepo under different package.
    const [plugin, rule] = name.split("/");
    return `packages/eslint-plugin-${plugin}/src/rules/${rule}.md`;
  },
};

module.exports = config;
```

Example `.eslint-doc-generatorrc.js` with `ruleListSplit` function:

```js
/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  ruleListSplit(rules) {
    return [
      {
        // No header for this list.
        rules: rules.filter(([name, rule]) => !rule.meta.someProp),
      },
      {
        title: 'Foo',
        rules: rules.filter(([name, rule]) => rule.meta.someProp === 'foo'),
      },
      {
        title: 'Bar',
        rules: rules.filter(([name, rule]) => rule.meta.someProp === 'bar'),
      },
    ];
  },
};

module.exports = config;
```

Example `.eslint-doc-generatorrc.js` with `urlRuleDoc` function:

```js
/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  urlRuleDoc(name, page) {
    if (page === 'README.md') {
      // Use URLs only in the readme.
      return `https://example.com/rules/${name}.html`;
    }
  },
};

module.exports = config;
```

### Badges

While emojis are the recommended representations of configs that a rule belongs to, you can alternatively use a text/image/icon badge for configs by supplying the following markdown for the emoji using the [`--config-emoji`](#configuration-options) option.

For example, here's the markdown for a text badge representing a custom `fun` config that displays in blue (note that the markdown includes alt text followed by the image URL):

```md
![fun config badge](https://img.shields.io/badge/-fun-blue.svg)
```

Here's how you'd configure it:

```js
/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  configEmoji: [
    ['fun', '![fun config badge](https://img.shields.io/badge/-fun-blue.svg)'],
  ],
};

module.exports = config;
```

And how it looks:

![fun config badge](https://img.shields.io/badge/-fun-blue.svg)

## Compatibility

### Build tools

If you have a build step for your code like [Babel](https://babeljs.io/) or [TypeScript](https://www.typescriptlang.org/), you may need to adjust your scripts to run your build before this tool to ensure the documentation is generated from the latest plugin information:

```json
{
  "build": "tsc",
  "update:eslint-docs": "npm run build && eslint-doc-generator"
}
```

### markdownlint

The output of this tool should be compatible with the default configuration of [markdownlint](https://github.com/DavidAnson/markdownlint), which you might use to lint your markdown. If it's not, you can follow the [prettier example](#prettier) to tweak your scripts or use the `postprocess` option. See the [markdownlint documentation](https://github.com/DavidAnson/markdownlint/blob/main/helpers/README.md#applying-recommended-fixes) for an example of markdownlint's Node API for applying fixes to use in your `postprocess` function.

### prettier

If you use [prettier](https://prettier.io/) to format your markdown, you can provide a `postprocess` function to ensure the documentation generated by this tool is formatted correctly:

```javascript
const prettier = require('prettier');
const { prettier: prettierRC } = require('./package.json'); // or wherever your prettier config lies

/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  postprocess: (content, path) =>
    prettier.format(content, { ...prettierRC, parser: 'markdown' }),
};

module.exports = config;
```

Alternatively, you can configure your scripts to run `prettier` after this tool:

```json
{
  "format": "prettier --write .",
  "lint:eslint-docs": "npm run update:eslint-docs && git diff --exit-code",
  "update:eslint-docs": "eslint-doc-generator && npm run format"
}
```

## Semantic versioning policy

This tool follows [semantic versioning](https://semver.org/).

New features will be [released](./RELEASE.md) as a minor version, while bug fixes will be released as a patch version.

Breaking changes will be released as a major version and include:

- Changing an option default
- Renaming or removing an option
- Other backwards-incompatible changes to the CLI / API
- Raising Node or ESLint version requirements

Tweaks to the generated documentation output can take place in any type of release including minor and patch versions. This can break your build, as even a small formatting change will cause a diff, but you can simply re-run the tool to fix.

## Related

- [eslint-plugin-eslint-plugin](https://github.com/eslint-community/eslint-plugin-eslint-plugin) - Linter for ESLint plugins ([related list](https://eslint.org/docs/latest/developer-guide/working-with-plugins#linting))
- [generator-eslint](https://github.com/eslint/generator-eslint) - Generates initial ESLint plugin and rule files but without the sophisticated documentation provided by eslint-doc-generator

[npm-image]: https://badge.fury.io/js/eslint-doc-generator.svg
[npm-url]: https://www.npmjs.com/package/eslint-doc-generator
