# Release Notes

## Development

[Commits](https://github.com/handlebars-lang/handlebars.js/compare/v4.7.8...master)

## v4.7.8 - July 27th, 2023

- Make library compatible with workers (#1894) - 3d3796c
- Don't rely on Node.js global object (#1776) - 2954e7e
- Fix compiling of each block params in strict mode (#1855) - 30dbf04
- Fix rollup warning when importing Handlebars as ESM - 03d387b
- Fix bundler issue with webpack 5 (#1862) - c6c6bbb
- Use https instead of git for mustache submodule - 88ac068

[Commits](https://github.com/handlebars-lang/handlebars.js/compare/v4.7.7...v4.7.8)

## v4.7.7 - February 15th, 2021

- fix weird error in integration tests - eb860c0
- fix: check prototype property access in strict-mode (#1736) - b6d3de7
- fix: escape property names in compat mode (#1736) - f058970
- refactor: In spec tests, use expectTemplate over equals and shouldThrow (#1683) - 77825f8
- chore: start testing on Node.js 12 and 13 - 3789a30

(POSSIBLY) BREAKING CHANGES:

- the changes from version [4.6.0](https://github.com/handlebars-lang/handlebars.js/blob/master/release-notes.md#v460---january-8th-2020) now also apply
  in when using the compile-option "strict: true". Access to prototype properties is forbidden completely by default, specific properties or methods
  can be allowed via runtime-options. See #1633 for details. If you are using Handlebars as documented, you should not be accessing prototype properties
  from your template anyway, so the changes should not be a problem for you. Only the use of undocumented features can break your build.

That is why we only bump the patch version despite mentioning breaking changes.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.6...v4.7.7)

## v4.7.6 - April 3rd, 2020

Chore/Housekeeping:

- [#1672](https://github.com/wycats/handlebars.js/issues/1672) - Switch cmd parser to latest minimist ([@dougwilson](https://api.github.com/users/dougwilson)

Compatibility notes:

- Restored Node.js compatibility

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.5...v4.7.6)

## v4.7.5 - April 2nd, 2020

Chore/Housekeeping:

- ~Node.js version support has been changed to v6+~ Reverted in 4.7.6

Compatibility notes:

- ~Node.js < v6 is no longer supported~ Reverted in 4.7.6

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.4...v4.7.5)

## v4.7.4 - April 1st, 2020

Chore/Housekeeping:

- [#1666](https://github.com/wycats/handlebars.js/issues/1666) - Replaced minimist with yargs for handlebars CLI ([@aorinevo](https://api.github.com/users/aorinevo), [@AviVahl](https://api.github.com/users/AviVahl) & [@fabb](https://api.github.com/users/fabb))

Compatibility notes:

- No incompatibilities are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.3...v4.7.4)

## v4.7.3 - February 5th, 2020

Chore/Housekeeping:

- [#1644](https://github.com/wycats/handlebars.js/issues/1644) - Download links to aws broken on handlebarsjs.com - access denied ([@Tea56](https://api.github.com/users/Tea56))
- Fix spelling and punctuation in changelog - d78cc73

Bugfixes:

- Add Type Definition for Handlebars.VERSION, Fixes #1647 - 4de51fe
- Include Type Definition for runtime.js in Package - a32d05f

Compatibility notes:

- No incompatibilities are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.2...v4.7.3)

## v4.7.2 - January 13th, 2020

Bugfixes:

- fix: don't wrap helpers that are not functions - 9d5aa36, #1639

Chore/Build:

- chore: execute saucelabs-task only if access-key exists - a4fd391

Compatibility notes:

- No breaking changes are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.1...v4.7.2)

## v4.7.1 - January 12th, 2020

Bugfixes:

- fix: fix log output in case of illegal property access - f152dfc
- fix: log error for illegal property access only once per property - 3c1e252

Compatibility notes:

- no incompatibilities are to be expected.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.7.0...v4.7.1)

## v4.7.0 - January 10th, 2020

Features:

- feat: default options for controlling proto access - 7af1c12, #1635
  - This makes it possible to disable the prototype access restrictions added in 4.6.0
  - an error is logged in the console, if access to prototype properties is attempted and denied
    and no explicit configuration has taken place.

Compatibility notes:

- no compatibilities are expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.6.0...v4.7.0)

## v4.6.0 - January 8th, 2020

Features:

- feat: access control to prototype properties via whitelist (#1633)- d03b6ec

Bugfixes:

- fix(runtime.js): partials compile not caching (#1600) - 23d58e7

Chores, docs:

- various refactorings and improvements to tests - d7f0dcf, 187d611, d337f40
- modernize the build-setup
  - use prettier to format and eslint to verify - c40d9f3, 8901c28, e97685e, 1f61f21
  - use nyc instead of istanbul to collect coverage - 164b7ff, 1ebce2b
  - update build code to use modern javascript and make it cleaner - 14b621c, 1ec1737, 3a5b65e, dde108e, 04b1984, 587e7a3
  - restructur build commands - e913dc5,
- eslint rule changes - ac4655e, dc54952
- Update (C) year in the LICENSE file - d1fb07b
- chore: try to fix saucelabs credentials (#1627) -
- Update readme.md with updated links (#1620) - edcc84f

BREAKING CHANGES:

- access to prototype properties is forbidden completely by default,
  specific properties or methods can be allowed via runtime-options.
  See #1633 for details.
  If you are using Handlebars as documented, you should not be accessing prototype
  properties from your template anyway, so the changes should not be a problem
  for you. Only the use of undocumented features can break your build.

  That is why we only bump the minor version despite mentioning breaking changes.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.5.3...v4.6.0)

## v4.5.3 - November 18th, 2019

Bugfixes:

- fix: add "no-prototype-builtins" eslint-rule and fix all occurences - f7f05d7
- fix: add more properties required to be enumerable - 1988878

Chores / Build:

- fix: use !== 0 instead of != 0 - c02b05f
- add chai and dirty-chai and sinon, for cleaner test-assertions and spies,
  deprecate old assertion-methods - 93e284e, 886ba86, 0817dad, 93516a0

Security:

- The properties `__proto__`, `__defineGetter__`, `__defineSetter__` and `__lookupGetter__`
  have been added to the list of "properties that must be enumerable".
  If a property by that name is found and not enumerable on its parent,
  it will silently evaluate to `undefined`. This is done in both the compiled template and the "lookup"-helper.
  This will prevent new Remote-Code-Execution exploits that have been
  published recently.

Compatibility notes:

- Due to the security-fixes. The semantics of the templates using
  `__proto__`, `__defineGetter__`, `__defineSetter__` and `__lookupGetter__` in the respect that those expression now return
  `undefined` rather than their actual value from the proto.
- The semantics have not changed in cases where the properties are enumerable, as in:

```js
{
  __proto__: 'some string';
}
```

- The change may be breaking in that respect, but we still only
  increase the patch-version, because the incompatible use-cases
  are not intended, undocumented and far less important than fixing
  Remote-Code-Execution exploits on existing systems.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.5.2...v4.5.3)

## v4.5.2 - November 13th, 2019

# Bugfixes

- fix: use String(field) in lookup when checking for "constructor" - d541378
- test: add fluent API for testing Handlebars - c2ac79c

Compatibility notes:

- no incompatibility are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.5.1...v4.5.2)

## v4.5.1 - October 29th, 2019

Bugfixs

- fix: move "eslint-plugin-compat" to devDependencies - 5e9d17f (#1589)

Compatibility notes:

- No compatibility issues are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.5.0...v4.5.1)

## v4.5.0 - October 28th, 2019

Features / Improvements

- Add method Handlebars.parseWithoutProcessing (#1584) - 62ed3c2
- add guard to if & unless helpers (#1549)
- show source location for the strict lookup exceptions - feb60f8

Bugfixes:

- Use objects for hash value tracking - 7fcf9d2

Chore:

- Resolve deprecation warning message from eslint while running eslint (#1586) - 7052e88
- chore: add eslint-plugin-compat and eslint-plugin-es5 - 088e618

Compatibility notes:

- No compatibility issues are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.4.5...v4.5.0)

## v4.4.5 - October 20th, 2019

Bugfixes:

- Contents of raw-blocks must be matched with non-eager regex-matching - 8d5530e, #1579

[Commits](https://github.com/wycats/handlebars.js/compare/v4.4.4...v4.4.5)

## v4.4.4 - October 20th, 2019

Bugfixes:

- fix: prevent zero length tokens in raw-blocks (#1577, #1578) - f1752fe

Chore:

- chore: link to s3 bucket with https, add "npm ci" to build instructions - 0b593bf

Compatibility notes:

- no compatibility issues are expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.4.3...v4.4.4)

## v4.4.3 - October 8th, 2019

Bugfixes

Typings:

- add missing type fields to AST typings and add tests for them - 0440af2

[Commits](https://github.com/wycats/handlebars.js/compare/v4.4.2...v4.4.3)

## v4.4.2 - October 2nd, 2019

- chore: fix grunt-saucelabs dependency - b7eada0

[Commits](https://github.com/wycats/handlebars.js/compare/v4.4.1...v4.4.2)

## v4.4.1 - October 2nd, 2019

- [#1562](https://github.com/wycats/handlebars.js/issues/1562) - Error message for syntax error missing location in 4.2.1+

[Commits](https://github.com/wycats/handlebars.js/compare/v4.4.0...v4.4.1)

## v4.4.0 - September 29th, 2019

- Added support for iterable objects in {{#each}} helper (#1557) - cf7545e

[Commits](https://github.com/wycats/handlebars.js/compare/v4.3.4...v4.4.0)

## v4.3.4 - September 28th, 2019

- fix: harden "propertyIsEnumerable"-check - ff4d827

Compatibility notes:

- No incompatibilities are known.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.3.3...v4.3.4)

## v4.3.3 - September 27th, 2019

- fix test case for browsers that do not support **defineGetter** - 8742bde

[Commits](https://github.com/wycats/handlebars.js/compare/v4.3.2...v4.3.3)

## v4.3.2 - September 26th, 2019

- Use Object.prototype.propertyIsEnumerable to check for constructors - 213c0bb, #1563

Compatibility notes:

- There are no breaking changes

[Commits](https://github.com/wycats/handlebars.js/compare/v4.3.1...v4.3.2)

## v4.3.1 - September 25th, 2019

Fixes:

- do not break on precompiled templates from Handlebars >=4.0.0 <4.3.0 - 1266838, #1561
- Ensure allowCallsToHelperMissing runtime option is optional in typings - 93444c5, 64ecb9e, #1560

[Commits](https://github.com/wycats/handlebars.js/compare/v4.3.0...v4.3.1)

## v4.3.0 - September 24th, 2019

Fixes:

- Security: Disallow calling "helperMissing" and "blockHelperMissing" directly - 2078c72
- Disallow calling "helperMissing" and "blockHelperMissing" directly - 2078c72

Features:

- Add new runtime option `allowCallsToHelperMissing` to allow calling `blockHelperMissing` and `helperMissing`.

Breaking changes:

Compatibility notes:

- Compiler revision increased - 06b7224

  - This means that template compiled with versions prior to 4.3.0 will not work with runtimes >= 4.3.0
    The increase was done because the "helperMissing" and "blockHelperMissing" are now moved from the helpers
    to the internal "container.hooks" object, so old templates will not be able to call them anymore. We suggest
    that you always recompile your templates with the latest compiler in your build pipelines.

- Disallow calling "helperMissing" and "blockHelperMissing" directly - 2078c72
  - Calling "helperMissing" and "blockHelperMissing" directly from a template (like in `{{blockHelperMissing}}` was
    never intended and was part of the exploits that have been revealed early in 2019
    (see https://github.com/wycats/handlebars.js/issues/1495). _It is also part of a new exploit that
    is not captured by the earlier fix._ In order to harden Handlebars against such exploits, calling thos helpers
    is now not possible anymore. _Overriding_ those helpers is still possible.
  - If you really need this behavior, you can set the runtime option `allowCallsToHelperMissing` to `true` and the
    calls will again be possible

Both bullet points imly that Handlebars is not 100% percent compatible to 4.2.0, despite the minor version bump.

We consider it more important to resolve a major security issue than to maintain 100% compatibility.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.2.1...v4.3.0)

## v4.2.1 - September 20th, 2019

Bugfixes:

- The "browser" property in the package.json has been updated to use the common-js builds instead of the minified UMD - c55a7be, #1553

Compatibility notes:

- No compatibility issues should arise

[Commits](https://github.com/wycats/handlebars.js/compare/v4.2.0...v4.2.1)

## v4.2.0 - September 3rd, 2019

Chore/Test:

- Use custom `grunt-saucelab` with current sauce-connect proxy - f119497
- Add framework for various integration tests - f9cce4d
- Add integration test for webpack - a57b682

Bugfixes:

- [#1544](https://github.com/wycats/handlebars.js/issues/1544) - Typescript types: `knownHelpers` doesnt allow for custom helpers ([@NickCis](https://api.github.com/users/NickCis))
- [#1534](https://github.com/wycats/handlebars.js/pull/1534) - Add typings for "Handlebars.VM.resolvePartial ([@AndrewLeedham](https://api.github.com/users/AndrewLeedham))

Features:

- [#1540](https://github.com/wycats/handlebars.js/pull/1540) - added "browser"-property to package.json, resolves #1102 ([@ouijan](https://api.github.com/users/ouijan))

Compatibility notes:

- The new "browser"-property should not break anything, but you can never be sure. The integration test for webpack
  shows that it works, but if it doesn't please open an issue.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.1.2-0...v4.2.0)

## v4.1.2-0 - August 25th, 2019

[#1540](https://github.com/wycats/handlebars.js/pull/1540) - added browser to package.json, resolves #1102 ([@ouijan](https://api.github.com/users/ouijan))

Compatibility notes:

- We are not sure if imports via webpack are still working, which is why this release is a pre-release

[Commits](https://github.com/wycats/handlebars.js/compare/v4.1.2...v4.1.2-0)

## v4.1.2 - April 13th, 2019

Chore/Test:

- [#1515](https://github.com/wycats/handlebars.js/pull/1515) - Port over linting and test for typings ([@zimmi88](https://api.github.com/users/zimmi88))
- chore: add missing typescript dependency, add package-lock.json - 594f1e3
- test: remove safari from saucelabs - 871accc

Bugfixes:

- fix: prevent RCE through the "lookup"-helper - cd38583

Compatibility notes:

Access to the constructor of a class thought `{{lookup obj "constructor" }}` is now prohibited. This closes
a leak that only half closed in versions 4.0.13 and 4.1.0, but it is a slight incompatibility.

This kind of access is not the intended use of Handlebars and leads to the vulnerability described
in #1495. We will **not** increase the major version, because such use is not intended or documented,
and because of the potential impact of the issue (we fear that most people won't use a new major version
and the issue may not be resolved on many systems).

[Commits](https://github.com/wycats/handlebars.js/compare/v4.1.1...v4.1.2)

## v4.1.1 - March 16th, 2019

Bugfixes:

- fix: add "runtime.d.ts" to allow "require('handlebars/runtime')" in TypeScript - 5cedd62

Refactorings:

- replace "async" with "neo-async" - 048f2ce
- use "substring"-function instead of "substr" - 445ae12

Compatibility notes:

- This is a bugfix release. There are no breaking change and no new features.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.1.0...v4.1.1)

## v4.1.0 - February 7th, 2019

New Features

- import TypeScript typings - 27ac1ee

Security fixes:

- disallow access to the constructor in templates to prevent RCE - 42841c4, #1495

Housekeeping

- chore: fix components/handlebars package.json and auto-update on release - bacd473
- chore: Use node 10 to build handlebars - 78dd89c
- chore/doc: Add more release docs - 6b87c21

Compatibility notes:

Access to class constructors (i.e. `({}).constructor`) is now prohibited to prevent
Remote Code Execution. This means that following construct will no work anymore:

```
class SomeClass {
}

SomeClass.staticProperty = 'static'

var template = Handlebars.compile('{{constructor.staticProperty}}');
document.getElementById('output').innerHTML = template(new SomeClass());
// expected: 'static', but now this is empty.
```

This kind of access is not the intended use of Handlebars and leads to the vulnerability described in #1495. We will **not** increase the major version, because such use is not intended or documented, and because of the potential impact of the issue (we fear that most people won't use a new major version and the issue may not be resolved on many systems).

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.12...v4.1.0)

## v4.0.12 - September 4th, 2018

New features:

- none

Various dependency updates

- [#1464](https://github.com/wycats/handlebars.js/pull/1464) - Bump versions of grunt-plugins to 1.x
- [#1398](https://github.com/wycats/handlebars.js/pull/1398) - Chore: updated various dev dependencies
- upgrade uglify-js - d3d3942
- Update grunt-eslint to 20.1.0 - 7729aa9
- Update dependencies "async" to 2.5.0 and "source-map" to 0.6.1 (73d5637)

Bugfixes:

- [components/handlebars.js#24](https://github.com/components/handlebars.js#24) Add package.json to components shim
- Updated `source-map`-package should work better with `rollup`[#1463](https://github.com/wycats/handlebars.js/issues/1463)

Removed obsolete code:

- unnecessary check - 0ddff8b
- Use `files` field - 69c6ca5
- Update jsfiddle to 4.0.11 - 8947dd0

Compatibility notes:

- No compatibility issues are to be expected

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.11...v4.0.12)

## v4.0.11 - October 17th, 2017

- [#1391](https://github.com/wycats/handlebars.js/issues/1391) - `uglify-js` is unconditionally imported, but only listed as optional dependency ([@Turbo87](https://github.com/Turbo87))
- [#1233](https://github.com/wycats/handlebars.js/issues/1233) - Unable to build under windows - error at test:bin task ([@blikblum](https://github.com/blikblum))
- Update (C) year in the LICENSE file - 21386b6

Compatibility notes:

- This is a bugfix release. There are no breaking change and no new features.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.10...v4.0.11)

## v4.0.10 - May 21st, 2017

- Fix regression in 4.0.9: Replace "Object.assign" (not support in IE) by "util/extend" - 0e953d1

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.9...v4.0.10)

## v4.0.9 - May 21st, 2017

- [#1327](https://github.com/wycats/handlebars.js/issues/1327) Handlebars.compile() does not modify "options" anymore
- pending [#1331](https://github.com/wycats/handlebars.js/issues/1331) Attempts to build Handlebars in a Windows environment
  - Fix build in windows - cc554a5
  - Ensure LF line-edings in handlebars-template fixtures (\*.hbs) - ed879a6
  - Run integration test with `node handlebars -a ...` on Windows - 2e21e2b
  - Ensure LF line-edings in lexer-files (\*.l) - bdfdbea
  - Force LF line-endings for spec/artifacts - b50ef03
  - Use istanbul/lib/cli.js instead of node_modules/.bin/istanbul - 6e6269f
- TravisCI: Publish valid semver tags independently of the branch - 7378f85

Compatibility notes:

- No compatibility issues are expected.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.8...v4.0.9)

## v4.0.8 - May 2nd, 2017

- [#1341](https://github.com/wycats/handlebars.js/issues/1341) [#1342](https://github.com/wycats/handlebars.js/issues/1342) Allow partial-blocks to be executed without "options" ([@nknapp](https://github.com/nknapp)) - a00c598

Compatibility notes:

- No breaking changes

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.7...v4.0.8)

## v4.0.7 - April 29th, 2017

- [#1319](https://github.com/wycats/handlebars.js/issues/1319): Fix context-stack when calling block-helpers on null values ([@nknapp](https://github.com/nknapp)) - c8f4b57
- [#1315](https://github.com/wycats/handlebars.js/pull/1315) Parser: Change suffix to use ES6 default module export ([@Turbo87](https://github.com/Turbo87))- b617375
- [#1290](https://github.com/wycats/handlebars.js/pull/1290) [#1252](https://github.com/wycats/handlebars.js/issue/1290) Add more tests for partial-blocks and inline partials ([@nknapp](https://github.com/nknapp)) - 63a8e0c
- [#1252](https://github.com/wycats/handlebars.js/issue/1290) Using @partial-block twice in a template not possible ([@nknapp](https://github.com/nknapp)) - 5a164d0
- [#1310](https://github.com/wycats/handlebars.js/pull/1310) Avoid duplicate "sourceMappingURL=" lines. ([@joonas-lahtinen](https://github.com/joonas-lahtinen)) - 01b0f65
- [#1275](https://github.com/wycats/handlebars.js/pull/1275) require('sys') is deprecated, using 'util' instead ([@travnels](https://github.com/travnels)) - 406f2ee
- [#1285](https://github.com/wycats/handlebars.js/pull/1285) [#1284](https://github.com/wycats/handlebars.js/issues/1284) Make "column"-property of Errors enumerable ([@nknapp](https://github.com/nknapp)) - a023cb4
- [#1285](https://github.com/wycats/handlebars.js/pull/1285) Testcase to verify that compile-errors have a column-property ([@nknapp](https://github.com/nknapp)) - c7dc353

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.6...v4.0.7)

## v4.0.6 - November 12th, 2016

- [#1243](https://github.com/wycats/handlebars.js/pull/1243) - Walk up data frames for nested @partial-block ([@lawnsea](https://github.com/lawnsea))
- [#1210](https://github.com/wycats/handlebars.js/pull/1210) - Add a new lightweight package based on handlebars in the README ([@kabirbaidhya](https://github.com/kabirbaidhya))
- [#1187](https://github.com/wycats/handlebars.js/pull/1187) - Ensure that existing blockParams and depths are respected on dupe programs ([@charleso](https://github.com/charleso))
- [#1191](https://github.com/wycats/handlebars.js/pull/1191) - Added cory ([@leo](https://github.com/leo))
- [#1177](https://github.com/wycats/handlebars.js/pull/1177) - Preserve License info in Closure Compiler ([@gennadiylitvinyuk](https://github.com/gennadiylitvinyuk))
- [#1171](https://github.com/wycats/handlebars.js/pull/1171) - Contributing doc fix: failing thats -> failing tests ([@paulfalgout](https://github.com/paulfalgout))
- [#1166](https://github.com/wycats/handlebars.js/pull/1166) - Update license date ([@timwangdev](https://github.com/timwangdev))
- Update jsfiddle to point to latest - 959ee55 (originally dfc7554 by [@kpdecker](https://github.com/kpdecker))
- [#1163](https://github.com/wycats/handlebars.js/pull/1163) - Fix typos on decorators-api.md. ([@adjohnson916](https://github.com/adjohnson916))
- Drop extra Error params - 8c19874 (originally 63fdb92 by [@kpdecker](https://github.com/kpdecker))
- [#1153](https://github.com/wycats/handlebars.js/pull/1153) - Add documentation for running tests to contributing.md ([@ryanmurakami](https://github.com/ryanmurakami))
- Avoid error in older browsers in test - 400916c (originally a6121ca by [@kpdecker](https://github.com/kpdecker))
- Update target browser test versions - fee2334 (originally 871c32a by [@kpdecker](https://github.com/kpdecker))
- Exclude coverage check in exception conditional - 32d6363 (originally 326734b by [@kpdecker](https://github.com/kpdecker))
- Fix throw when creating exception object in Safari - 20c965c (originally 2ea6119 by [@kpdecker](https://github.com/kpdecker))
- Update build for modern node versions - 6c9f98c (originally 8289c0b by [@kpdecker](https://github.com/kpdecker))
- [#1135](https://github.com/wycats/handlebars.js/issues/1135) - Relax depth check for context push - c393c81 (originally 25458fd by [@kpdecker](https://github.com/kpdecker))

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.5...v4.0.6)

## v4.0.5 - November 19th, 2015

- [#1132](https://github.com/wycats/handlebars.js/pull/1132) - Update uglify-js to avoid vulnerability ([@plynchnlm](https://github.com/plynchnlm))
- [#1129](https://github.com/wycats/handlebars.js/issues/1129) - Minified lib returns an empty string ([@bricss](https://github.com/bricss))
- Return current handlebars instance from noConflict - 685cf92
- Add webpack to dev dependency to support npm 3 - 7a6c228
- Further relax uglify dependency - 0a3b3c2
- Include tests for minimized artifacts - c21118d
- Fix lint errors under latest eslint - 9f59de9
- Add print-script helper script - 98a6717

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.4...v4.0.5)

## v4.0.4 - October 29th, 2015

- [#1121](https://github.com/wycats/handlebars.js/pull/1121) - Include partial name in 'undefined partial' exception message ([@shinypb](https://github.com/shinypb))
- [#1125](https://github.com/wycats/handlebars.js/pull/1125) - Add promised-handlebars to "in-the-wild"-list ([@nknapp](https://github.com/nknapp))

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.3...v4.0.4)

## v4.0.3 - September 23rd, 2015

- [#1099](https://github.com/wycats/handlebars.js/issues/1099) - @partial-block is overridden ([@btmorex](https://github.com/btmorex))
- [#1093](https://github.com/wycats/handlebars.js/issues/1093) - #each skips iteration on undefined values ([@florianpilz](https://github.com/florianpilz))
- [#1092](https://github.com/wycats/handlebars.js/issues/1092) - Square braces in key name ([@distantnative](https://github.com/distantnative))
- [#1091](https://github.com/wycats/handlebars.js/pull/1091) - fix typo in release notes ([@nikolas](https://github.com/nikolas))
- [#1090](https://github.com/wycats/handlebars.js/pull/1090) - grammar fixes in 4.0.0 release notes ([@nikolas](https://github.com/nikolas))

Compatibility notes:

- `each` iteration with `undefined` values has been restored to the 3.0 behaviors. Helper calls with undefined context values will now execute against an arbitrary empty object to avoid executing against global object in non-strict mode.
- `]` can now be included in `[]` wrapped identifiers by escaping with `\`. Any `[]` identifiers that include `\` will now have to properly escape these values.

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.2...v4.0.3)

## v4.0.2 - September 4th, 2015

- [#1089](https://github.com/wycats/handlebars.js/issues/1089) - "Failover content" not working in multiple levels of inline partials ([@michaellopez](https://github.com/michaellopez))

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.1...v4.0.2)

## v4.0.1 - September 2nd, 2015

- Fix failure when using decorators in partials - 05b82a2

[Commits](https://github.com/wycats/handlebars.js/compare/v4.0.0...v4.0.1)

## v4.0.0 - September 1st, 2015

- [#1082](https://github.com/wycats/handlebars.js/pull/1082) - Decorators and Inline Partials ([@kpdecker](https://github.com/kpdecker))
- [#1076](https://github.com/wycats/handlebars.js/pull/1076) - Implement partial blocks ([@kpdecker](https://github.com/kpdecker))
- [#1087](https://github.com/wycats/handlebars.js/pull/1087) - Fix #each when last object entry has empty key ([@denniskuczynski](https://github.com/denniskuczynski))
- [#1084](https://github.com/wycats/handlebars.js/pull/1084) - Bump uglify version to fix vulnerability ([@John-Steidley](https://github.com/John-Steidley))
- [#1068](https://github.com/wycats/handlebars.js/pull/1068) - Fix typo ([@0xack13](https://github.com/0xack13))
- [#1060](https://github.com/wycats/handlebars.js/pull/1060) - #1056 Fixed grammar for nested raw blocks ([@ericbn](https://github.com/ericbn))
- [#1052](https://github.com/wycats/handlebars.js/pull/1052) - Updated year in License ([@maqnouch](https://github.com/maqnouch))
- [#1037](https://github.com/wycats/handlebars.js/pull/1037) - Fix minor typos in README ([@tomxtobin](https://github.com/tomxtobin))
- [#1032](https://github.com/wycats/handlebars.js/issues/1032) - Is it possible to render a partial without the parent scope? ([@aputinski](https://github.com/aputinski))
- [#1019](https://github.com/wycats/handlebars.js/pull/1019) - Fixes typo in tests ([@aymerick](https://github.com/aymerick))
- [#1016](https://github.com/wycats/handlebars.js/issues/1016) - Version mis-match ([@mayankdedhia](https://github.com/mayankdedhia))
- [#1023](https://github.com/wycats/handlebars.js/issues/1023) - is it possible for nested custom helpers to communicate between each other?
- [#893](https://github.com/wycats/handlebars.js/issues/893) - [Proposal] Section blocks.
- [#792](https://github.com/wycats/handlebars.js/issues/792) - feature request: inline partial definitions
- [#583](https://github.com/wycats/handlebars.js/issues/583) - Parent path continues to drill down depth with multiple conditionals
- [#404](https://github.com/wycats/handlebars.js/issues/404) - Add named child helpers that can be referenced by block helpers
- Escape = in HTML content - [83b8e84](https://github.com/wycats/handlebars.js/commit/83b8e84)
- Drop AST constructors in favor of JSON - [95d84ba](https://github.com/wycats/handlebars.js/commit/95d84ba)
- Pass container rather than exec as context - [9a2d1d6](https://github.com/wycats/handlebars.js/commit/9a2d1d6)
- Add ignoreStandalone compiler option - [ea3a5a1](https://github.com/wycats/handlebars.js/commit/ea3a5a1)
- Ignore empty when iterating on sparse arrays - [06d515a](https://github.com/wycats/handlebars.js/commit/06d515a)
- Add support for string and stdin precompilation - [0de8dac](https://github.com/wycats/handlebars.js/commit/0de8dac)
- Simplify object assignment generation logic - [77e6bfc](https://github.com/wycats/handlebars.js/commit/77e6bfc)
- Bulletproof AST.helpers.helperExpression - [93b0760](https://github.com/wycats/handlebars.js/commit/93b0760)
- Always return string responses - [8e868ab](https://github.com/wycats/handlebars.js/commit/8e868ab)
- Pass undefined fields to helpers in strict mode - [5d4b8da](https://github.com/wycats/handlebars.js/commit/5d4b8da)
- Avoid depth creation when context remains the same - [279e038](https://github.com/wycats/handlebars.js/commit/279e038)
- Improve logging API - [9a49d35](https://github.com/wycats/handlebars.js/commit/9a49d35)
- Fix with operator in no @data mode - [231a8d7](https://github.com/wycats/handlebars.js/commit/231a8d7)
- Allow empty key name in each iteration - [1bb640b](https://github.com/wycats/handlebars.js/commit/1bb640b)
- Add with block parameter support - [2a85106](https://github.com/wycats/handlebars.js/commit/2a85106)
- Fix escaping of non-javascript identifiers - [410141c](https://github.com/wycats/handlebars.js/commit/410141c)
- Fix location information for programs - [93faffa](https://github.com/wycats/handlebars.js/commit/93faffa)

Compatibility notes:

- Depthed paths are now conditionally pushed on to the stack. If the helper uses the same context, then a new stack is not created. This leads to behavior that better matches expectations for helpers like `if` that do not seem to alter the context. Any instances of `../` in templates will need to be checked for the correct behavior under 4.0.0. In general templates will either reduce the number of `../` instances or leave them as is. See [#1028](https://github.com/wycats/handlebars.js/issues/1028).
- The `=` character is now HTML escaped. This closes a potential exploit case when using unquoted attributes, i.e. `<div foo={{bar}}>`. In general it's recommended that attributes always be quoted when their values are generated from a mustache to avoid any potential exploit surfaces.
- AST constructors have been dropped in favor of plain old javascript objects
- The runtime version has been increased. Precompiled templates will need to use runtime of at least 4.0.0.

[Commits](https://github.com/wycats/handlebars.js/compare/v3.0.3...v4.0.0)

## v3.0.3 - April 28th, 2015

- [#1004](https://github.com/wycats/handlebars.js/issues/1004) - Latest version breaks with RequireJS (global is undefined) ([@boskee](https://github.com/boskee))

[Commits](https://github.com/wycats/handlebars.js/compare/v3.0.2...v3.0.3)

## v3.0.2 - April 20th, 2015

- [#998](https://github.com/wycats/handlebars.js/pull/998) - Add full support for es6 ([@kpdecker](https://github.com/kpdecker))
- [#994](https://github.com/wycats/handlebars.js/issues/994) - Access Handlebars.Visitor in browser ([@tamlyn](https://github.com/tamlyn))
- [#990](https://github.com/wycats/handlebars.js/issues/990) - Allow passing null/undefined literals subexpressions ([@blimmer](https://github.com/blimmer))
- [#989](https://github.com/wycats/handlebars.js/issues/989) - Source-map error with requirejs ([@SteppeEagle](https://github.com/SteppeEagle))
- [#967](https://github.com/wycats/handlebars.js/issues/967) - can't access "this" property ([@75lb](https://github.com/75lb))
- Use captureStackTrace for error handler - a009a97
- Ignore branches tested without coverage monitoring - 37a664b

[Commits](https://github.com/wycats/handlebars.js/compare/v3.0.1...v3.0.2)

## v3.0.1 - March 24th, 2015

- [#984](https://github.com/wycats/handlebars.js/pull/984) - Adding documentation for passing arguments into partials ([@johneke](https://github.com/johneke))
- [#973](https://github.com/wycats/handlebars.js/issues/973) - version 3 is slower than version 2 ([@elover](https://github.com/elover))
- [#966](https://github.com/wycats/handlebars.js/issues/966) - "handlebars --version" does not work with v3.0.0 ([@abloomston](https://github.com/abloomston))
- [#964](https://github.com/wycats/handlebars.js/pull/964) - default is a reserved word ([@grassick](https://github.com/grassick))
- [#962](https://github.com/wycats/handlebars.js/pull/962) - Add dashbars' link on README. ([@pismute](https://github.com/pismute))

[Commits](https://github.com/wycats/handlebars.js/compare/v3.0.0...v3.0.1)

## v3.0.0 - February 10th, 2015

- [#941](https://github.com/wycats/handlebars.js/pull/941) - Add support for dynamic partial names ([@kpdecker](https://github.com/kpdecker))
- [#940](https://github.com/wycats/handlebars.js/pull/940) - Add missing reserved words so compiler knows to use array syntax: ([@mattflaschen](https://github.com/mattflaschen))
- [#938](https://github.com/wycats/handlebars.js/pull/938) - Fix example using #with helper ([@diwo](https://github.com/diwo))
- [#930](https://github.com/wycats/handlebars.js/pull/930) - Add parent tracking and mutation to AST visitors ([@kpdecker](https://github.com/kpdecker))
- [#926](https://github.com/wycats/handlebars.js/issues/926) - Depthed lookups fail when program duplicator runs ([@kpdecker](https://github.com/kpdecker))
- [#918](https://github.com/wycats/handlebars.js/pull/918) - Add instructions for 'spec/mustache' to CONTRIBUTING.md, fix a few typos ([@oneeman](https://github.com/oneeman))
- [#915](https://github.com/wycats/handlebars.js/pull/915) - Ast update ([@kpdecker](https://github.com/kpdecker))
- [#910](https://github.com/wycats/handlebars.js/issues/910) - Different behavior of {{@last}} when {{#each}} in {{#each}} ([@zordius](https://github.com/zordius))
- [#907](https://github.com/wycats/handlebars.js/issues/907) - Implement named helper variable references ([@kpdecker](https://github.com/kpdecker))
- [#906](https://github.com/wycats/handlebars.js/pull/906) - Add parser support for block params ([@mmun](https://github.com/mmun))
- [#903](https://github.com/wycats/handlebars.js/issues/903) - Only provide aliases for multiple use calls ([@kpdecker](https://github.com/kpdecker))
- [#902](https://github.com/wycats/handlebars.js/pull/902) - Generate Source Maps ([@kpdecker](https://github.com/kpdecker))
- [#901](https://github.com/wycats/handlebars.js/issues/901) - Still escapes with noEscape enabled on isolated Handlebars environment ([@zedknight](https://github.com/zedknight))
- [#896](https://github.com/wycats/handlebars.js/pull/896) - Simplify BlockNode by removing intermediate MustacheNode ([@mmun](https://github.com/mmun))
- [#892](https://github.com/wycats/handlebars.js/pull/892) - Implement parser for else chaining of helpers ([@kpdecker](https://github.com/kpdecker))
- [#889](https://github.com/wycats/handlebars.js/issues/889) - Consider extensible parser API ([@kpdecker](https://github.com/kpdecker))
- [#887](https://github.com/wycats/handlebars.js/issues/887) - Handlebars.noConflict() option? ([@bradvogel](https://github.com/bradvogel))
- [#886](https://github.com/wycats/handlebars.js/issues/886) - Add SafeString to context (or use duck-typing) ([@dominicbarnes](https://github.com/dominicbarnes))
- [#870](https://github.com/wycats/handlebars.js/pull/870) - Registering undefined partial throws exception. ([@max-b](https://github.com/max-b))
- [#866](https://github.com/wycats/handlebars.js/issues/866) - comments don't respect whitespace control ([@75lb](https://github.com/75lb))
- [#863](https://github.com/wycats/handlebars.js/pull/863) - + jsDelivr CDN info ([@tomByrer](https://github.com/tomByrer))
- [#858](https://github.com/wycats/handlebars.js/issues/858) - Disable new default auto-indent at included partials ([@majodev](https://github.com/majodev))
- [#856](https://github.com/wycats/handlebars.js/pull/856) - jspm compatibility ([@MajorBreakfast](https://github.com/MajorBreakfast))
- [#805](https://github.com/wycats/handlebars.js/issues/805) - Request: "strict" lookups ([@nzakas](https://github.com/nzakas))

- Export the default object for handlebars/runtime - 5594416
- Lookup partials when undefined - 617dd57

Compatibility notes:

- Runtime breaking changes. Must match 3.x runtime and precompiler.
- The AST has been upgraded to a public API.
  - There are a number of changes to this, but the format is now documented in docs/compiler-api.md
  - The Visitor API has been expanded to support mutation and provide a base implementation
- The `JavaScriptCompiler` APIs have been formalized and documented. As part of the sourcemap handling these should be updated to return arrays for concatenation.
- `JavaScriptCompiler.namespace` has been removed as it was unused.
- `SafeString` is now duck typed on `toHTML`

New Features:

- noConflict
- Source Maps
- Block Params
- Strict Mode
- @last and other each changes
- Chained else blocks
- @data methods can now have helper parameters passed to them
- Dynamic partials

[Commits](https://github.com/wycats/handlebars.js/compare/v2.0.0...v3.0.0)

## v2.0.0 - September 1st, 2014

- Update jsfiddle to 2.0.0-beta.1 - 0670f65
- Add contrib note regarding handlebarsjs.com docs - 4d17e3c
- Play nice with gemspec version numbers - 64d5481

[Commits](https://github.com/wycats/handlebars.js/compare/v2.0.0-beta.1...v2.0.0)

## v2.0.0-beta.1 - August 26th, 2014

- [#787](https://github.com/wycats/handlebars.js/pull/787) - Remove whitespace surrounding standalone statements ([@kpdecker](https://github.com/kpdecker))
- [#827](https://github.com/wycats/handlebars.js/issues/827) - Render false literal as “false” ([@scoot557](https://github.com/scoot557))
- [#767](https://github.com/wycats/handlebars.js/issues/767) - Subexpressions bug with hash and context ([@evensoul](https://github.com/evensoul))
- Changes to 0/undefined handling
  - [#731](https://github.com/wycats/handlebars.js/pull/731) - Strange behavior for {{#foo}} {{bar}} {{/foo}} when foo is 0 ([@kpdecker](https://github.com/kpdecker))
  - [#820](https://github.com/wycats/handlebars.js/issues/820) - strange behavior for {{foo.bar}} when foo is 0 or null or false ([@zordius](https://github.com/zordius))
  - [#837](https://github.com/wycats/handlebars.js/issues/837) - Strange input for custom helper ( foo.bar == false when foo is undefined ) ([@zordius](https://github.com/zordius))
- [#819](https://github.com/wycats/handlebars.js/pull/819) - Implement recursive field lookup ([@kpdecker](https://github.com/kpdecker))
- [#764](https://github.com/wycats/handlebars.js/issues/764) - This reference not working for helpers ([@kpdecker](https://github.com/kpdecker))
- [#773](https://github.com/wycats/handlebars.js/issues/773) - Implicit parameters in {{#each}} introduces a peculiarity in helpers calling convention ([@Bertrand](https://github.com/Bertrand))
- [#783](https://github.com/wycats/handlebars.js/issues/783) - helperMissing and consistency for different expression types ([@ErisDS](https://github.com/ErisDS))
- [#795](https://github.com/wycats/handlebars.js/pull/795) - Turn the precompile script into a wrapper around a module. ([@jwietelmann](https://github.com/jwietelmann))
- [#823](https://github.com/wycats/handlebars.js/pull/823) - Support inverse sections on the with helper ([@dan-manges](https://github.com/dan-manges))
- [#834](https://github.com/wycats/handlebars.js/pull/834) - Refactor blocks, programs and inverses ([@mmun](https://github.com/mmun))
- [#852](https://github.com/wycats/handlebars.js/issues/852) - {{foo~}} space control behavior is different from older version ([@zordius](https://github.com/zordius))
- [#835](https://github.com/wycats/handlebars.js/issues/835) - Templates overwritten if file is loaded twice

- Expose escapeExpression on the root object - 980c38c
- Remove nested function eval in blockHelperMissing - 6f22ec1
- Fix compiler program de-duping - 9e3f824

Compatibility notes:

- The default build now outputs a generic UMD wrapper. This should be transparent change but may cause issues in some environments.
- Runtime compatibility breaks in both directions. Ensure that both compiler and client are upgraded to 2.0.0-beta.1 or higher at the same time.
  - `programWithDepth` has been removed an instead an array of context values is passed to fields needing depth lookups.
- `false` values are now printed to output rather than silently dropped
- Lines containing only block statements and whitespace are now removed. This matches the Mustache spec but may cause issues with code that expects whitespace to exist but would not otherwise.
- Partials that are standalone will now indent their rendered content
- `AST.ProgramNode`'s signature has changed.
- Numerious methods/features removed from pseudo-API classes
  - `JavaScriptCompiler.register`
  - `JavaScriptCompiler.replaceStack` no longer supports non-inline replace
  - `Compiler.disassemble`
  - `DECLARE` opcode
  - `strip` opcode
  - `lookup` opcode
  - Content nodes may have their `string` values mutated over time. `original` field provides the unmodified value.
- Removed unused `Handlebars.registerHelper` `inverse` parameter
- `each` helper requires iterator parameter

[Commits](https://github.com/wycats/handlebars.js/compare/v2.0.0-alpha.4...v2.0.0-beta.1)

## v2.0.0-alpha.4 - May 19th, 2014

- Expose setup wrappers for compiled templates - 3638874

[Commits](https://github.com/wycats/handlebars.js/compare/v2.0.0-alpha.3...v2.0.0-alpha.4)

## v2.0.0-alpha.3 - May 19th, 2014

- [#797](https://github.com/wycats/handlebars.js/pull/797) - Pass full helper ID to helperMissing when options are provided ([@tomdale](https://github.com/tomdale))
- [#793](https://github.com/wycats/handlebars.js/pull/793) - Ensure isHelper is coerced to a boolean ([@mmun](https://github.com/mmun))
- Refactor template init logic - 085e5e1

[Commits](https://github.com/wycats/handlebars.js/compare/v2.0.0-alpha.2...v2.0.0-alpha.3)

## v2.0.0-alpha.2 - March 6th, 2014

- [#756](https://github.com/wycats/handlebars.js/pull/756) - fix bug in IE<=8 (no Array::map), closes #751 ([@jenseng](https://github.com/jenseng))
- [#749](https://github.com/wycats/handlebars.js/pull/749) - properly handle multiple subexpressions in the same hash, fixes #748 ([@jenseng](https://github.com/jenseng))
- [#743](https://github.com/wycats/handlebars.js/issues/743) - subexpression confusion/problem? ([@waynedpj](https://github.com/waynedpj))
- [#746](https://github.com/wycats/handlebars.js/issues/746) - [CLI] support `handlebars --version` ([@apfelbox](https://github.com/apfelbox))
- [#747](https://github.com/wycats/handlebars.js/pull/747) - updated grunt-saucelabs, failing tests revealed ([@Jonahss](https://github.com/Jonahss))
- Make JSON a requirement for the compiler. - 058c0fb
- Temporarily kill the AWS publish CI step - 8347ee2

Compatibility notes:

- A JSON polyfill is required to run the compiler under IE8 and below. It's recommended that the precompiler be used in lieu of running the compiler on these legacy environments.

[Commits](https://github.com/wycats/handlebars.js/compare/v2.0.0-alpha.1...v2.0.0-alpha.2)

## v2.0.0-alpha.1 - February 10th, 2014

- [#182](https://github.com/wycats/handlebars.js/pull/182) - Allow passing hash parameters to partials ([@kpdecker](https://github.com/kpdecker))
- [#392](https://github.com/wycats/handlebars.js/pull/392) - Access to root context in partials and helpers ([@kpdecker](https://github.com/kpdecker))
- [#472](https://github.com/wycats/handlebars.js/issues/472) - Helpers cannot have decimal parameters ([@kayleg](https://github.com/kayleg))
- [#569](https://github.com/wycats/handlebars.js/pull/569) - Unable to lookup array values using @index ([@kpdecker](https://github.com/kpdecker))
- [#491](https://github.com/wycats/handlebars.js/pull/491) - For nested helpers: get the @ variables of the outer helper from the inner one ([@kpdecker](https://github.com/kpdecker))
- [#669](https://github.com/wycats/handlebars.js/issues/669) - Ability to unregister a helper ([@dbachrach](https://github.com/dbachrach))
- [#730](https://github.com/wycats/handlebars.js/pull/730) - Raw block helpers ([@kpdecker](https://github.com/kpdecker))
- [#634](https://github.com/wycats/handlebars.js/pull/634) - It would be great to have the helper name passed to `blockHelperMissing` ([@kpdecker](https://github.com/kpdecker))
- [#729](https://github.com/wycats/handlebars.js/pull/729) - Convert template spec to object literal ([@kpdecker](https://github.com/kpdecker))

- [#658](https://github.com/wycats/handlebars.js/issues/658) - Depthed helpers do not work after an upgrade from 1.0.0 ([@xibxor](https://github.com/xibxor))
- [#671](https://github.com/wycats/handlebars.js/issues/671) - Crashes on no-parameter {{#each}} ([@stepancheg](https://github.com/stepancheg))
- [#689](https://github.com/wycats/handlebars.js/issues/689) - broken template precompilation ([@AAS](https://github.com/AAS))
- [#698](https://github.com/wycats/handlebars.js/pull/698) - Fix parser generation under windows ([@osiris43](https://github.com/osiris43))
- [#699](https://github.com/wycats/handlebars.js/issues/699) - @DATA not compiles to invalid JS in stringParams mode ([@kpdecker](https://github.com/kpdecker))
- [#705](https://github.com/wycats/handlebars.js/issues/705) - 1.3.0 can not be wrapped in an IIFE ([@craigteegarden](https://github.com/craigteegarden))
- [#706](https://github.com/wycats/handlebars.js/pull/706) - README: Use with helper instead of relying on blockHelperMissing ([@scottgonzalez](https://github.com/scottgonzalez))

- [#700](https://github.com/wycats/handlebars.js/pull/700) - Remove redundant conditions ([@blakeembrey](https://github.com/blakeembrey))
- [#704](https://github.com/wycats/handlebars.js/pull/704) - JavaScript Compiler Cleanup ([@blakeembrey](https://github.com/blakeembrey))

Compatibility notes:

- `helperMissing` helper no longer has the indexed name argument. Helper name is now available via `options.name`.
- Precompiler output has changed, which breaks compatibility with prior versions of the runtime and precompiled output.
- `JavaScriptCompiler.compilerInfo` now returns generic objects rather than javascript source.
- AST changes
  - INTEGER -> NUMBER
  - Additional PartialNode hash parameter
  - New RawBlockNode type
- Data frames now have a `_parent` field. This is internal but is enumerable for performance/compatibility reasons.

[Commits](https://github.com/wycats/handlebars.js/compare/v1.3.0...v2.0.0-alpha.1)

## v1.3.0 - January 1st, 2014

- [#690](https://github.com/wycats/handlebars.js/pull/690) - Added support for subexpressions ([@machty](https://github.com/machty))
- [#696](https://github.com/wycats/handlebars.js/pull/696) - Fix for reserved keyword "default" ([@nateirwin](https://github.com/nateirwin))
- [#692](https://github.com/wycats/handlebars.js/pull/692) - add line numbers to nodes when parsing ([@fivetanley](https://github.com/fivetanley))
- [#695](https://github.com/wycats/handlebars.js/pull/695) - Pull options out from param setup to allow easier extension ([@blakeembrey](https://github.com/blakeembrey))
- [#694](https://github.com/wycats/handlebars.js/pull/694) - Make the environment reusable ([@blakeembrey](https://github.com/blakeembrey))
- [#636](https://github.com/wycats/handlebars.js/issues/636) - Print line and column of errors ([@sgronblo](https://github.com/sgronblo))
- Use literal for data lookup - c1a93d3
- Add stack handling sanity checks - cd885bf
- Fix stack id "leak" on replaceStack - ddfe457
- Fix incorrect stack pop when replacing literals - f4d337d

[Commits](https://github.com/wycats/handlebars.js/compare/v1.2.1...v1.3.0)

## v1.2.1 - December 26th, 2013

- [#684](https://github.com/wycats/handlebars.js/pull/684) - Allow any number of trailing characters for valid JavaScript variable ([@blakeembrey](https://github.com/blakeembrey))
- [#686](https://github.com/wycats/handlebars.js/pull/686) - Falsy AMD module names in version 1.2.0 ([@kpdecker](https://github.com/kpdecker))

[Commits](https://github.com/wycats/handlebars.js/compare/v1.2.0...v1.2.1)

## v1.2.0 - December 23rd, 2013

- [#675](https://github.com/wycats/handlebars.js/issues/675) - Cannot compile empty template for partial ([@erwinw](https://github.com/erwinw))
- [#677](https://github.com/wycats/handlebars.js/issues/677) - Triple brace statements fail under IE ([@hamzaCM](https://github.com/hamzaCM))
- [#655](https://github.com/wycats/handlebars.js/issues/655) - Loading Handlebars using bower ([@niki4810](https://github.com/niki4810))
- [#657](https://github.com/wycats/handlebars.js/pull/657) - Fixes issue where cli compiles non handlebars templates ([@chrishoage](https://github.com/chrishoage))
- [#681](https://github.com/wycats/handlebars.js/pull/681) - Adds in-browser testing and Saucelabs CI ([@kpdecker](https://github.com/kpdecker))
- [#661](https://github.com/wycats/handlebars.js/pull/661) - Add @first and @index to #each object iteration ([@cgp](https://github.com/cgp))
- [#650](https://github.com/wycats/handlebars.js/pull/650) - Handlebars is MIT-licensed ([@thomasboyt](https://github.com/thomasboyt))
- [#641](https://github.com/wycats/handlebars.js/pull/641) - Document ember testing process ([@kpdecker](https://github.com/kpdecker))
- [#662](https://github.com/wycats/handlebars.js/issues/662) - handlebars-source 1.1.2 is missing from RubyGems.
- [#656](https://github.com/wycats/handlebars.js/issues/656) - Expose COMPILER_REVISION checks as a hook ([@machty](https://github.com/machty))
- [#668](https://github.com/wycats/handlebars.js/issues/668) - Consider publishing handlebars-runtime as a separate module on npm ([@dlmanning](https://github.com/dlmanning))
- [#679](https://github.com/wycats/handlebars.js/issues/679) - Unable to override invokePartial ([@mattbrailsford](https://github.com/mattbrailsford))
- [#646](https://github.com/wycats/handlebars.js/pull/646) - Fix "\\{{" immediately following "\{{" ([@dmarcotte](https://github.com/dmarcotte))
- Allow extend to work with non-prototyped objects - eb53f2e
- Add JavascriptCompiler public API tests - 1a751b2
- Add AST test coverage for more complex paths - ddea5be
- Fix handling of boolean escape in MustacheNode - b4968bb

Compatibility notes:

- `@index` and `@first` are now supported for `each` iteration on objects
- `Handlebars.VM.checkRevision` and `Handlebars.JavaScriptCompiler.prototype.compilerInfo` now available to modify the version checking behavior.
- Browserify users may link to the runtime library via `require('handlebars/runtime')`

[Commits](https://github.com/wycats/handlebars.js/compare/v1.1.2...v1.2.0)

## v1.1.2 - November 5th, 2013

- [#645](https://github.com/wycats/handlebars.js/issues/645) - 1.1.1 fails under IE8 ([@kpdecker](https://github.com/kpdecker))
- [#644](https://github.com/wycats/handlebars.js/issues/644) - Using precompiled templates (AMD mode) with handlebars.runtime 1.1.1 ([@fddima](https://github.com/fddima))

- Add simple binary utility tests - 96a45a4
- Fix empty string compilation - eea708a

[Commits](https://github.com/wycats/handlebars.js/compare/v1.1.1...v1.1.2)

## v1.1.1 - November 4th, 2013

- [#642](https://github.com/wycats/handlebars.js/issues/642) - handlebars 1.1.0 are broken with nodejs

- Fix release notes link - 17ba258

[Commits](https://github.com/wycats/handlebars.js/compare/v1.1.0...v1.1.1)

## v1.1.0 - November 3rd, 2013

- [#628](https://github.com/wycats/handlebars.js/pull/628) - Convert code to ES6 modules ([@kpdecker](https://github.com/kpdecker))
- [#336](https://github.com/wycats/handlebars.js/pull/336) - Add whitespace control syntax ([@kpdecker](https://github.com/kpdecker))
- [#535](https://github.com/wycats/handlebars.js/pull/535) - Fix for probable JIT error under Safari ([@sorentwo](https://github.com/sorentwo))
- [#483](https://github.com/wycats/handlebars.js/issues/483) - Add first and last @ vars to each helper ([@denniskuczynski](https://github.com/denniskuczynski))
- [#557](https://github.com/wycats/handlebars.js/pull/557) - `\\{{foo}}` escaping only works in some situations ([@dmarcotte](https://github.com/dmarcotte))
- [#552](https://github.com/wycats/handlebars.js/pull/552) - Added BOM removal flag. ([@blessenm](https://github.com/blessenm))
- [#543](https://github.com/wycats/handlebars.js/pull/543) - publish passing master builds to s3 ([@fivetanley](https://github.com/fivetanley))

- [#608](https://github.com/wycats/handlebars.js/issues/608) - Add `includeZero` flag to `if` conditional
- [#498](https://github.com/wycats/handlebars.js/issues/498) - `Handlebars.compile` fails on empty string although a single blank works fine
- [#599](https://github.com/wycats/handlebars.js/issues/599) - lambda helpers only receive options if used with arguments
- [#592](https://github.com/wycats/handlebars.js/issues/592) - Optimize array and subprogram performance
- [#571](https://github.com/wycats/handlebars.js/issues/571) - uglify upgrade breaks compatibility with older versions of node
- [#587](https://github.com/wycats/handlebars.js/issues/587) - Partial inside partial breaks?

Compatibility notes:

- The project now includes separate artifacts for AMD, CommonJS, and global objects.
  - AMD: Users may load the bundled `handlebars.amd.js` or `handlebars.runtime.amd.js` files or load individual modules directly. AMD users should also note that the handlebars object is exposed via the `default` field on the imported object. This [gist](https://gist.github.com/wycats/7417be0dc361a69d5916) provides some discussion of possible compatibility shims.
  - CommonJS/Node: Node loading occurs as normal via `require`
  - Globals: The `handlebars.js` and `handlebars.runtime.js` files should behave in the same manner as the v1.0.12 / 1.0.0 release.
- Build artifacts have been removed from the repository. [npm][npm], [components/handlebars.js][components], [cdnjs][cdnjs], or the [builds page][builds-page] should now be used as the source of built artifacts.
- Context-stored helpers are now always passed the `options` hash. Previously no-argument helpers did not have this argument.

[Commits](https://github.com/wycats/handlebars.js/compare/v1.0.12...v1.1.0)

## v1.0.12 / 1.0.0 - May 31 2013

- [#515](https://github.com/wycats/handlebars.js/issues/515) - Add node require extensions support ([@jjclark1982](https://github.com/jjclark1982))
- [#517](https://github.com/wycats/handlebars.js/issues/517) - Fix amd precompiler output with directories ([@blessenm](https://github.com/blessenm))
- [#433](https://github.com/wycats/handlebars.js/issues/433) - Add support for unicode ids
- [#469](https://github.com/wycats/handlebars.js/issues/469) - Add support for `?` in ids
- [#534](https://github.com/wycats/handlebars.js/issues/534) - Protect from object prototype modifications
- [#519](https://github.com/wycats/handlebars.js/issues/519) - Fix partials with . name ([@jamesgorrie](https://github.com/jamesgorrie))
- [#519](https://github.com/wycats/handlebars.js/issues/519) - Allow ID or strings in partial names
- [#437](https://github.com/wycats/handlebars.js/issues/437) - Require matching brace counts in escaped expressions
- Merge passed partials and helpers with global namespace values
- Add support for complex ids in @data references
- Docs updates

Compatibility notes:

- The parser is now stricter on `{{{`, requiring that the end token be `}}}`. Templates that do not
  follow this convention should add the additional brace value.
- Code that relies on global the namespace being muted when custom helpers or partials are passed will need to explicitly pass an `undefined` value for any helpers that should not be available.
- The compiler version has changed. Precompiled templates with 1.0.12 or higher must use the 1.0.0 or higher runtime.

[Commits](https://github.com/wycats/handlebars.js/compare/v1.0.11...v1.0.12)

## v1.0.11 / 1.0.0-rc4 - May 13 2013

- [#458](https://github.com/wycats/handlebars.js/issues/458) - Fix `./foo` syntax ([@jpfiset](https://github.com/jpfiset))
- [#460](https://github.com/wycats/handlebars.js/issues/460) - Allow `:` in unescaped identifiers ([@jpfiset](https://github.com/jpfiset))
- [#471](https://github.com/wycats/handlebars.js/issues/471) - Create release notes (These!)
- [#456](https://github.com/wycats/handlebars.js/issues/456) - Allow escaping of `\\`
- [#211](https://github.com/wycats/handlebars.js/issues/211) - Fix exception in `escapeExpression`
- [#375](https://github.com/wycats/handlebars.js/issues/375) - Escape unicode newlines
- [#461](https://github.com/wycats/handlebars.js/issues/461) - Do not fail when compiling `""`
- [#302](https://github.com/wycats/handlebars.js/issues/302) - Fix sanity check in knownHelpersOnly mode
- [#369](https://github.com/wycats/handlebars.js/issues/369) - Allow registration of multiple helpers and partial by passing definition object
- Add bower package declaration ([@DevinClark](https://github.com/DevinClark))
- Add NuSpec package declaration ([@MikeMayer](https://github.com/MikeMayer))
- Handle empty context in `with` ([@thejohnfreeman](https://github.com/thejohnfreeman))
- Support custom template extensions in CLI ([@matteoagosti](https://github.com/matteoagosti))
- Fix Rhino support ([@broady](https://github.com/broady))
- Include contexts in string mode ([@leshill](https://github.com/leshill))
- Return precompiled scripts when compiling to AMD ([@JamesMaroney](https://github.com/JamesMaroney))
- Docs updates ([@iangreenleaf](https://github.com/iangreenleaf), [@gilesbowkett](https://github.com/gilesbowkett), [@utkarsh2012](https://github.com/utkarsh2012))
- Fix `toString` handling under IE and browserify ([@tommydudebreaux](https://github.com/tommydudebreaux))
- Add program metadata

[Commits](https://github.com/wycats/handlebars.js/compare/v1.0.10...v1.0.11)

## v1.0.10 - Node - Feb 27 2013

- [#428](https://github.com/wycats/handlebars.js/issues/428) - Fix incorrect rendering of nested programs
- Fix exception message ([@tricknotes](https://github.com/tricknotes))
- Added negative number literal support
- Concert library to single IIFE
- Add handlebars-source gemspec ([@machty](https://github.com/machty))

[Commits](https://github.com/wycats/handlebars.js/compare/v1.0.9...v1.0.10)

## v1.0.9 - Node - Feb 15 2013

- Added `Handlebars.create` API in node module for sandboxed instances ([@tommydudebreaux](https://github.com/tommydudebreaux))

[Commits](https://github.com/wycats/handlebars.js/compare/1.0.0-rc.3...v1.0.9)

## 1.0.0-rc3 - Browser - Feb 14 2013

- Prevent use of `this` or `..` in illogical place ([@leshill](https://github.com/leshill))
- Allow AST passing for `parse`/`compile`/`precompile` ([@machty](https://github.com/machty))
- Optimize generated output by inlining statements where possible
- Check compiler version when evaluating templates
- Package browser dist in npm package

[Commits](https://github.com/wycats/handlebars.js/compare/v1.0.8...1.0.0-rc.3)

## Prior Versions

When upgrading from the Handlebars 0.9 series, be aware that the
signature for passing custom helpers or partials to templates has
changed.

Instead of:

```js
template(context, helpers, partials, [data]);
```

Use:

```js
template(context, { helpers: helpers, partials: partials, data: data });
```

[builds-page]: http://builds.handlebarsjs.com.s3.amazonaws.com/index.html
[cdnjs]: http://cdnjs.com/libraries/handlebars.js/
[components]: https://github.com/components/handlebars.js
[npm]: https://npmjs.org/package/handlebars
