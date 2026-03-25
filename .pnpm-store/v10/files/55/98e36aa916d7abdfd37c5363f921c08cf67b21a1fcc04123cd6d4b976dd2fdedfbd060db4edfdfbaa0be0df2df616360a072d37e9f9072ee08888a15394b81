# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html). (Format adopted after v3.0.0.)

<!-- markdownlint-disable MD024 -->
<!-- markdownlint-disable MD004 -->

## [6.2.1] (2020-12-13)

### Fixed

- some tests failed if directory path included a space ([1390])

## [6.2.0] (2020-10-25)

### Added

- added 'tsx' file extension for stand-alone executable subcommands ([#1368])
- documented second parameter to `.description()` to describe command arguments ([#1353])
- documentation of special cases with options taking varying numbers of option-arguments ([#1332])
- documentation for terminology ([#1361])
  
### Fixed

- add missing TypeScript definition for `.addHelpCommand()' ([#1375])
- removed blank line after "Arguments:" in help, to match "Options:" and "Commands:" ([#1360])

### Changed

- update dependencies

## [6.1.0] (2020-08-28)

### Added

- include URL to relevant section of README for error for potential conflict between Command properties and option values ([#1306])
- `.combineFlagAndOptionalValue(false)` to ease upgrade path from older versions of Commander ([#1326])
- allow disabling the built-in help option using `.helpOption(false)` ([#1325])
- allow just some arguments in `argumentDescription` to `.description()` ([#1323])

### Changed

- tidy async test and remove lint override ([#1312])

### Fixed

- executable subcommand launching when script path not known ([#1322])

## [6.0.0] (2020-07-21)

### Added

- add support for variadic options ([#1250])
- allow options to be added with just a short flag ([#1256])
  - *Breaking* the option property has same case as flag. e.g. flag `-n` accessed as `opts().n` (previously uppercase)
- *Breaking* throw an error if there might be a clash between option name and a Command property, with advice on how to resolve ([#1275])

### Fixed

- Options which contain -no- in the middle of the option flag should not be treated as negatable. ([#1301])

## [6.0.0-0] (2020-06-20)

(Released in 6.0.0)

## [5.1.0] (2020-04-25)

### Added

- support for multiple command aliases, the first of which is shown in the auto-generated help ([#531], [#1236])
- configuration support in `addCommand()` for `hidden` and `isDefault` ([#1232])

### Fixed

- omit masked help flags from the displayed help ([#645], [#1247])
- remove old short help flag when change help flags using `helpOption` ([#1248])

### Changed

- remove use of `arguments` to improve auto-generated help in editors ([#1235])
- rename `.command()` configuration `noHelp` to `hidden` (but not remove old support) ([#1232])
- improvements to documentation
- update dependencies
- update tested versions of node
- eliminate lint errors in TypeScript ([#1208])

## [5.0.0] (2020-03-14)

### Added

* support for nested commands with action-handlers ([#1] [#764] [#1149])
* `.addCommand()` for adding a separately configured command ([#764] [#1149])
* allow a non-executable to be set as the default command ([#742] [#1149])
* implicit help command when there are subcommands (previously only if executables) ([#1149])
* customise implicit help command with `.addHelpCommand()` ([#1149])
* display error message for unknown subcommand, by default ([#432] [#1088] [#1149])
* display help for missing subcommand, by default ([#1088] [#1149])
* combined short options as single argument may include boolean flags and value flag and value (e.g. `-a -b -p 80` can be written as `-abp80`) ([#1145])
* `.parseOption()` includes short flag and long flag expansions ([#1145])
* `.helpInformation()` returns help text as a string, previously a private routine ([#1169])
* `.parse()` implicitly uses `process.argv` if arguments not specified ([#1172])
* optionally specify where `.parse()` arguments "from", if not following node conventions ([#512] [#1172])
* suggest help option along with unknown command error ([#1179])
* TypeScript definition for `commands` property of `Command` ([#1184])
* export `program` property ([#1195])
* `createCommand` factory method to simplify subclassing ([#1191])

### Fixed

* preserve argument order in subcommands ([#508] [#962] [#1138])
* do not emit `command:*` for executable subcommands ([#809] [#1149])
* action handler called whether or not there are non-option arguments ([#1062] [#1149])
* combining option short flag and value in single argument now works for subcommands ([#1145])
* only add implicit help command when it will not conflict with other uses of argument ([#1153] [#1149])
* implicit help command works with command aliases ([#948] [#1149])
* options are validated whether or not there is an action handler ([#1149])

### Changed

* *Breaking* `.args` contains command arguments with just recognised options removed ([#1032] [#1138])
* *Breaking* display error if required argument for command is missing ([#995] [#1149])
* tighten TypeScript definition of custom option processing function passed to `.option()` ([#1119])
* *Breaking* `.allowUnknownOption()` ([#802] [#1138])
  * unknown options included in arguments passed to command action handler
  * unknown options included in `.args`
* only recognised option short flags and long flags are expanded (e.g. `-ab` or `--foo=bar`) ([#1145])
* *Breaking* `.parseOptions()` ([#1138])
  * `args` in returned result renamed `operands` and does not include anything after first unknown option
  * `unknown` in returned result has arguments after first unknown option including operands, not just options and values
* *Breaking* `.on('command:*', callback)` and other command events passed (changed) results from `.parseOptions`, i.e. operands and unknown  ([#1138])
* refactor Option from prototype to class ([#1133])
* refactor Command from prototype to class ([#1159])
* changes to error handling ([#1165])
  * throw for author error, not just display message
  * preflight for variadic error
  * add tips to missing subcommand executable
* TypeScript fluent return types changed to be more subclass friendly, return `this` rather than `Command` ([#1180])
* `.parseAsync` returns `Promise<this>` to be consistent with `.parse()` ([#1180])
* update dependencies

### Removed

* removed EventEmitter from TypeScript definition for Command, eliminating implicit peer dependency on `@types/node` ([#1146])
* removed private function `normalize` (the functionality has been integrated into `parseOptions`) ([#1145])
* `parseExpectedArgs` is now private ([#1149])

### Migration Tips

If you use `.on('command:*')` or more complicated tests to detect an unrecognised subcommand, you may be able to delete the code and rely on the default behaviour.

If you use `program.args` or more complicated tests to detect a missing subcommand, you may be able to delete the code and rely on the default behaviour.

If you use `.command('*')` to add a default command, you may be be able to switch to `isDefault:true` with a named command.

If you want to continue combining short options with optional values as though they were boolean flags, set `combineFlagAndOptionalValue(false)`
to expand `-fb` to `-f -b` rather than `-f b`.

## [5.0.0-4] (2020-03-03)

(Released in 5.0.0)

## [5.0.0-3] (2020-02-20)

(Released in 5.0.0)

## [5.0.0-2] (2020-02-10)

(Released in 5.0.0)

## [5.0.0-1] (2020-02-08)

(Released in 5.0.0)

## [5.0.0-0] (2020-02-02)

(Released in 5.0.0)

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

## Older versions

* [3.x](./changelogs/CHANGELOG-3.md)
* [2.x](./changelogs/CHANGELOG-2.md)
* [1.x](./changelogs/CHANGELOG-1.md)
* [0.x](./changelogs/CHANGELOG-0.md)

[#1]: https://github.com/tj/commander.js/issues/1
[#432]: https://github.com/tj/commander.js/issues/432
[#508]: https://github.com/tj/commander.js/issues/508
[#512]: https://github.com/tj/commander.js/issues/512
[#531]: https://github.com/tj/commander.js/issues/531
[#645]: https://github.com/tj/commander.js/issues/645
[#742]: https://github.com/tj/commander.js/issues/742
[#764]: https://github.com/tj/commander.js/issues/764
[#802]: https://github.com/tj/commander.js/issues/802
[#806]: https://github.com/tj/commander.js/issues/806
[#809]: https://github.com/tj/commander.js/issues/809
[#948]: https://github.com/tj/commander.js/issues/948
[#962]: https://github.com/tj/commander.js/issues/962
[#995]: https://github.com/tj/commander.js/issues/995
[#1027]: https://github.com/tj/commander.js/pull/1027
[#1032]: https://github.com/tj/commander.js/issues/1032
[#1035]: https://github.com/tj/commander.js/pull/1035
[#1040]: https://github.com/tj/commander.js/pull/1040
[#1047]: https://github.com/tj/commander.js/pull/1047
[#1048]: https://github.com/tj/commander.js/pull/1048
[#1049]: https://github.com/tj/commander.js/pull/1049
[#1051]: https://github.com/tj/commander.js/pull/1051
[#1052]: https://github.com/tj/commander.js/pull/1052
[#1053]: https://github.com/tj/commander.js/pull/1053
[#1062]: https://github.com/tj/commander.js/pull/1062
[#1071]: https://github.com/tj/commander.js/pull/1071
[#1081]: https://github.com/tj/commander.js/pull/1081
[#1088]: https://github.com/tj/commander.js/issues/1088
[#1091]: https://github.com/tj/commander.js/pull/1091
[#1096]: https://github.com/tj/commander.js/pull/1096
[#1102]: https://github.com/tj/commander.js/pull/1102
[#1118]: https://github.com/tj/commander.js/pull/1118
[#1119]: https://github.com/tj/commander.js/pull/1119
[#1133]: https://github.com/tj/commander.js/pull/1133
[#1138]: https://github.com/tj/commander.js/pull/1138
[#1145]: https://github.com/tj/commander.js/pull/1145
[#1146]: https://github.com/tj/commander.js/pull/1146
[#1149]: https://github.com/tj/commander.js/pull/1149
[#1153]: https://github.com/tj/commander.js/issues/1153
[#1157]: https://github.com/tj/commander.js/pull/1157
[#1159]: https://github.com/tj/commander.js/pull/1159
[#1165]: https://github.com/tj/commander.js/pull/1165
[#1169]: https://github.com/tj/commander.js/pull/1169
[#1172]: https://github.com/tj/commander.js/pull/1172
[#1179]: https://github.com/tj/commander.js/pull/1179
[#1180]: https://github.com/tj/commander.js/pull/1180
[#1184]: https://github.com/tj/commander.js/pull/1184
[#1191]: https://github.com/tj/commander.js/pull/1191
[#1195]: https://github.com/tj/commander.js/pull/1195
[#1208]: https://github.com/tj/commander.js/pull/1208
[#1232]: https://github.com/tj/commander.js/pull/1232
[#1235]: https://github.com/tj/commander.js/pull/1235
[#1236]: https://github.com/tj/commander.js/pull/1236
[#1247]: https://github.com/tj/commander.js/pull/1247
[#1248]: https://github.com/tj/commander.js/pull/1248
[#1250]: https://github.com/tj/commander.js/pull/1250
[#1256]: https://github.com/tj/commander.js/pull/1256
[#1275]: https://github.com/tj/commander.js/pull/1275
[#1301]: https://github.com/tj/commander.js/issues/1301
[#1306]: https://github.com/tj/commander.js/pull/1306
[#1312]: https://github.com/tj/commander.js/pull/1312
[#1322]: https://github.com/tj/commander.js/pull/1322
[#1323]: https://github.com/tj/commander.js/pull/1323
[#1325]: https://github.com/tj/commander.js/pull/1325
[#1326]: https://github.com/tj/commander.js/pull/1326
[#1332]: https://github.com/tj/commander.js/pull/1332
[#1353]: https://github.com/tj/commander.js/pull/1353
[#1360]: https://github.com/tj/commander.js/pull/1360
[#1361]: https://github.com/tj/commander.js/pull/1361
[#1368]: https://github.com/tj/commander.js/pull/1368
[#1375]: https://github.com/tj/commander.js/pull/1375
[#1390]: https://github.com/tj/commander.js/pull/1390

[Unreleased]: https://github.com/tj/commander.js/compare/master...develop
[6.2.1]: https://github.com/tj/commander.js/compare/v6.2.0..v6.2.1
[6.2.0]: https://github.com/tj/commander.js/compare/v6.1.0..v6.2.0
[6.1.0]: https://github.com/tj/commander.js/compare/v6.0.0..v6.1.0
[6.0.0]: https://github.com/tj/commander.js/compare/v5.1.0..v6.0.0
[6.0.0-0]: https://github.com/tj/commander.js/compare/v5.1.0..v6.0.0-0
[5.1.0]: https://github.com/tj/commander.js/compare/v5.0.0..v5.1.0
[5.0.0]: https://github.com/tj/commander.js/compare/v4.1.1..v5.0.0
[5.0.0-4]: https://github.com/tj/commander.js/compare/v5.0.0-3..v5.0.0-4
[5.0.0-3]: https://github.com/tj/commander.js/compare/v5.0.0-2..v5.0.0-3
[5.0.0-2]: https://github.com/tj/commander.js/compare/v5.0.0-1..v5.0.0-2
[5.0.0-1]: https://github.com/tj/commander.js/compare/v5.0.0-0..v5.0.0-1
[5.0.0-0]: https://github.com/tj/commander.js/compare/v4.1.1..v5.0.0-0
[4.1.1]: https://github.com/tj/commander.js/compare/v4.1.0..v4.1.1
[4.1.0]: https://github.com/tj/commander.js/compare/v4.0.1..v4.1.0
[4.0.1]: https://github.com/tj/commander.js/compare/v4.0.0..v4.0.1
[4.0.0]: https://github.com/tj/commander.js/compare/v3.0.2..v4.0.0
[4.0.0-1]: https://github.com/tj/commander.js/compare/v4.0.0-0..v4.0.0-1
[4.0.0-0]: https://github.com/tj/commander.js/compare/v3.0.2...v4.0.0-0
