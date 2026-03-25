# nyc

[![ci](https://github.com/istanbuljs/nyc/actions/workflows/ci.yaml/badge.svg)](https://github.com/bcoe/c8/actions/workflows/ci.yaml)
[![NPM version](https://img.shields.io/npm/v/nyc.svg)](https://www.npmjs.com/package/nyc)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

_Having problems? want to contribute? join our [community slack](https://devtoolscommunity.herokuapp.com)_.

Istanbul's state of the art command line interface, with support for:

* applications that spawn subprocesses.
* source mapped coverage of Babel and TypeScript projects

## How Istanbul works

Istanbul instruments your ES5 and ES2015+ JavaScript code with line counters, so that you can track how well your unit-tests exercise your codebase.

The `nyc` command-line-client for Istanbul works well with most JavaScript testing frameworks: tap, mocha, AVA, etc.

## Installation & Usage

Use your package manager to add it as a dev dependency: `npm i -D nyc` or `yarn add -D nyc`.
You can use nyc to call npm scripts (assuming they don't already have nyc executed in them), like so (replace `mocha` with your test runner everywhere you see it):

```json
{
  "scripts": {
    "test": "mocha",
    "coverage": "nyc npm run test"
  }
}
```

You can use also `npx` instead of installing nyc as a dependency, but you might get updates you are not ready for; to get around this, pin to a specific major version by specifying, e.g. `nyc@14`.

```json
{
  "scripts": {
    "test": "npx nyc@latest mocha"
  }
}
```

This is a good way of testing upcoming releases of nyc, usually on the `next` tag.

**Note**: If you use [`jest`](https://npm.im/jest) or [`tap`](https://www.node-tap.org/), you do not need to install `nyc`.
Those runners already have the IstanbulJS libraries to provide coverage for you.
Follow their documentation to enable and configure coverage reporting.

## Configuring `nyc`

nyc accepts a wide variety of configuration arguments, run `npx nyc --help` for thorough documentation.

Configuration arguments on the command-line should be provided prior to the program that nyc is executing.
As an example, the following command executes `ava`, and indicates to nyc that it should output both an `lcov` (`lcov.info` + html report) and a `text-summary` coverage report.

```shell
nyc --reporter=lcov --reporter=text-summary ava
```

### Babel projects

Please start with the pre-configured [`@istanbuljs/nyc-config-babel`] preset.
You can add your custom configuration options as shown below.

### TypeScript projects

Please start with the pre-configured [`@istanbuljs/nyc-config-typescript`](https://www.npmjs.com/package/@istanbuljs/nyc-config-typescript) preset.

#### Adding your overrides

nyc allows you to inherit other configurations using the key `extends` in the `package.json` stanza, `.nycrc`, or YAML files.
You can then add the specific configuration options you want that aren't in that particular shared config, e.g.

```json
{
  "extends": "@istanbuljs/nyc-config-typescript",
  "all": true,
  "check-coverage": true
}
```

### Configuration files

Any configuration options that can be set via the command line can also be specified in the `nyc` stanza of your package.json, or within a separate configuration file - a variety of flavors are available:

| File name       | File Association |
|-----------------|------------------|
| `.nycrc`        | JSON             |
| `.nycrc.json`   | JSON             |
| `.nycrc.yaml`   | YAML             |
| `.nycrc.yml`    | YAML             |
| `nyc.config.js` | CommonJS export  |

### Common Configuration Options

See `nyc --help` for all options available.
You can set these in any of the files listed above, or from the command line.
This table is a quick TLDR for the rest of this readme and there are more advanced docs available.

| Option name | Description | Type | Default |
| ----------- | ----------- | ---- | ------- |
| `all` | Whether or not to instrument all files (not just the ones touched by your test suite) | `Boolean` | `false` |
| `check-coverage` | Check whether coverage is within thresholds, fail if not | `Boolean` | `false` |
| `extension` | List of extensions that nyc should attempt to handle in addition to `.js` | `Array<String>` | `['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx']` |
| `include` | See [selecting files for coverage] for more info | `Array<String>` | `['**']`|
| `exclude` | See [selecting files for coverage] for more info | `Array<String>` | [list](https://github.com/istanbuljs/schema/blob/master/default-exclude.js) |
| `reporter` | May be set to a [built-in coverage reporter](https://istanbul.js.org/docs/advanced/alternative-reporters/) or an npm package (dev)dependency | `Array<String>` | `['text']` |
| `report-dir` | Where to put the coverage report files | `String` | `./coverage` |
| `skip-full` | Don't show files with 100% statement, branch, and function coverage | `Boolean` | `false` |
| `temp-dir` | Directory to output raw coverage information to | `String` | `./.nyc_output` |

Configuration can also be provided by `nyc.config.js` if programmed logic is required:

```js
'use strict';

const defaultExclude = require('@istanbuljs/schema/default-exclude');
const isWindows = require('is-windows');

let platformExclude = [
  isWindows() ? 'lib/posix.js' : 'lib/win32.js'
];

module.exports = {
  exclude: platformExclude.concat(defaultExclude)
};
```

### Publish and reuse your nyc configuration(s)

To publish and reuse your own `nyc` configuration, simply create an npm module that exports your JSON config (via [`index.json`](https://github.com/istanbuljs/istanbuljs/blob/master/packages/nyc-config-typescript/) or a CJS [`index.js`](https://github.com/istanbuljs/istanbuljs/blob/master/packages/nyc-config-hook-run-in-this-context/)).

A more advanced use case would be to combine multiple shared configs in a `nyc.config.js` file:

```js
'use strict';

const babelConfig = require('@istanbuljs/nyc-config-babel');
const hookRunInThisContextConfig = require('@istanbuljs/nyc-config-hook-run-in-this-context');

module.exports = {
  ...babelConfig,
  ...hookRunInThisContextConfig,
  all: true,
  'check-coverage': true
};
```

## Selecting files for coverage

By default, nyc only collects coverage for source files that are visited during a test.
It does this by watching for files that are `require()`'d during the test.
When a file is `require()`'d, nyc creates and returns an instrumented version of the source, rather than the original.
Only source files that are visited during a test will appear in the coverage report and contribute to coverage statistics.

nyc will instrument all files if the `--all` flag is set or if running `nyc instrument`.
In this case all files will appear in the coverage report and contribute to coverage statistics.

nyc will only collect coverage for files that are located under `cwd`, and then only files with extensions listed in the `extension` array.

You can reduce the set of instrumented files by adding `include` and `exclude` filter arrays to your config.
These allow you to shape the set of instrumented files by specifying glob patterns that can filter files from the default instrumented set.
The `exclude` array may also use exclude negated glob patterns, these are specified with a `!` prefix, and can restore sub-paths of excluded paths.

Globs are matched using [minimatch](https://www.npmjs.com/package/minimatch).

We use the following process to remove files from consideration:

1. Limit the set of instrumented files to those files in paths listed in the `include` array.
2. Remove any files that are found in the `exclude` array.
3. Restore any exclude negated files that have been excluded in step 2.

### Using include and exclude arrays

If there are paths specified in the `include` array, then the set of instrumented files will be limited to eligible files found in those paths.
If the `include` array is left undefined all eligible files will be included, equivalent to setting `include: ['**']`.
Multiple `include` globs can be specified on the command line, each must follow a `--include`, `-n` switch.

If there are paths specified in the `exclude` array, then the set of instrumented files will not feature eligible files found in those paths.
You can also specify negated paths in the `exclude` array, by prefixing them with a `!`.
Negated paths can restore paths that have been already been excluded in the `exclude` array.
Multiple `exclude` globs can be specified on the command line, each must follow a `--exclude`, `-x` switch.

The default `exclude` list is defined in the [@istanbuljs/schema module](https://github.com/istanbuljs/schema/blob/master/default-exclude.js).
Specifying your own exclude property completely replaces these defaults.

For example, the following `nyc` config will collect coverage for every file in the `src` directory regardless of whether it is `require()`'d in a test.
It will also exclude any files with the extension `.spec.js`.

```json
{
  "all": true,
  "include": [
    "src/**/*.js"
  ],
  "exclude": [
    "**/*.spec.js"
  ]
}
```

**Note:** Be wary of automatic OS glob expansion when specifying include/exclude globs with the CLI.
To prevent this, wrap each glob in single quotes.

### Including files within `node_modules`

We always add `**/node_modules/**` to the exclude list, even if not specified in the config.
You can override this by setting `--exclude-node-modules=false`.

For example, `"excludeNodeModules: false"` in the following `nyc` config will prevent `node_modules` from being added to the exclude rules.
The set of include rules then restrict nyc to only consider instrumenting files found under the `lib/` and `node_modules/@my-org/` directories.
The exclude rules then prevent nyc instrumenting anything in a `test` folder and the file `node_modules/@my-org/something/unwanted.js`.

```json
{
  "all": true,
  "include": [
    "lib/**",
    "node_modules/@my-org/**"
  ],
  "exclude": [
    "node_modules/@my-org/something/unwanted.js",
    "**/test/**"
  ],
  "excludeNodeModules": false
}
```

## Setting the project root directory

nyc runs a lot of file system operations relative to the project root directory.
During startup nyc will look for the *default* project root directory.
The *default* project root directory is the first directory found that contains a `package.json` file when searching from the current working directory up.
If nyc fails to find a directory containing a `package.json` file, it will use the current working directory as the *default* project root directory.
You can change the project root directory with the `--cwd` option.

nyc uses the project root directory when:

* looking for source files to instrument
* creating globs for include and exclude rules during file selection
* loading custom require hooks from the `require` array

nyc may create artifact directories within the project root, with these defaults:

* the report directory, `<project-root>/coverage`
* the cache directory, `<project-root>/node_modules/.cache/nyc`
* the temp directory, `<project-root>/.nyc_output`

## Require additional modules

The `--require` flag can be provided to `nyc` to indicate that additional modules should be required in the subprocess collecting coverage:

```shell
nyc --require esm mocha
```

### Interaction with `--all` flag

The `--require` flag also operates on the main nyc process for use by `--all`.
For example, in situations with `nyc --all --instrument false` and [`babel-plugin-istanbul`] setup the `--all` option only works if `--require @babel/register` is passed to nyc.
Passing it to mocha would cause the tests to be instrumented but unloaded sources would not be seen.
The [`@istanbuljs/nyc-config-babel`] package handles this for you!

## Caching

`nyc`'s default behavior is to cache instrumented files to disk to prevent instrumenting source files multiple times, and speed `nyc` execution times.
You can disable this behavior by running `nyc` with the `--cache false` flag.
You can also change the default cache directory from `./node_modules/.cache/nyc` by setting the `--cache-dir` flag.

## Coverage thresholds

You can set custom coverage thresholds that will fail if `check-coverage` is set to `true` and your coverage drops below those thresholds.
For example, in the following `nyc` configuration, dropping below 80% branch, line, functions, or statements coverage would fail the build (you can have any combination of these):

```json
{
  "branches": 80,
  "lines": 80,
  "functions": 80,
  "statements": 80
}
```

To do this check on a per-file basis (as opposed to in aggregate), set the `per-file` option to `true`.

### High and low watermarks

Several of the coverage reporters supported by nyc display special information for high and low watermarks:

* high-watermarks represent healthy test coverage (in many reports this is represented with green highlighting).
* low-watermarks represent sub-optimal coverage levels (in many reports this is represented with red highlighting).

You can specify custom high and low watermarks in nyc's configuration:

```json
{
  "watermarks": {
    "lines": [80, 95],
    "functions": [80, 95],
    "branches": [80, 95],
    "statements": [80, 95]
  }
}
```

## Parsing Hints (Ignoring Lines)

There may be some sections of your codebase that you wish to purposefully
exclude from coverage tracking, to do so you can use the following parsing
hints:

* `/* istanbul ignore if */`: ignore the next if statement.
* `/* istanbul ignore else */`: ignore the else portion of an if statement.
* `/* istanbul ignore next */`: ignore the next _thing_ in the source-code (
 functions, if statements, classes, you name it).
* `/* istanbul ignore file */`: ignore an entire source-file (this should be
  placed at the top of the file).

## Ignoring Methods

You can ignore every instance of a method simply by adding its name to the `ignore-class-method` array in your `nyc` config.

```json
{
  "ignore-class-method": ["render"]
}
```

## Combining reports from multiple runs

If for whatever reason you have different test runners in your project or a different series of test runs for different kinds of tests, nyc will automatically combine the coverage report for you if configured correctly with the `--no-clean` flag and the `report` command.
Originally inspired by @janiukjf in #1001, here's an example, where the `test:*` scripts (not shown) invoke only your test runner(s) and not nyc:

```json
{
  "scripts": {
    "cover": "npm run cover:unit && npm run cover:integration && npm run cover:report",
    "cover:unit": "nyc --silent npm run test:unit",
    "cover:integration": "nyc --silent --no-clean npm run test:integration",
    "cover:report": "nyc report --reporter=lcov --reporter=text"
  }
}
```

### What about `nyc merge`?

The `nyc merge` command is for producing one _raw coverage output file_ that combines the results from many test runs.
So if you had the above setup and needed to produce a single `coverage.json` for some external tool, you could do:

```json
{
  "scripts": {
    "cover:merge": "npm run cover:unit && npm run cover:integration && nyc merge .nyc_output coverage.json"
  }
}
```

## Source-Map support for pre-instrumented codebases

If you opt to pre-instrument your source-code (rather than using a just-in-time transpiler like [`@babel/register`]) nyc supports both inline source-maps and `.map` files.

_Important: If you are using nyc with a project that pre-instruments its code, run nyc with the configuration option `--exclude-after-remap` set to `false`.
Otherwise nyc's reports will exclude any files that source-maps remap to folders covered under exclude rules._

## [Integrating with coveralls](./docs/setup-coveralls.md)

## [Integrating with codecov](./docs/setup-codecov.md)

## [Producing instrumented source](./docs/instrument.md)

## Integrating with TAP formatters

Many testing frameworks (Mocha, Tape, Tap, etc.) can produce [TAP](https://en.wikipedia.org/wiki/Test_Anything_Protocol) output. [tap-nyc](https://github.com/MegaArman/tap-nyc) is a TAP formatter designed to look nice with nyc.

## Tutorials and Advanced Documentation

See [more nyc tutorials](https://istanbul.js.org/docs/tutorials) and [advanced nyc documentation](https://istanbul.js.org/docs/advanced/).

Please feel free to [contribute documentation](https://github.com/istanbuljs/istanbuljs.github.io/tree/development/content) to help us improve.

## `nyc` for enterprise

Available as part of the Tidelift Subscription.

The maintainers of `nyc` and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-nyc?utm_source=npm-nyc&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

[`@babel/register`]: https://www.npmjs.com/package/@babel/register
[`babel-plugin-istanbul`]: https://github.com/istanbuljs/babel-plugin-istanbul
[`@istanbuljs/nyc-config-babel`]: https://www.npmjs.com/package/@istanbuljs/nyc-config-babel
[selecting files for coverage]: #selecting-files-for-coverage
