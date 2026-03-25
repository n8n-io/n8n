# Sucrase

[![Build Status](https://github.com/alangpierce/sucrase/workflows/All%20tests/badge.svg)](https://github.com/alangpierce/sucrase/actions)
[![npm version](https://img.shields.io/npm/v/sucrase.svg)](https://www.npmjs.com/package/sucrase)
[![Install Size](https://packagephobia.now.sh/badge?p=sucrase)](https://packagephobia.now.sh/result?p=sucrase)
[![MIT License](https://img.shields.io/npm/l/express.svg?maxAge=2592000)](LICENSE)
[![Join the chat at https://gitter.im/sucrasejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/sucrasejs/Lobby)

## [Try it out](https://sucrase.io)

## Quick usage

```bash
yarn add --dev sucrase  # Or npm install --save-dev sucrase
node -r sucrase/register main.ts
```

Using the [ts-node](https://github.com/TypeStrong/ts-node) integration:

```bash
yarn add --dev sucrase ts-node typescript
./node_modules/.bin/ts-node --transpiler sucrase/ts-node-plugin main.ts
```

## Project overview

Sucrase is an alternative to Babel that allows super-fast development builds.
Instead of compiling a large range of JS features to be able to work in Internet
Explorer, Sucrase assumes that you're developing with a recent browser or recent
Node.js version, so it focuses on compiling non-standard language extensions:
JSX, TypeScript, and Flow. Because of this smaller scope, Sucrase can get away
with an architecture that is much more performant but less extensible and
maintainable. Sucrase's parser is forked from Babel's parser (so Sucrase is
indebted to Babel and wouldn't be possible without it) and trims it down to a
focused subset of what Babel solves. If it fits your use case, hopefully Sucrase
can speed up your development experience!

**Sucrase has been extensively tested.** It can successfully build
the [Benchling](https://benchling.com/) frontend code,
[Babel](https://github.com/babel/babel),
[React](https://github.com/facebook/react),
[TSLint](https://github.com/palantir/tslint),
[Apollo client](https://github.com/apollographql/apollo-client), and
[decaffeinate](https://github.com/decaffeinate/decaffeinate)
with all tests passing, about 1 million lines of code total.

**Sucrase is about 20x faster than Babel.** Here's one measurement of how
Sucrase compares with other tools when compiling the Jest codebase 3 times,
about 360k lines of code total:

```text
            Time            Speed
Sucrase     0.57 seconds    636975 lines per second
swc         1.19 seconds    304526 lines per second
esbuild     1.45 seconds    248692 lines per second
TypeScript  8.98 seconds    40240 lines per second
Babel       9.18 seconds    39366 lines per second
```

Details: Measured on July 2022. Tools run in single-threaded mode without warm-up. See the
[benchmark code](https://github.com/alangpierce/sucrase/blob/main/benchmark/benchmark.ts)
for methodology and caveats.

## Transforms

The main configuration option in Sucrase is an array of transform names. These
transforms are available:

* **jsx**: Enables JSX syntax. By default, JSX is transformed to `React.createClass`,
  but may be preserved or transformed to `_jsx()` by setting the `jsxRuntime` option.
  Also adds `createReactClass` display names and JSX context information.
* **typescript**: Compiles TypeScript code to JavaScript, removing type
  annotations and handling features like enums. Does not check types. Sucrase
  transforms each file independently, so you should enable the `isolatedModules`
  TypeScript flag so that the typechecker will disallow the few features like
  `const enum`s that need cross-file compilation. The Sucrase option `keepUnusedImports`
  can be used to disable all automatic removal of imports and exports, analogous to TS
  `verbatimModuleSyntax`.
* **flow**:  Removes Flow type annotations. Does not check types.
* **imports**: Transforms ES Modules (`import`/`export`) to CommonJS
  (`require`/`module.exports`) using the same approach as Babel and TypeScript
  with `--esModuleInterop`. If `preserveDynamicImport` is specified in the Sucrase
  options, then dynamic `import` expressions are left alone, which is particularly
  useful in Node to load ESM-only libraries. If `preserveDynamicImport` is not
  specified, `import` expressions are transformed into a promise-wrapped call to
  `require`.
* **react-hot-loader**: Performs the equivalent of the `react-hot-loader/babel`
  transform in the [react-hot-loader](https://github.com/gaearon/react-hot-loader)
  project. This enables advanced hot reloading use cases such as editing of
  bound methods.
* **jest**: Hoist desired [jest](https://jestjs.io/) method calls above imports in
  the same way as [babel-plugin-jest-hoist](https://github.com/facebook/jest/tree/master/packages/babel-plugin-jest-hoist).
  Does not validate the arguments passed to `jest.mock`, but the same rules still apply.

When the `imports` transform is *not* specified (i.e. when targeting ESM), the
`injectCreateRequireForImportRequire` option can be specified to transform TS
`import foo = require("foo");` in a way that matches the
[TypeScript 4.7 behavior](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#commonjs-interoperability)
with `module: nodenext`.

These newer JS features are transformed by default:

* [Optional chaining](https://github.com/tc39/proposal-optional-chaining): `a?.b`
* [Nullish coalescing](https://github.com/tc39/proposal-nullish-coalescing): `a ?? b`
* [Class fields](https://github.com/tc39/proposal-class-fields): `class C { x = 1; }`.
  This includes static fields but not the `#x` private field syntax.
* [Numeric separators](https://github.com/tc39/proposal-numeric-separator):
  `const n = 1_234;`
* [Optional catch binding](https://github.com/tc39/proposal-optional-catch-binding):
  `try { doThing(); } catch { }`.

If your target runtime supports these features, you can specify
`disableESTransforms: true` so that Sucrase preserves the syntax rather than
trying to transform it. Note that transpiled and standard class fields behave
slightly differently; see the
[TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#the-usedefineforclassfields-flag-and-the-declare-property-modifier)
for details. If you use TypeScript, you can enable the TypeScript option
`useDefineForClassFields` to enable error checking related to these differences.

### Unsupported syntax

All JS syntax not mentioned above will "pass through" and needs to be supported
by your JS runtime. For example:

* Decorators, private fields, `throw` expressions, generator arrow functions,
  and `do` expressions are all unsupported in browsers and Node (as of this
  writing), and Sucrase doesn't make an attempt to transpile them.
* Object rest/spread, async functions, and async iterators are all recent
  features that should work fine, but might cause issues if you use older
  versions of tools like webpack. BigInt and newer regex features may or may not
  work, based on your tooling.

### JSX Options

By default, JSX is compiled to React functions in development mode. This can be
configured with a few options:

* **jsxRuntime**: A string specifying the transform mode, which can be one of three values:
  * `"classic"` (default): The original JSX transform that calls `React.createElement` by default.
    To configure for non-React use cases, specify:
    * **jsxPragma**: Element creation function, defaults to `React.createElement`.
    * **jsxFragmentPragma**: Fragment component, defaults to `React.Fragment`.
  * `"automatic"`: The [new JSX transform](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)
      introduced with React 17, which calls `jsx` functions and auto-adds import statements.
    To configure for non-React use cases, specify:
    * **jsxImportSource**: Package name for auto-generated import statements, defaults to `react`.
  * `"preserve"`: Don't transform JSX, and instead emit it as-is in the output code.
* **production**: If `true`, use production version of functions and don't include debugging
  information. When using React in production mode with the automatic transform, this *must* be
  set to true to avoid an error about `jsxDEV` being missing.

### Legacy CommonJS interop

Two legacy modes can be used with the `imports` transform:

* **enableLegacyTypeScriptModuleInterop**: Use the default TypeScript approach
  to CommonJS interop instead of assuming that TypeScript's `--esModuleInterop`
  flag is enabled. For example, if a CJS module exports a function, legacy
  TypeScript interop requires you to write `import * as add from './add';`,
  while Babel, Webpack, Node.js, and TypeScript with `--esModuleInterop` require
  you to write `import add from './add';`. As mentioned in the
  [docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#support-for-import-d-from-cjs-form-commonjs-modules-with---esmoduleinterop),
  the TypeScript team recommends you always use `--esModuleInterop`.
* **enableLegacyBabel5ModuleInterop**: Use the Babel 5 approach to CommonJS
  interop, so that you can run `require('./MyModule')` instead of
  `require('./MyModule').default`. Analogous to
  [babel-plugin-add-module-exports](https://github.com/59naga/babel-plugin-add-module-exports).

## Usage

### Tool integrations

* [Webpack](https://github.com/alangpierce/sucrase/tree/main/integrations/webpack-loader)
* [Gulp](https://github.com/alangpierce/sucrase/tree/main/integrations/gulp-plugin)
* [Jest](https://github.com/alangpierce/sucrase/tree/main/integrations/jest-plugin)
* [Rollup](https://github.com/rollup/plugins/tree/master/packages/sucrase)
* [Broccoli](https://github.com/stefanpenner/broccoli-sucrase)

### Usage in Node

The most robust way is to use the Sucrase plugin for [ts-node](https://github.com/TypeStrong/ts-node),
which has various Node integrations and configures Sucrase via `tsconfig.json`:
```bash
ts-node --transpiler sucrase/ts-node-plugin
```

For projects that don't target ESM, Sucrase also has a require hook with some
reasonable defaults that can be accessed in a few ways:

* From code: `require("sucrase/register");`
* When invoking Node: `node -r sucrase/register main.ts`
* As a separate binary: `sucrase-node main.ts`

Options can be passed to the require hook via a `SUCRASE_OPTIONS` environment
variable holding a JSON string of options.

### Compiling a project to JS

For simple use cases, Sucrase comes with a `sucrase` CLI that mirrors your
directory structure to an output directory:
```bash
sucrase ./srcDir -d ./outDir --transforms typescript,imports
```

### Usage from code

For any advanced use cases, Sucrase can be called from JS directly:

```js
import {transform} from "sucrase";
const compiledCode = transform(code, {transforms: ["typescript", "imports"]}).code;
```

## What Sucrase is not

Sucrase is intended to be useful for the most common cases, but it does not aim
to have nearly the scope and versatility of Babel. Some specific examples:

* Sucrase does not check your code for errors. Sucrase's contract is that if you
  give it valid code, it will produce valid JS code. If you give it invalid
  code, it might produce invalid code, it might produce valid code, or it might
  give an error. Always use Sucrase with a linter or typechecker, which is more
  suited for error-checking.
* Sucrase is not pluginizable. With the current architecture, transforms need to
  be explicitly written to cooperate with each other, so each additional
  transform takes significant extra work.
* Sucrase is not good for prototyping language extensions and upcoming language
  features. Its faster architecture makes new transforms more difficult to write
  and more fragile.
* Sucrase will never produce code for old browsers like IE. Compiling code down
  to ES5 is much more complicated than any transformation that Sucrase needs to
  do.
* Sucrase is hesitant to implement upcoming JS features, although some of them
  make sense to implement for pragmatic reasons. Its main focus is on language
  extensions (JSX, TypeScript, Flow) that will never be supported by JS
  runtimes.
* Like Babel, Sucrase is not a typechecker, and must process each file in
  isolation. For example, TypeScript `const enum`s are treated as regular
  `enum`s rather than inlining across files.
* You should think carefully before using Sucrase in production. Sucrase is
  mostly beneficial in development, and in many cases, Babel or tsc will be more
  suitable for production builds.

See the [Project Vision](./docs/PROJECT_VISION.md) document for more details on
the philosophy behind Sucrase.

## Motivation

As JavaScript implementations mature, it becomes more and more reasonable to
disable Babel transforms, especially in development when you know that you're
targeting a modern runtime. You might hope that you could simplify and speed up
the build step by eventually disabling Babel entirely, but this isn't possible
if you're using a non-standard language extension like JSX, TypeScript, or Flow.
Unfortunately, disabling most transforms in Babel doesn't speed it up as much as
you might expect. To understand, let's take a look at how Babel works:

1. Tokenize the input source code into a token stream.
2. Parse the token stream into an AST.
3. Walk the AST to compute the scope information for each variable.
4. Apply all transform plugins in a single traversal, resulting in a new AST.
5. Print the resulting AST.

Only step 4 gets faster when disabling plugins, so there's always a fixed cost
to running Babel regardless of how many transforms are enabled.

Sucrase bypasses most of these steps, and works like this:

1. Tokenize the input source code into a token stream using a trimmed-down fork
   of the Babel parser. This fork does not produce a full AST, but still
   produces meaningful token metadata specifically designed for the later
   transforms.
2. Scan through the tokens, computing preliminary information like all
   imported/exported names.
3. Run the transform by doing a pass through the tokens and performing a number
   of careful find-and-replace operations, like replacing `<Foo` with
   `React.createElement(Foo`.

Because Sucrase works on a lower level and uses a custom parser for its use
case, it is much faster than Babel.

## Contributing

Contributions are welcome, whether they be bug reports, PRs, docs, tests, or
anything else! Please take a look through the [Contributing Guide](./CONTRIBUTING.md)
to learn how to get started.

## License and attribution

Sucrase is MIT-licensed. A large part of Sucrase is based on a fork of the
[Babel parser](https://github.com/babel/babel/tree/main/packages/babel-parser),
which is also MIT-licensed.

## Why the name?

Sucrase is an enzyme that processes sugar. Get it?
