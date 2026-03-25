# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). (Format adopted after v3.0.0.)

<!-- markdownlint-disable MD024 -->

## [4.1.1] (2020-02-02)

### Fixed

* TypeScript definition for `.action()` should include Promise for async ([#1157])

## [4.1.0] (2020-01-06)

### Added

* two routines to change how option values are handled, and eliminate name clashes with command properties ([#933] [#1102])
  * see storeOptionsAsProperties and passCommandToAction in README
* `.parseAsync` to use instead of `.parse` if supply async action handlers ([#806] [#1118])

### Fixed

* Remove trailing blanks from wrapped help text ([#1096])

### Changed

* update dependencies
* extend security coverage for Commander 2.x to 2020-02-03
* improvements to README
* improvements to TypeScript definition documentation
* move old versions out of main CHANGELOG
* removed explicit use of `ts-node` in tests

## [4.0.1] (2019-11-12)

### Fixed

* display help when requested, even if there are missing required options ([#1091])

## [4.0.0] (2019-11-02)

### Added

* automatically wrap and indent help descriptions for options and commands ([#1051])
* `.exitOverride()` allows override of calls to `process.exit` for additional error handling and to keep program running ([#1040])
* support for declaring required options with `.requiredOptions()` ([#1071])
* GitHub Actions support ([#1027])
* translation links in README

### Changed

* dev: switch tests from Sinon+Should to Jest with major rewrite of tests ([#1035])
* call default subcommand even when there are unknown options ([#1047])
* *Breaking* Commander is only officially supported on Node 8 and above, and requires Node 6 ([#1053])

### Fixed

* *Breaking* keep command object out of program.args when action handler called ([#1048])
  * also, action handler now passed array of unknown arguments
* complain about unknown options when program argument supplied and action handler ([#1049])
  * this changes parameters to `command:*` event to include unknown arguments
* removed deprecated `customFds` option from call to `child_process.spawn` ([#1052])
* rework TypeScript declarations to bring all types into imported namespace ([#1081])

### Migration Tips

#### Testing for no arguments

If you were previously using code like:

```js
if (!program.args.length) ...
```

a partial replacement is:

```js
if (program.rawArgs.length < 3) ...
```

## [4.0.0-1] Prerelease (2019-10-08)

(Released in 4.0.0)

## [4.0.0-0] Prerelease (2019-10-01)

(Released in 4.0.0)

## [2.20.1] (2019-09-29)

### Fixed

* Improve tracking of executable subcommands.

### Changed

* update development dependencies

## [3.0.2] (2019-09-27)

### Fixed

* Improve tracking of executable subcommands.

### Changed

* update development dependencies

## [3.0.1] (2019-08-30)

### Added

* .name and .usage to README ([#1010])
* Table of Contents to README ([#1010])
* TypeScript definition for `executableFile` in CommandOptions ([#1028])

### Changed

* consistently use `const` rather than `var` in README ([#1026])

### Fixed

* help for sub commands with custom executableFile ([#1018])

## [3.0.0] / 2019-08-08

* Add option to specify executable file name ([#999])
  * e.g. `.command('clone', 'clone description', { executableFile: 'myClone' })`
* Change docs for `.command` to contrast action handler vs git-style executable. ([#938] [#990])
* **Breaking** Change TypeScript to use overloaded function for `.command`. ([#938] [#990])
* Change to use straight quotes around strings in error messages (like 'this' instead of `this') ([#915])
* Add TypeScript "reference types" for node ([#974])
* Add support for hyphen as an option argument in subcommands ([#697])
* Add support for a short option flag and its value to be concatenated for action handler subcommands ([#599])
  * e.g. `-p 80` can also be supplied as `-p80`
* Add executable arguments to spawn in win32, for git-style executables ([#611])
  * e.g. `node --harmony myCommand.js clone`
* Add parent command as prefix of subcommand in help ([#980])
* Add optional custom description to `.version` ([#963])
  * e.g. `program.version('0.0.1', '-v, --vers', 'output the current version')`
* Add `.helpOption(flags, description)` routine to customise help flags and description ([#963])
  * e.g. `.helpOption('-e, --HELP', 'read more information')`
* Fix behavior of --no-* options ([#795])
  * can now define both `--foo` and `--no-foo`
  * **Breaking** custom event listeners: `--no-foo` on cli now emits `option:no-foo` (previously `option:foo`)
  * **Breaking** default value: defining `--no-foo` after defining `--foo` leaves the default value unchanged (previously set it to false)
  * allow boolean default value, such as from environment ([#987])
* Increment inspector port for spawned subcommands ([#991])
  * e.g. `node --inspect myCommand.js clone`

### Migration Tips

The custom event for a negated option like `--no-foo` is `option:no-foo` (previously `option:foo`).

```js
program
  .option('--no-foo')
  .on('option:no-foo', () => {
    console.log('removing foo');
  });
```

When using TypeScript, adding a command does not allow an explicit `undefined` for an unwanted executable description (e.g
for a command with an action handler).

```js
program
  .command('action1', undefined, { noHelp: true }) // No longer valid
  .command('action2', { noHelp: true }) // Correct
```

## 3.0.0-0 Prerelease / 2019-07-28

(Released as 3.0.0)

## 2.20.0 / 2019-04-02

* fix: resolve symbolic links completely when hunting for subcommands (#935)
* Update index.d.ts (#930)
* Update Readme.md (#924)
* Remove --save option as it isn't required anymore (#918)
* Add link to the license file (#900)
* Added example of receiving args from options (#858)
* Added missing semicolon (#882)
* Add extension to .eslintrc (#876)

## 2.19.0 / 2018-10-02

* Removed newline after Options and Commands headers (#864)
* Bugfix - Error output (#862)
* Fix to change default value to string (#856)

## 2.18.0 / 2018-09-07

* Standardize help output (#853)
* chmod 644 travis.yml (#851)
* add support for execute typescript subcommand via ts-node (#849)

## 2.17.1 / 2018-08-07

* Fix bug in command emit (#844)

## 2.17.0 / 2018-08-03

* fixed newline output after help information (#833)
* Fix to emit the action even without command (#778)
* npm update (#823)

## 2.16.0 / 2018-06-29

* Remove Makefile and `test/run` (#821)
* Make 'npm test' run on Windows (#820)
* Add badge to display install size (#807)
* chore: cache node_modules (#814)
* chore: remove Node.js 4 (EOL), add Node.js 10 (#813)
* fixed typo in readme (#812)
* Fix types (#804)
* Update eslint to resolve vulnerabilities in lodash (#799)
* updated readme with custom event listeners. (#791)
* fix tests (#794)

## 2.15.0 / 2018-03-07

* Update downloads badge to point to graph of downloads over time instead of duplicating link to npm
* Arguments description

## 2.14.1 / 2018-02-07

* Fix typing of help function

## 2.14.0 / 2018-02-05

* only register the option:version event once
* Fixes issue #727: Passing empty string for option on command is set to undefined
* enable eqeqeq rule
* resolves #754 add linter configuration to project
* resolves #560 respect custom name for version option
* document how to override the version flag
* document using options per command

## 2.13.0 / 2018-01-09

* Do not print default for --no-
* remove trailing spaces in command help
* Update CI's Node.js to LTS and latest version
* typedefs: Command and Option types added to commander namespace

## 2.12.2 / 2017-11-28

* fix: typings are not shipped

## 2.12.1 / 2017-11-23

* Move @types/node to dev dependency

## 2.12.0 / 2017-11-22

* add attributeName() method to Option objects
* Documentation updated for options with --no prefix
* typings: `outputHelp` takes a string as the first parameter
* typings: use overloads
* feat(typings): update to match js api
* Print default value in option help
* Fix translation error
* Fail when using same command and alias (#491)
* feat(typings): add help callback
* fix bug when description is add after command with options (#662)
* Format js code
* Rename History.md to CHANGELOG.md (#668)
* feat(typings): add typings to support TypeScript (#646)
* use current node

## 2.11.0 / 2017-07-03

* Fix help section order and padding (#652)
* feature: support for signals to subcommands (#632)
* Fixed #37, --help should not display first (#447)
* Fix translation errors. (#570)
* Add package-lock.json
* Remove engines
* Upgrade package version
* Prefix events to prevent conflicts between commands and options (#494)
* Removing dependency on graceful-readlink
* Support setting name in #name function and make it chainable
* Add .vscode directory to .gitignore (Visual Studio Code metadata)
* Updated link to ruby commander in readme files

## 2.10.0 / 2017-06-19

* Update .travis.yml. drop support for older node.js versions.
* Fix require arguments in README.md
* On SemVer you do not start from 0.0.1
* Add missing semi colon in readme
* Add save param to npm install
* node v6 travis test
* Update Readme_zh-CN.md
* Allow literal '--' to be passed-through as an argument
* Test subcommand alias help
* link build badge to master branch
* Support the alias of Git style sub-command
* added keyword commander for better search result on npm
* Fix Sub-Subcommands
* test node.js stable
* Fixes TypeError when a command has an option called `--description`
* Update README.md to make it beginner friendly and elaborate on the difference between angled and square brackets.
* Add chinese Readme file

## 2.9.0 / 2015-10-13

* Add option `isDefault` to set default subcommand #415 @Qix-
* Add callback to allow filtering or post-processing of help text #434 @djulien
* Fix `undefined` text in help information close #414 #416 @zhiyelee

## 2.8.1 / 2015-04-22

* Back out `support multiline description` Close #396 #397

## 2.8.0 / 2015-04-07

* Add `process.execArg` support, execution args like `--harmony` will be passed to sub-commands #387 @DigitalIO @zhiyelee
* Fix bug in Git-style sub-commands #372 @zhiyelee
* Allow commands to be hidden from help #383 @tonylukasavage
* When git-style sub-commands are in use, yet none are called, display help #382 @claylo
* Add ability to specify arguments syntax for top-level command #258 @rrthomas
* Support multiline descriptions #208 @zxqfox

## 2.7.1 / 2015-03-11

* Revert #347 (fix collisions when option and first arg have same name) which causes a bug in #367.

## 2.7.0 / 2015-03-09

* Fix git-style bug when installed globally. Close #335 #349 @zhiyelee
* Fix collisions when option and first arg have same name. Close #346 #347 @tonylukasavage
* Add support for camelCase on `opts()`. Close #353  @nkzawa
* Add node.js 0.12 and io.js to travis.yml
* Allow RegEx options. #337 @palanik
* Fixes exit code when sub-command failing.  Close #260 #332 @pirelenito
* git-style `bin` files in $PATH make sense. Close #196 #327  @zhiyelee

## 2.6.0 / 2014-12-30

* added `Command#allowUnknownOption` method. Close #138 #318 @doozr @zhiyelee
* Add application description to the help msg. Close #112 @dalssoft

## 2.5.1 / 2014-12-15

* fixed two bugs incurred by variadic arguments. Close #291 @Quentin01 #302 @zhiyelee

## 2.5.0 / 2014-10-24

* add support for variadic arguments. Closes #277 @whitlockjc

## 2.4.0 / 2014-10-17

* fixed a bug on executing the coercion function of subcommands option. Closes #270
* added `Command.prototype.name` to retrieve command name. Closes #264 #266 @tonylukasavage
* added `Command.prototype.opts` to retrieve all the options as a simple object of key-value pairs. Closes #262 @tonylukasavage
* fixed a bug on subcommand name. Closes #248 @jonathandelgado
* fixed function normalize doesn’t honor option terminator. Closes #216 @abbr

## 2.3.0 / 2014-07-16

* add command alias'. Closes PR #210
* fix: Typos. Closes #99
* fix: Unused fs module. Closes #217

## 2.2.0 / 2014-03-29

* add passing of previous option value
* fix: support subcommands on windows. Closes #142
* Now the defaultValue passed as the second argument of the coercion function.

## 2.1.0 / 2013-11-21

* add: allow cflag style option params, unit test, fixes #174

## 2.0.0 / 2013-07-18

* remove input methods (.prompt, .confirm, etc)

## Older versions

* [1.x](./changelogs/CHANGELOG-1.md)
* [0.x](./changelogs/CHANGELOG-0.md)

[#599]: https://github.com/tj/commander.js/issues/599
[#611]: https://github.com/tj/commander.js/issues/611
[#697]: https://github.com/tj/commander.js/issues/697
[#795]: https://github.com/tj/commander.js/issues/795
[#806]: https://github.com/tj/commander.js/issues/806
[#915]: https://github.com/tj/commander.js/issues/915
[#938]: https://github.com/tj/commander.js/issues/938
[#963]: https://github.com/tj/commander.js/issues/963
[#974]: https://github.com/tj/commander.js/issues/974
[#980]: https://github.com/tj/commander.js/issues/980
[#987]: https://github.com/tj/commander.js/issues/987
[#990]: https://github.com/tj/commander.js/issues/990
[#991]: https://github.com/tj/commander.js/issues/991
[#993]: https://github.com/tj/commander.js/issues/993
[#999]: https://github.com/tj/commander.js/issues/999
[#1010]: https://github.com/tj/commander.js/pull/1010
[#1018]: https://github.com/tj/commander.js/pull/1018
[#1026]: https://github.com/tj/commander.js/pull/1026
[#1027]: https://github.com/tj/commander.js/pull/1027
[#1028]: https://github.com/tj/commander.js/pull/1028
[#1035]: https://github.com/tj/commander.js/pull/1035
[#1040]: https://github.com/tj/commander.js/pull/1040
[#1047]: https://github.com/tj/commander.js/pull/1047
[#1048]: https://github.com/tj/commander.js/pull/1048
[#1049]: https://github.com/tj/commander.js/pull/1049
[#1051]: https://github.com/tj/commander.js/pull/1051
[#1052]: https://github.com/tj/commander.js/pull/1052
[#1053]: https://github.com/tj/commander.js/pull/1053
[#1071]: https://github.com/tj/commander.js/pull/1071
[#1081]: https://github.com/tj/commander.js/pull/1081
[#1091]: https://github.com/tj/commander.js/pull/1091
[#1096]: https://github.com/tj/commander.js/pull/1096
[#1102]: https://github.com/tj/commander.js/pull/1102
[#1118]: https://github.com/tj/commander.js/pull/1118
[#1157]: https://github.com/tj/commander.js/pull/1157

[Unreleased]: https://github.com/tj/commander.js/compare/master...develop
[4.1.1]: https://github.com/tj/commander.js/compare/v4.0.0..v4.1.1
[4.1.0]: https://github.com/tj/commander.js/compare/v4.0.1..v4.1.0
[4.0.1]: https://github.com/tj/commander.js/compare/v4.0.0..v4.0.1
[4.0.0]: https://github.com/tj/commander.js/compare/v3.0.2..v4.0.0
[4.0.0-1]: https://github.com/tj/commander.js/compare/v4.0.0-0..v4.0.0-1
[4.0.0-0]: https://github.com/tj/commander.js/compare/v3.0.2...v4.0.0-0
[3.0.2]: https://github.com/tj/commander.js/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/tj/commander.js/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/tj/commander.js/compare/v2.20.1...v3.0.0
[2.20.1]: https://github.com/tj/commander.js/compare/v2.20.0...v2.20.1
