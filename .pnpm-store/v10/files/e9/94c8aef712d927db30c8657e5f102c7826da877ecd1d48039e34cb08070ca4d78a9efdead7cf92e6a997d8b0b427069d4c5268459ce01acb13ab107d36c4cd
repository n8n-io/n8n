<a href="https://github.com/styled-components/polished">
  <img alt="polished" src="https://raw.githubusercontent.com/styled-components/brand/master/polished.png" height="150px" />
</a>
<br />

A lightweight toolset for writing styles in JavaScript. ✨

![Node CI Test](https://github.com/styled-components/polished/workflows/Node%20CI%20Test/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/styled-components/polished/branch/main/graph/badge.svg)](https://codecov.io/gh/styled-components/polished)
[![Github All Releases](https://img.shields.io/npm/dm/polished.svg)](https://npmcharts.com/compare/polished)

```sh
npm install --save polished
# or if you're using yarn
yarn add polished
```

Want to write styles in JavaScript, but also want Sass-style helper functions and mixins? Need a consistent color palette throughout your app? `✨ polished` is for you!

- **Make your app look great without stress**
- **Cross framework compatible**: No matter if you're using [`styled-components`](https://github.com/styled-components/styled-components), emotion, jss, aphrodite, radium, or plain inline styles, as long as you're writing your styles in JavaScript you can use polished!
- **Switching from a pre-processor to styles in JS made easy**

## Docs

**See the full documentation at [polished.js.org](http://polished.js.org/docs)!**

## Usage

`✨ polished` modules are meant to be used as stand-alone imports. You should avoid importing the entire library directly:

`import { clearFix, animation } from 'polished'`
~`import * as polished from 'polished`~
~`import polished from 'polished'`~

When `✨ polished` modules are imported properly, tree shaking in [webpack](https://webpack.js.org/guides/tree-shaking/) and [Rollup](https://github.com/rollup/rollup#tree-shaking) can be leveraged to reduce your bundle size.

## Browser Support
All Evergreen Browsers + IE11

As of v3.6.X we support `>0.5%, not dead, ie >= 11, not op_mini all` for all our builds.

## Flow Type Definitions

`✨ polished` has first-class [Flow](https://flow.org/) support with zero configuration to assist you in finding type errors while using our modules.

### Ignore ✨ polished source

Flow frequently updates and it is possible that the version you are running may cause you to run into errors coming from the `polished` package in your `node_modules` directory. You can add the following lines to your `.flowconfig` to ignore `polished` in those cases:

```bash
[ignore]
.*/node_modules/polished/.*
```

## TypeScript Definitions

`✨ polished` has [TypeScript](https://www.typescriptlang.org/) definitions to allow the library to be used in any TypeScript project. You will need to set `moduleResolution` to `node` in your `tsconfig.json` in order to use `✨ polished` with TypeScript.

### Babel plugin

You can optionally also use [`babel-plugin-polished`](https://github.com/styled-components/babel-plugin-polished) to compile the static function calls out and remove the (already tiny) runtime performance impact of using `✨ polished`.

### Object Spread Properties

In the documentation you will see examples using [object spread properties](https://github.com/tc39/proposal-object-rest-spread) (`{ ...other }`). To enable this syntax in your project add the [`transform-object-rest-spread` plugin](https://www.npmjs.com/package/babel-plugin-transform-object-rest-spread) (or the [`stage-3` preset](https://babeljs.io/docs/plugins/preset-stage-3/) to enable all stage three features) to your Babel configuration.

## Why?

When writing styles in JavaScript, many people need Sass-style helper functions to be productive. `✨ polished` brings them to you in a nice, lightweight package tailor-made for styles in JavaScript.

The main difference with Sass is that it's written in a functional style and all color functions are curried. This means you can compose them together into your own reusable helpers with a `compose` function of your choice:

```JS
import { compose } from 'ramda' // Replace with any compose() function of your choice
import { lighten, desaturate } from 'polished'

// Create tone() helper
const tone = compose(lighten(0.1), desaturate(0.1))
```

### Why not `package-xyz`?

First of all, we didn't find another library that had everything we needed, and we don't care about installing a dozen packages separately.

Specifically most other packages that provide color functions do so in an object-oriented style, often with a fluent API that's very different from the Sass-style helpers. This means people that aren't very familiar with JavaScript might shy away from using them.

`✨ polished` was made as a standard library for everybody, no matter if they know JS inside out or not.

## Compatibility

✨ polished is **compatible with any library that accepts styles as JS objects**. This includes, but is by far not limited to, `styled-components`, radium, aphrodite, glamor, glamorous, jss and many more!

No matter if you're using [inline styles or CSS-in-JS](http://mxstbr.blog/2016/11/inline-styles-vs-css-in-js/), polished is for you.

## Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/styled-components/polished/graphs/contributors"><img src="https://opencollective.com/polished/contributors.svg?width=890&button=false" /></a>


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/polished#backer)]

<a href="https://opencollective.com/polished#backers" target="_blank"><img src="https://opencollective.com/polished/backers.svg?width=890"></a>


## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/polished#sponsor)]

<a href="https://opencollective.com/polished/sponsor/0/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/1/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/2/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/3/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/4/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/5/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/6/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/7/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/8/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/polished/sponsor/9/website" target="_blank"><img src="https://opencollective.com/polished/sponsor/9/avatar.svg"></a>


## License

Copyright © 2016-2021 Brian Hough, Maximilian Stoiber, & Nik Graf. Licensed under the MIT License, see [LICENSE.md](LICENSE.md) for more information!

<img src="https://static.scarf.sh/a.png?x-pxid=121e67af-0b5f-4132-a6e7-6ae63ebeedac" />
