# CHANGES for jsonpath-plus

## 10.3.0

- fix(eval): rce using non-string prop names (#237)
- feat(demo): make demo link shareable (#238)
- chore: update deps. and devDeps.

## 10.2.0

- fix(eval): improve security of safe-eval (#233)
- chore: update deps. and devDeps.

## 10.1.0

- feat: add typeof operator to safe script

## 10.0.7

- fix(security): prevent `constructor` access
- docs: add security policy file

## 10.0.6

- fix(security): prevent `call`/`apply` invocation of `Function`

## 10.0.5

- fix: remove overly aggressive disabling of native functions but
    disallow `__proto__`

## 10.0.4

- fix(security): further prevent binding of Function calls which may evade detection

## 10.0.3

- fix(security): prevent binding of Function calls which may evade detection

## 10.0.2

- fix(security): prevent Function calls outside of member expressions

## 10.0.1

- fix(security): prohibit `Function` in "safe" vm

## 10.0.0

BREAKING CHANGES:
- Require Node 18+

- fix(security): use safe vm by default in Node
- chore: bump jsep, devDeps. and lint

## 9.0.0

BREAKING CHANGES:
- Removes `preventEval` property. Prefer `eval: false` instead.
- Changed behavior of `eval` property. In the browser, `eval`/`Function` won't be used by default to evaluate expressions. Instead, we'll safely evaluate using a subset of JavaScript. To resume using unsafe eval in the browser, pass in the option `eval: "native"`

- feat: add safe eval for browser and `eval` option (#185) (@80avin)
- feat: add `ignoreEvalErrors` property (@80avin)

## 8.1.0

- feat: add basic cli (#206) (@vid)

## 8.0.0

- Breaking change: Bump Node `engines` to 14
- feat: add support for nested filter expressions (@carlosingles)
- docs: update README and license (@akirataguchi115)
- docs: github workflow badge (@dsanch3z)

## 7.2.0

- perf: optimize walk method by 10%-34% (@jacobroschen)
- chore: add types to exports field (@awlayton)

## 7.1.0

- perf: improve evaluation speed of conditional queries (@jacobroschen)

## 7.0.0

- Breaking change: Bump `engines` to 12
- fix: remove `console.log` when error is thrown (@sh33dafi)
- chore: update devDeps.

## 6.0.1 (2021-07-07)

- Fix: Some `package.json` paths needed updating (@matushorvath)
- npm: Update devDeps.

## 6.0.0 (2021-07-05)

### User-impacting

- Breaking enhancement: Create as true ESM module
- Breaking change: Utilize `.cjs` extension for UMD and CJS builds (very
    old browsers might not support, but needed with the change given that
    Webpack may complain if there even exists CJS within what it thinks is
    an ESM file, the ".js", our default)
- Breaking change: Utilize `.js` extension instead of `.mjs` for now default
    ESM builds

### Dev-impacting

- npm: Add `lint` script
- npm: Update devDeps.

## 5.1.0 (2021-06-24)

- Enhancement: support double-quoted bracket notation
- Linting: As per latest ash-nazg
- npm: Update devDeps.

## 5.0.7 (2021-04-12)

- Fix: Add `packge.json` to `exports` (@sebastiendavid)

## 5.0.6 (2021-04-09)

- Fix: Remove `static` modifiers (@sdolski)
- Linting: As per latest ash-nazg
- npm: Update devDeps.

## 5.0.5 (2021-04-09)

- Fix: Avoid cache corruption when the returned structure is modified.
    Fixes #102. (@tejodorus)

## 5.0.4 (2021-03-02)

- Fix: allow falsey at values in filter (now may require checking for
    presence of `@` in some cases); fixes #136
- Docs: Add old missing release info (reconciling with GitHub releases)
- Docs: Update README to reflect 1.2.0 was not a released version (subsume
    release details into 2.0.0)
- Linting: As per latest ash-nazg
- npm: Update devDeps.

## 5.0.3 (2021-02-06)

- Fix: Add package exports for browser and umd (#145) (@gjvoosten)
- Update: Build as per refactoring
- Docs: Update as per typedoc update
- Docs: Update license badges per latest
- Linting: As per latest ash-nazg
- CI: Update from Travis -> GitHub Actions
- npm: Switch from `eslint-plugin-sonarjs` to `eslint-plugin-radar`
- npm: Switch to pnpm
- npm: Update devDeps.

## 5.0.2 (2021-01-15)

- Fix: Proper Node CommonJS export; fixes #144

## 5.0.1 (2021-01-15)

- Fix: Proper Node CommonJS export; fixes #143
- Docs: Properly indicate new browser paths

## 5.0.0 (2021-01-14)

- Breaking change: Add `type: 'commonjs'` and `exports: {import, require}`
    (with `node-import-test` npm script to demo)
- Breaking change: Change paths for browser (now is
   `dist/index-browser-umd.js` or `dist/index-browser-es.js`)
   (for Node, `main` and `module` point to new Node-specific dist)
- Breaking enhancement:  Add `browser` for browser bundling;
    allowing static analysis environments, doesn't have however
    conditional code to require `vm`); for ESM browser bundling,
    now must check `browser` in Rollup Node resolver plugin;
    see README
- Build: Update per latest devDeps.
- Docs: Add Regex (`.match`) example on value (@jeffreypriebe)
- Docs: Add Regex (`.match`) example on property
- Docs: Fix XPath example (@humbertoc-silva)
- Docs: Link to XPath 2.0 tester
- Docs: Update badges per latest updates
- Linting: quote props
- Linting: As per latest ash-nazg
- Testing: Fix browser tests
- Testing: Add test case for setting values in callbacks (issue #126)
- Testing: Add more at-sign tests
- Testing: Bump timeout
- Travis: Check Node 14
- Travis: add default `dist` field to avoid extra config reporting
- npm: Update from deprecated `rollup-plugin-babel` to `@rollup/plugin-babel`
    (and make `babelHelpers` explicit)
- npm: Reorder scripts by test execution order
- npm: Update devDeps

## 4.0.0 (2020-04-09)

- Breaking change/fix: Disallow `resultType` from being lower-cased
    (broke `parentProperty`)
- Breaking change: Expect Node >= 10
- Build: As per latest rollup
- Linting: Check hidden files; update as per latest ash-nazg
- Docs: Update coverage badge
- npm: Update devDeps

## 3.0.0 (2020-01-13)

- Breaking change: Expect Node >= 8
- Fix: Require `json` as "own" property
- Fix: wrap: false returning inconsistent data types (@CacheControl)
- Fix: Ensure throwing with a bad result type
- Fix: Allow empty string keys
- Fix: Avoid erring when value before parent selector is falsey
- Fix: If `resultType` is "all", if path resolves internally to a
    non-array (string), ensure it is converted to an array before
    converting to pointer for `pointer`
- Enhancement: Allow path as array in non-object signature
- Docs: Add locally-generated badges for testing, coverage, etc.
- Linting (ESLint): As per latest ash-nazg
- Linting (ESLint): Remove redundant "use strict" with switch to ESM
- Maintenance: 2 sp. for package.json
- Testing: Add nyc for coverage
- Testing: Test against source (using `esm`)
- Testing: Improve coverage (more type operator tests)
- Testing: Check vm
- npm: Add `test-cov` script
- npm: Update devDeps

## 2.0.0 (2019-11-23)

- Breaking change: Throw `TypeError` instead of `Error` for missing
    `otherTypeCallback` when using `@other`
- Breaking change: Throw `TypeError` instead of `Error` for missing `path`
- Enhancement: Throw `TypeError` for missing `json` (fixes #110)
- Enhancement: Use more efficient `new Function` over `eval`;
    also allows use of cyclic context objects
- Enhancement: Add `@root` filter selector
- Maintenance: Add `.editorconfig`
- Docs: Document options in jsdoc; add return values to callbacks;
    fix constructor doc sig.
- Testing: Add test for missing `path` or `json`
- Testing: Remove unneeded closures
- npm: Update devDeps and `package-lock.json`

## 1.1.0 (September 26, 2019)

- Enhancement: Add explicit 'any' to `evaluate()` declaration (for use
  with `noImplicitAny` TypeScript option)
- Build: Update minified build files
- Travis: Update to check Node 6, 10, 12
- npm: Ignore `.idea`/`.remarkrc` files
- npm: Update devDeps (Babel, linting, Rollup, TypeScript related)
- npm: Avoid eslint script within test script
- npm: Ignore typescript docs

## 1.0.0 (August 7, 2019)

- Add TypeScript declaration

## 0.20.2 (July 9, 2019)

- `supportsNodeVM` check that works in GOJA, node and ReactNative. (@legander)

## 0.20.1 (June 12, 2019)

- npm: Avoid adding `core-js-bundle` as peerDep. (fixes #95)

## 0.20.0 (June 4, 2019)

- Build: Add `browserslist` for Babel builds
- Linting: Conform to ESLint updates (jsdoc)
- Testing: Switch from end-of-lifed nodeunit to Mocha
- Testing: Add performance test to browser, but bump duration
- npm: Update devDeps; add core-js-bundle to peerDependencies
- npm: Ignore some unneeded files
- Bump Node version in Travis to avoid erring with object rest
    in eslint-plugin-node routine

## 0.19.0 (May 16, 2019)

- Docs (README): Indicate features, including performance (removing old note)
- Docs (README): Add headings for setup and fix headings levels
- Docs (README): Indicate parent selector was not present in original spec
    (not just not documented)
- Docs (README): Fix escaping
- Linting: Switch to Unix line breaks and other changes per ash-nazg, including linting Markdown JS
- Linting: Use recommended `.json` extension
- Linting: Switch to ash-nazg
- Linting: Add lgtm.yml file for lgtm.com
- npm: Update devDeps, and update per security audit

## 0.18.1 (May 14, 2019)

- Fix: Expose `pointer` on `resultType: "all"`

## 0.18.0 (October 20, 2018)

- Security enhancement: Use global eval instead of regular eval
- Fix: Handle React-Native environment's lack of support for
    Node vm (@simon-scherzinger); closes #87
- Refactoring: Use arrow functions, for-of, declare block scope vars
    closer to block
- Docs: Clarify current `wrap` behavior
- npm: Add Rollup to test scripts

## 0.17.0 (October 19, 2018)

- Breaking change: With Node use, must now use
    `require('jsonpath-plus').JSONPath`.
- Breaking change: Stop including polyfills for array and string `includes`
    (can get with `@babel/polyfill` or own)
- Breaking change: Remove deprecated `JSONPath.eval`
- License: Remove old and unneeded license portion from within source file
    (already have external file)
- Fix: Support object shorthand functions on sandbox objects
    (`toString()` had not been working properly with them)
- Enhancement: Add Rollup/Babel/Terser and `module` in `package.json`
- Refactoring: Use ES6 features such as object shorthand
- Linting: prefer const and no var
- Testing: Replace custom server code with `node-static` and add `opn-cli`;
    mostly switch to ESM
- npm: Update devDeps; add `package-lock.json`; remove non-functioning remark

## 0.16.0 (January 14, 2017)

- Breaking change: Give preference to treating special chars in a property
    as special (override with backtick operator)
- Breaking feature: Add custom \` operator to allow unambiguous literal
    sequences (if an initial backtick is needed, an additional one must
    now be added)
- Fix: `toPathArray` caching bug
- Improvements: Performance optimizations
- Dev testing: Rename test file

## 0.15.0 (Mar 15, 2016)

- Fix: Fixing support for sandbox in the case of functions
- Feature: Use `this` if present for global export
- Docs: Clarify function signature
- Docs: Update testing section
- Dev testing: Add in missing test for browser testing
- Dev testing: Add remark linting to testing process (#70)
- Dev testing: Lint JS test support files
- Dev testing: Split out tests into `eslint`, `remark`, `lint`, `nodeunit`
- Dev testing: Remove need for nodeunit build step
- Dev testing: Simplify nodeunit usage and make available
  as `npm run browser-test`

## 0.14.0 (Jan 10, 2016)

- Feature: Add `@scalar()` type operator (in JavaScript mode, will also
    include)

## 0.13.1 (Jan 5, 2016)

- Fix: Avoid double-encoding path in results

## 0.13.0 (Dec 13, 2015)

- Breaking change (from version 0.11): Silently strip `~` and `^` operators
  and type operators such as `@string()` in `JSONPath.toPathString()` calls.
- Breaking change: Remove `Array.isArray` polyfill as no longer
  supporting IE <= 8
- Feature: Allow omission of options first argument to `JSONPath`
- Feature: Add `JSONPath.toPointer()` and "pointer" `resultType` option.
- Fix: Correctly support `callback` and `otherTypeCallback` as numbered
  arguments to `JSONPath`.
- Fix: Enhance Node checking to avoid issue reported with angular-mock
- Fix: Allow for `@` or other special characters in at-sign-prefixed
  property names (by use of `[?(@['...'])]` or  `[(@['...'])]`).

## 0.12.0 (Dec 12, 2015 10:39pm)

- Breaking change: Problems with upper-case letters in npm is causing
  us to rename the package, so have renamed package to "jsonpath-plus"
  (there are already package with lower-case "jsonpath" or "json-path").
  The new name also reflects that there have been changes to the
  original spec.

## 0.11.2 (Dec 12, 2015 10:36pm)

- Docs: Actually add the warning in the README that problems in npm
  with upper-case letters is causing us to rename to "jsonpath-plus"
  (next version will actually apply the change).

## 0.11.1 (Dec 12, 2015 10:11pm)

- Docs: Give warning in README that problems in npm with upper-case letters
  is causing us to rename to "jsonpath-plus" (next version will actually
  apply the change).

## 0.11.0 (Dec 12, 2015)

- Breaking change: For unwrapped results, return `undefined` instead
  of `false` upon failure to find path (to allow distinguishing of
  `undefined`--a non-allowed JSON value--from the valid JSON values,
  `null` or `false`) and return the exact value upon falsy single
  results (in order to allow return of `null`)
- Deprecated: Use of `jsonPath.eval()`; use new class-based API instead
- Feature: AMD export
- Feature: By using `self` instead of `window` export, allow JSONPath
  to be trivially imported into web workers, without breaking
  compatibility in normal scenarios. See [MDN on self](https://developer.mozilla.org/en-US/docs/Web/API/Window/self)
- Feature: Offer new class-based API and object-based arguments (with
  option to run new queries via `evaluate()` method without resupplying config)
- Feature: Allow new `preventEval=true` and `autostart=false` option
- Feature: Allow new callback option to allow a callback function to execute as
  each final result node is obtained
- Feature: Allow type operators: JavaScript types (`@boolean()`, `@number()`,
  `@string()`), other fundamental JavaScript types (`@null()`, `@object()`,
  `@array()`), the JSONSchema-added type, `@integer()`, and the following
  non-JSON types that can nevertheless be used with JSONPath when querying
  non-JSON JavaScript objects (`@undefined()`, `@function()`, `@nonFinite()`).
  Finally, `@other()` is made available in conjunction with a new callback
  option, `otherTypeCallback`, can be used to allow user-defined type
  detection (at least until JSON Schema awareness may be provided).
- Feature: Support "parent" and "parentProperty" for resultType along with
  "all" (which also includes "path" and "value" together)
- Feature: Support custom `@parent`, `@parentProperty`, `@property` (in
  addition to custom property `@path`) inside evaluations
- Feature: Support a custom operator (`~`) to allow grabbing of property names
- Feature: Support `$` for retrieval of root, and document this as well as
  `$..` behavior
- Feature: Expose cache on `JSONPath.cache` for those who wish to preserve and
  reuse it
- Feature: Expose class methods `toPathString` for converting a path as array
  into a (normalized) path as string and `toPathArray` for the reverse (though
  accepting unnormalized strings as well as normalized)
- Fix: Allow `^` as property name
- Fix: Support `.` within properties
- Fix: `@path` in index/property evaluations

## 0.10.0 (Oct 23, 2013)

- Feature: Support for parent selection via `^`
- Feature: Access current path via `@path` in test statements
- Feature: Allowing for multi-statement evals
- Improvements: Performance

## 0.9.0 (Mar 28, 2012)

- Feature: Support a sandbox arg to eval
- Improvements: Use `vm.runInNewContext` in place of eval
