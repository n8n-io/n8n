<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Sentry Babel Component Annotate Plugin

[![npm version](https://img.shields.io/npm/v/@sentry/babel-plugin-component-annotate.svg)](https://www.npmjs.com/package/@sentry/babel-plugin-component-annotate)
[![npm dm](https://img.shields.io/npm/dm/@sentry/babel-plugin-component-annotate.svg)](https://www.npmjs.com/package/@sentry/babel-plugin-component-annotate)
[![npm dt](https://img.shields.io/npm/dt/@sentry/babel-plugin-component-annotate.svg)](https://www.npmjs.com/package/@babel-plugin-component-annotate)

A Babel plugin that automatically annotates your output DOM with their respective frontend component names.
This will unlock the capability to search for Replays in Sentry by component name, as well as see component names in breadcrumbs and performance monitoring.
Please note that your Sentry JavaScript SDK version must be at least `7.91.0` to take advantage of these features.
Currently, this plugin only works with React, and will exclusively parse `.jsx` and `.tsx` files.

### Note

This plugin comes included in Sentry's bundler plugins, alongside many other features to improve your Sentry workflow.
It can be downloaded individually, but it is recommended that you install the bundler plugins for your respective bundler, and enable this feature through the config object.

Check out the supported bundler plugin packages for installation instructions:

- [Rollup](https://www.npmjs.com/package/@sentry/rollup-plugin)
- [Vite](https://www.npmjs.com/package/@sentry/vite-plugin)
- [Webpack](https://www.npmjs.com/package/@sentry/webpack-plugin)
- esbuild: Not currently supported

## Installation

Using npm:

```bash
npm install @sentry/babel-plugin-component-annotate --save-dev
```

Using yarn:

```bash
yarn add @sentry/babel-plugin-component-annotate --dev
```

Using pnpm:

```bash
pnpm add @sentry/babel-plugin-component-annotate --save-dev
```

## Options

### `ignoredComponents`

Type: `string[]`

A list of strings representing the names of components to ignore. The plugin will not apply `data-sentry` annotations on the DOM element for these components.

## Example

```js
// babel.config.js

{
  // ... other config above ...

  plugins: [
    // Put this plugin before any other plugins you have that transform JSX code
    // The options are set by providing an object as the second element in the array, but not required
    ['@sentry/babel-plugin-component-annotate', {ignoredComponents: ['Foo', 'Bar']}]
  ],
}
```

Or alternatively, configure the plugin by directly importing it:

```js
// babel.config.js

import componentNameAnnotatePlugin from '@sentry/babel-plugin-component-annotate';

{
  // ... other config above ...

  plugins: [
    // Put this plugin before any other plugins you have that transform JSX code
    [componentNameAnnotatePlugin]
  ],
}
```

## More information

- [Sentry Documentation](https://docs.sentry.io/quickstart/)
- [Sentry Discord](https://discord.gg/Ww9hbqr)
- [Sentry Stackoverflow](http://stackoverflow.com/questions/tagged/sentry)
