# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [17.0.1](https://www.github.com/yargs/yargs/compare/v17.0.0...v17.0.1) (2021-05-03)


### Bug Fixes

* **build:** Node 12 is now minimum version ([#1936](https://www.github.com/yargs/yargs/issues/1936)) ([0924566](https://www.github.com/yargs/yargs/commit/09245666e57facb140e0b45a9e45ca704883e5dd))

## [17.0.0](https://www.github.com/yargs/yargs/compare/v16.2.0...v17.0.0) (2021-05-02)


### ⚠ BREAKING CHANGES

* **node:** drop Node 10 (#1919)
* implicitly private methods are now actually private
* deprecated reset() method is now private (call yargs() instead).
* **yargs-factory:** refactor yargs-factory to use class (#1895)
* .positional() now allowed at root level of yargs.
* **coerce:** coerce is now applied before validation.
* **async:** yargs now returns a promise if async or check are asynchronous.
* **middleware:** global middleware now applied when no command is configured.
* #1823 contains the following breaking API changes:
    * now returns a promise if handler is async.
    * onFinishCommand removed, in favor of being able to await promise.
    * getCompletion now invokes callback with err and `completions, returns promise of completions.

### Features

* add commands alias (similar to options function) ([#1850](https://www.github.com/yargs/yargs/issues/1850)) ([00b74ad](https://www.github.com/yargs/yargs/commit/00b74adcb30ab89b4450ef7105ef1ad32d820ebf))
* add parseSync/parseAsync method ([#1898](https://www.github.com/yargs/yargs/issues/1898)) ([6130ad8](https://www.github.com/yargs/yargs/commit/6130ad89b85dc49e34190e596e14a2fd3e668781))
* add support for `showVersion`, similar to `showHelp` ([#1831](https://www.github.com/yargs/yargs/issues/1831)) ([1a1e2d5](https://www.github.com/yargs/yargs/commit/1a1e2d554dca3566bc174584394419be0120d207))
* adds support for async builder ([#1888](https://www.github.com/yargs/yargs/issues/1888)) ([ade29b8](https://www.github.com/yargs/yargs/commit/ade29b864abecaa8c4f8dcc3493f5eb24fb73d84)), closes [#1042](https://www.github.com/yargs/yargs/issues/1042)
* allow calling standard completion function from custom one ([#1855](https://www.github.com/yargs/yargs/issues/1855)) ([31765cb](https://www.github.com/yargs/yargs/commit/31765cbdce812ee5c16aaae70ab523a2c7e0fcec))
* allow default completion to be referenced and modified, in custom completion ([#1878](https://www.github.com/yargs/yargs/issues/1878)) ([01619f6](https://www.github.com/yargs/yargs/commit/01619f6191a3ab16bf6b77456d4e9dfa80533907))
* **async:** add support for async check and coerce ([#1872](https://www.github.com/yargs/yargs/issues/1872)) ([8b95f57](https://www.github.com/yargs/yargs/commit/8b95f57bb2a49b098c6bf23cea88c6f900a34f89))
* improve support for async/await ([#1823](https://www.github.com/yargs/yargs/issues/1823)) ([169b815](https://www.github.com/yargs/yargs/commit/169b815df7ae190965f04030f28adc3ab92bb4b5))
* **locale:** add Ukrainian locale ([#1893](https://www.github.com/yargs/yargs/issues/1893)) ([c872dfc](https://www.github.com/yargs/yargs/commit/c872dfc1d87ebaa7fcc79801f649318a16195495))
* **middleware:** async middleware can now be used before validation. ([e0f9363](https://www.github.com/yargs/yargs/commit/e0f93636e04fa7e02a2c3b1fe465b6a14aa1f06d))
* **middleware:** global middleware now applied when no command is configured. ([e0f9363](https://www.github.com/yargs/yargs/commit/e0f93636e04fa7e02a2c3b1fe465b6a14aa1f06d))
* **node:** drop Node 10 ([#1919](https://www.github.com/yargs/yargs/issues/1919)) ([5edeb9e](https://www.github.com/yargs/yargs/commit/5edeb9ea17b1f0190a3590508f2e7911b5f70659))


### Bug Fixes

* always cache help message when running commands ([#1865](https://www.github.com/yargs/yargs/issues/1865)) ([d57ca77](https://www.github.com/yargs/yargs/commit/d57ca7751d533d7e0f216cd9fbf7c2b0ec98f791)), closes [#1853](https://www.github.com/yargs/yargs/issues/1853)
* **async:** don't call parse callback until async ops complete ([#1896](https://www.github.com/yargs/yargs/issues/1896)) ([a93f5ff](https://www.github.com/yargs/yargs/commit/a93f5ff35d7c09b01e0ca93d7d855d2b26593165)), closes [#1888](https://www.github.com/yargs/yargs/issues/1888)
* **builder:** apply default builder for showHelp/getHelp ([#1913](https://www.github.com/yargs/yargs/issues/1913)) ([395bb67](https://www.github.com/yargs/yargs/commit/395bb67749787d269cabe80ffc3133c2f6958aeb)), closes [#1912](https://www.github.com/yargs/yargs/issues/1912)
* **builder:** nested builder is now awaited ([#1925](https://www.github.com/yargs/yargs/issues/1925)) ([b5accd6](https://www.github.com/yargs/yargs/commit/b5accd64ccbd3ffb800517fb40d0f59382515fbb))
* **coerce:** options using coerce now displayed in help ([#1911](https://www.github.com/yargs/yargs/issues/1911)) ([d2128cc](https://www.github.com/yargs/yargs/commit/d2128cc4ffd411eed7111e6a3c561948330e4f6f)), closes [#1909](https://www.github.com/yargs/yargs/issues/1909)
* completion script name clashing on bash ([#1903](https://www.github.com/yargs/yargs/issues/1903)) ([8f62d9a](https://www.github.com/yargs/yargs/commit/8f62d9a9e8bebf86f988c100ad3c417dc32b2471))
* **deno:** use actual names for keys instead of inferring ([#1891](https://www.github.com/yargs/yargs/issues/1891)) ([b96ef01](https://www.github.com/yargs/yargs/commit/b96ef01b16bc5377b79d7914dd5495068037fe7b))
* exclude positionals from default completion ([#1881](https://www.github.com/yargs/yargs/issues/1881)) ([0175677](https://www.github.com/yargs/yargs/commit/0175677b79ffe50a9c5477631288ae10120b8a32))
* https://github.com/yargs/yargs/issues/1841#issuecomment-804770453 ([b96ef01](https://www.github.com/yargs/yargs/commit/b96ef01b16bc5377b79d7914dd5495068037fe7b))
* showHelp() and .getHelp() now return same output for commands as --help ([#1826](https://www.github.com/yargs/yargs/issues/1826)) ([36abf26](https://www.github.com/yargs/yargs/commit/36abf26919b5a19f3adec08598539851c34b7086))
* zsh completion is now autoloadable ([#1856](https://www.github.com/yargs/yargs/issues/1856)) ([d731f9f](https://www.github.com/yargs/yargs/commit/d731f9f9adbc11f918e918443c5bff4149fc6681))


### Code Refactoring

* **coerce:** coerce is now applied before validation. ([8b95f57](https://www.github.com/yargs/yargs/commit/8b95f57bb2a49b098c6bf23cea88c6f900a34f89))
* deprecated reset() method is now private (call yargs() instead). ([376f892](https://www.github.com/yargs/yargs/commit/376f89242733dcd4ecb8040685c40ae1d622931d))
* implicitly private methods are now actually private ([376f892](https://www.github.com/yargs/yargs/commit/376f89242733dcd4ecb8040685c40ae1d622931d))
* **yargs-factory:** refactor yargs-factory to use class ([#1895](https://www.github.com/yargs/yargs/issues/1895)) ([376f892](https://www.github.com/yargs/yargs/commit/376f89242733dcd4ecb8040685c40ae1d622931d))

## [16.2.0](https://www.github.com/yargs/yargs/compare/v16.1.1...v16.2.0) (2020-12-05)


### Features

* command() now accepts an array of modules ([f415388](https://www.github.com/yargs/yargs/commit/f415388cc454d02786c65c50dd6c7a0cf9d8b842))


### Bug Fixes

* add package.json to module exports ([#1818](https://www.github.com/yargs/yargs/issues/1818)) ([d783a49](https://www.github.com/yargs/yargs/commit/d783a49a7f21c9bbd4eec2990268f3244c4d5662)), closes [#1817](https://www.github.com/yargs/yargs/issues/1817)

### [16.1.1](https://www.github.com/yargs/yargs/compare/v16.1.0...v16.1.1) (2020-11-15)


### Bug Fixes

* expose helpers for legacy versions of Node.js ([#1801](https://www.github.com/yargs/yargs/issues/1801)) ([107deaa](https://www.github.com/yargs/yargs/commit/107deaa4f68b7bc3f2386041e1f4fe0272b29c0a))
* **deno:** get yargs working on deno@1.5.x ([#1799](https://www.github.com/yargs/yargs/issues/1799)) ([cb01c98](https://www.github.com/yargs/yargs/commit/cb01c98c44e30f55c2dc9434caef524ae433d9a4))

## [16.1.0](https://www.github.com/yargs/yargs/compare/v16.0.3...v16.1.0) (2020-10-15)


### Features

* expose hideBin helper for CJS ([#1768](https://www.github.com/yargs/yargs/issues/1768)) ([63e1173](https://www.github.com/yargs/yargs/commit/63e1173bb47dc651c151973a16ef659082a9ae66))


### Bug Fixes

* **deno:** update types for deno ^1.4.0 ([#1772](https://www.github.com/yargs/yargs/issues/1772)) ([0801752](https://www.github.com/yargs/yargs/commit/080175207d281be63edf90adfe4f0568700b0bf5))
* **exports:** node 13.0-13.6 require a string fallback ([#1776](https://www.github.com/yargs/yargs/issues/1776)) ([b45c43a](https://www.github.com/yargs/yargs/commit/b45c43a5f64b565c3794f9792150eaeec4e00b69))
* **modules:** module path was incorrect ([#1759](https://www.github.com/yargs/yargs/issues/1759)) ([95a4a0a](https://www.github.com/yargs/yargs/commit/95a4a0ac573cfe158e6e4bc8c8682ebd1644a198))
* **positional:** positional strings no longer drop decimals ([#1761](https://www.github.com/yargs/yargs/issues/1761)) ([e1a300f](https://www.github.com/yargs/yargs/commit/e1a300f1293ad821c900284616337f080b207980))
* make positionals in -- count towards validation ([#1752](https://www.github.com/yargs/yargs/issues/1752)) ([eb2b29d](https://www.github.com/yargs/yargs/commit/eb2b29d34f1a41e0fd6c4e841960e5bfc329dc3c))

### [16.0.3](https://www.github.com/yargs/yargs/compare/v16.0.2...v16.0.3) (2020-09-10)


### Bug Fixes

* move yargs.cjs to yargs to fix Node 10 imports ([#1747](https://www.github.com/yargs/yargs/issues/1747)) ([5bfb85b](https://www.github.com/yargs/yargs/commit/5bfb85b33b85db8a44b5f7a700a8e4dbaf022df0))

### [16.0.2](https://www.github.com/yargs/yargs/compare/v16.0.1...v16.0.2) (2020-09-09)


### Bug Fixes

* **typescript:** yargs-parser was breaking @types/yargs ([#1745](https://www.github.com/yargs/yargs/issues/1745)) ([2253284](https://www.github.com/yargs/yargs/commit/2253284b233cceabd8db677b81c5bf1755eef230))

### [16.0.1](https://www.github.com/yargs/yargs/compare/v16.0.0...v16.0.1) (2020-09-09)


### Bug Fixes

* code was not passed to process.exit ([#1742](https://www.github.com/yargs/yargs/issues/1742)) ([d1a9930](https://www.github.com/yargs/yargs/commit/d1a993035a2f76c138460052cf19425f9684b637))

## [16.0.0](https://www.github.com/yargs/yargs/compare/v15.4.2...v16.0.0) (2020-09-09)


### ⚠ BREAKING CHANGES

* tweaks to ESM/Deno API surface: now exports yargs function by default; getProcessArgvWithoutBin becomes hideBin; types now exported for Deno.
* find-up replaced with escalade; export map added (limits importable files in Node >= 12); yarser-parser@19.x.x (new decamelize/camelcase implementation).
* **usage:** single character aliases are now shown first in help output
* rebase helper is no longer provided on yargs instance.
* drop support for EOL Node 8 (#1686)

### Features

* adds strictOptions() ([#1738](https://www.github.com/yargs/yargs/issues/1738)) ([b215fba](https://www.github.com/yargs/yargs/commit/b215fba0ed6e124e5aad6cf22c8d5875661c63a3))
* **helpers:** rebase, Parser, applyExtends now blessed helpers ([#1733](https://www.github.com/yargs/yargs/issues/1733)) ([c7debe8](https://www.github.com/yargs/yargs/commit/c7debe8eb1e5bc6ea20b5ed68026c56e5ebec9e1))
* adds support for ESM and Deno ([#1708](https://www.github.com/yargs/yargs/issues/1708)) ([ac6d5d1](https://www.github.com/yargs/yargs/commit/ac6d5d105a75711fe703f6a39dad5181b383d6c6))
* drop support for EOL Node 8 ([#1686](https://www.github.com/yargs/yargs/issues/1686)) ([863937f](https://www.github.com/yargs/yargs/commit/863937f23c3102f804cdea78ee3097e28c7c289f))
* i18n for ESM and Deno ([#1735](https://www.github.com/yargs/yargs/issues/1735)) ([c71783a](https://www.github.com/yargs/yargs/commit/c71783a5a898a0c0e92ac501c939a3ec411ac0c1))
* tweaks to API surface based on user feedback ([#1726](https://www.github.com/yargs/yargs/issues/1726)) ([4151fee](https://www.github.com/yargs/yargs/commit/4151fee4c33a97d26bc40de7e623e5b0eb87e9bb))
* **usage:** single char aliases first in help ([#1574](https://www.github.com/yargs/yargs/issues/1574)) ([a552990](https://www.github.com/yargs/yargs/commit/a552990c120646c2d85a5c9b628e1ce92a68e797))


### Bug Fixes

* **yargs:** add missing command(module) signature ([#1707](https://www.github.com/yargs/yargs/issues/1707)) ([0f81024](https://www.github.com/yargs/yargs/commit/0f810245494ccf13a35b7786d021b30fc95ecad5)), closes [#1704](https://www.github.com/yargs/yargs/issues/1704)

[Older CHANGELOG Entries](https://github.com/yargs/yargs/blob/master/docs/CHANGELOG-historical.md)
