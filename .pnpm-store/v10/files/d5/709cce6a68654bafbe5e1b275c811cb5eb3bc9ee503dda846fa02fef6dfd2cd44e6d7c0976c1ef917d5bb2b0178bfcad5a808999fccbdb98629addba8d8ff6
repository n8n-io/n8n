<p align="center">
  <a href="https://storybook.js.org/?ref=readme">
    <img src="https://user-images.githubusercontent.com/321738/63501763-88dbf600-c4cc-11e9-96cd-94adadc2fd72.png" alt="Storybook" width="400" />
  </a>
</p>

<p align="center">Build bulletproof UI components faster</p>

<br/>

<p align="center">
  <a href="https://discord.gg/storybook">
    <img src="https://img.shields.io/badge/discord-join-7289DA.svg?logo=discord&longCache=true&style=flat" />
  </a>
  <a href="https://storybook.js.org/community/?ref=readme">
    <img src="https://img.shields.io/badge/community-join-4BC424.svg" alt="Storybook Community" />
  </a>
  <a href="#backers">
    <img src="https://opencollective.com/storybook/backers/badge.svg" alt="Backers on Open Collective" />
  </a>
  <a href="#sponsors">
    <img src="https://opencollective.com/storybook/sponsors/badge.svg" alt="Sponsors on Open Collective" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=storybookjs">
    <img src="https://badgen.net/twitter/follow/storybookjs?icon=twitter&label=%40storybookjs" alt="Official Twitter Handle" />
  </a>
</p>

# eslint-plugin-storybook

Best practice rules for Storybook

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm install eslint --save-dev
# or
yarn add eslint --dev
```

Next, install `eslint-plugin-storybook`:

```sh
npm install eslint-plugin-storybook --save-dev
# or
yarn add eslint-plugin-storybook --dev
```

And finally, add this to your `.eslintignore` file:

```
// Inside your .eslintignore file
!.storybook
```

This allows for this plugin to also lint your configuration files inside the .storybook folder, so that you always have a correct configuration and don't face any issues regarding mistyped addon names, for instance.

> For more info on why this line is required in the .eslintignore file, check this [ESLint documentation](https://eslint.org/docs/latest/use/configure/ignore-deprecated#:~:text=In%20addition%20to,contents%20are%20ignored).

If you are using [flat config style](https://eslint.org/docs/latest/use/configure/configuration-files-new), add this to your configuration file:

```js
export default [
  // ...
  {
    // Inside your .eslintignore file
    ignores: ['!.storybook'],
  },
];
```

## ESLint compatibility

Use the following table to use the correct version of this package, based on the version of ESLint you're using:

| ESLint version | Storybook plugin version |
| -------------- | ------------------------ |
| ^9.0.0         | ^0.10.0                  |
| ^8.57.0        | ^0.10.0                  |
| ^7.0.0         | ~0.9.0                   |

## Usage

### Configuration (`.eslintrc`)

Use `.eslintrc.*` file to configure rules in ESLint < v9. See also: https://eslint.org/docs/latest/use/configure/.

Add `plugin:storybook/recommended` to the extends section of your `.eslintrc` configuration file. Note that we can omit the `eslint-plugin-` prefix:

```js
{
  // extend plugin:storybook/<configuration>, such as:
  "extends": ["plugin:storybook/recommended"]
}
```

This plugin will only be applied to files following the `*.stories.*` (we recommend this) or `*.story.*` pattern. This is an automatic configuration, so you don't have to do anything.

#### Overriding/disabling rules

Optionally, you can override, add or disable rules settings. You likely don't want these settings to be applied in every file, so make sure that you add a `overrides` section in your `.eslintrc.*` file that applies the overrides only to your stories files.

```js
{
  "overrides": [
    {
      // or whatever matches stories specified in .storybook/main.js
      "files": ['**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)'],
      "rules": {
        // example of overriding a rule
        'storybook/hierarchy-separator': 'error',
        // example of disabling a rule
        'storybook/default-exports': 'off',
      }
    }
  ]
}
```

### Configuration (`eslint.config.[c|m]?js`)

Use `eslint.config.[c|m]?js` file to configure rules using the [flat config style](https://eslint.org/docs/latest/use/configure/configuration-files-new). This is the default in ESLint v9, but can be used starting from ESLint v8.57.0. See also: https://eslint.org/docs/latest/use/configure/configuration-files-new.

```js
import storybook from 'eslint-plugin-storybook';

export default [
  // add more generic rulesets here, such as:
  // js.configs.recommended,
  ...storybook.configs['flat/recommended'],

  // something ...
];
```

In case you are using utility functions from tools like `tseslint`, you might need to set the plugin a little differently:

```ts
import storybook from 'eslint-plugin-storybook';
import somePlugin from 'some-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  somePlugin,
  storybook.configs['flat/recommended'] // notice that it is not destructured
);
```

#### Overriding/disabling rules

Optionally, you can override, add or disable rules settings. You likely don't want these settings to be applied in every file, so make sure that you add a flat config section in your `eslint.config.[m|c]?js` file that applies the overrides only to your stories files.

```js
import storybook from 'eslint-plugin-storybook';

export default [
  // ...

  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)'],
    rules: {
      // example of overriding a rule
      'storybook/hierarchy-separator': 'error',
      // example of disabling a rule
      'storybook/default-exports': 'off',
    },
  },

  // something ...
];
```

### MDX Support

This plugin does not support MDX files.

## Supported Rules and configurations

<!-- RULES-LIST:START -->

**Key**: 🔧 = fixable

**Configurations**: csf, csf-strict, addon-interactions, recommended

| Name                                                                                       | Description                                                                                                                   | 🔧  | Included in configurations                                                                                                     |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`storybook/await-interactions`](./docs/rules/await-interactions.md)                       | Interactions should be awaited                                                                                                | 🔧  | <ul><li>addon-interactions</li><li>flat/addon-interactions</li><li>recommended</li><li>flat/recommended</li></ul>              |
| [`storybook/context-in-play-function`](./docs/rules/context-in-play-function.md)           | Pass a context when invoking play function of another story                                                                   |     | <ul><li>recommended</li><li>flat/recommended</li><li>addon-interactions</li><li>flat/addon-interactions</li></ul>              |
| [`storybook/csf-component`](./docs/rules/csf-component.md)                                 | The component property should be set                                                                                          |     | <ul><li>csf</li><li>flat/csf</li><li>csf-strict</li><li>flat/csf-strict</li></ul>                                              |
| [`storybook/default-exports`](./docs/rules/default-exports.md)                             | Story files should have a default export                                                                                      | 🔧  | <ul><li>csf</li><li>flat/csf</li><li>recommended</li><li>flat/recommended</li><li>csf-strict</li><li>flat/csf-strict</li></ul> |
| [`storybook/hierarchy-separator`](./docs/rules/hierarchy-separator.md)                     | Deprecated hierarchy separator in title property                                                                              | 🔧  | <ul><li>csf</li><li>flat/csf</li><li>recommended</li><li>flat/recommended</li><li>csf-strict</li><li>flat/csf-strict</li></ul> |
| [`storybook/meta-inline-properties`](./docs/rules/meta-inline-properties.md)               | Meta should only have inline properties                                                                                       |     | N/A                                                                                                                            |
| [`storybook/meta-satisfies-type`](./docs/rules/meta-satisfies-type.md)                     | Meta should use `satisfies Meta`                                                                                              | 🔧  | N/A                                                                                                                            |
| [`storybook/no-redundant-story-name`](./docs/rules/no-redundant-story-name.md)             | A story should not have a redundant name property                                                                             | 🔧  | <ul><li>csf</li><li>flat/csf</li><li>recommended</li><li>flat/recommended</li><li>csf-strict</li><li>flat/csf-strict</li></ul> |
| [`storybook/no-stories-of`](./docs/rules/no-stories-of.md)                                 | storiesOf is deprecated and should not be used                                                                                |     | <ul><li>csf-strict</li><li>flat/csf-strict</li></ul>                                                                           |
| [`storybook/no-title-property-in-meta`](./docs/rules/no-title-property-in-meta.md)         | Do not define a title in meta                                                                                                 | 🔧  | <ul><li>csf-strict</li><li>flat/csf-strict</li></ul>                                                                           |
| [`storybook/no-uninstalled-addons`](./docs/rules/no-uninstalled-addons.md)                 | This rule identifies storybook addons that are invalid because they are either not installed or contain a typo in their name. |     | <ul><li>recommended</li><li>flat/recommended</li></ul>                                                                         |
| [`storybook/prefer-pascal-case`](./docs/rules/prefer-pascal-case.md)                       | Stories should use PascalCase                                                                                                 | 🔧  | <ul><li>recommended</li><li>flat/recommended</li></ul>                                                                         |
| [`storybook/story-exports`](./docs/rules/story-exports.md)                                 | A story file must contain at least one story export                                                                           |     | <ul><li>recommended</li><li>flat/recommended</li><li>csf</li><li>flat/csf</li><li>csf-strict</li><li>flat/csf-strict</li></ul> |
| [`storybook/use-storybook-expect`](./docs/rules/use-storybook-expect.md)                   | Use expect from `@storybook/test`, `storybook/test` or `@storybook/jest`                                                      | 🔧  | <ul><li>addon-interactions</li><li>flat/addon-interactions</li><li>recommended</li><li>flat/recommended</li></ul>              |
| [`storybook/use-storybook-testing-library`](./docs/rules/use-storybook-testing-library.md) | Do not use testing-library directly on stories                                                                                | 🔧  | <ul><li>addon-interactions</li><li>flat/addon-interactions</li><li>recommended</li><li>flat/recommended</li></ul>              |

<!-- RULES-LIST:END -->

## Contributors

Looking into improving this plugin? That would be awesome!
Please refer to [the contributing guidelines](./CONTRIBUTING.md) for steps to contributing.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
