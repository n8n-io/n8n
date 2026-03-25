# Change Log - @rushstack/ts-command-line

This log was last generated on Tue, 11 Mar 2025 02:12:33 GMT and should not be manually modified.

## 4.23.6
Tue, 11 Mar 2025 02:12:33 GMT

_Version update only_

## 4.23.5
Wed, 12 Feb 2025 01:10:52 GMT

_Version update only_

## 4.23.4
Thu, 30 Jan 2025 01:11:42 GMT

_Version update only_

## 4.23.3
Thu, 09 Jan 2025 01:10:10 GMT

_Version update only_

## 4.23.2
Sat, 14 Dec 2024 01:11:07 GMT

_Version update only_

## 4.23.1
Fri, 22 Nov 2024 01:10:43 GMT

_Version update only_

## 4.23.0
Thu, 17 Oct 2024 08:35:06 GMT

### Minor changes

- Expand the `alternatives` and `completions` options of `CommandLineChoiceParameter` and `CommandLineChoiceListParameter` to allow readonly arrays and sets.
- (BREAKING API CHANGE) Change the type of the `alternatives` property of `CommandLineChoiceParameter` and `CommandLineChoiceParameter` from an array to a `ReadonlySet`.

## 4.22.8
Fri, 13 Sep 2024 00:11:43 GMT

_Version update only_

## 4.22.7
Tue, 10 Sep 2024 20:08:11 GMT

_Version update only_

## 4.22.6
Wed, 21 Aug 2024 05:43:04 GMT

_Version update only_

## 4.22.5
Mon, 12 Aug 2024 22:16:04 GMT

_Version update only_

## 4.22.4
Fri, 02 Aug 2024 17:26:42 GMT

### Patches

- Remove @internal so that subclasses can call _getArgumentParser

## 4.22.3
Sat, 27 Jul 2024 00:10:27 GMT

### Patches

- Include CHANGELOG.md in published releases again

## 4.22.2
Wed, 17 Jul 2024 06:55:10 GMT

_Version update only_

## 4.22.1
Tue, 16 Jul 2024 00:36:21 GMT

_Version update only_

## 4.22.0
Thu, 30 May 2024 00:13:05 GMT

### Minor changes

- Eliminate a const enum from the public API.

## 4.21.5
Wed, 29 May 2024 02:03:51 GMT

_Version update only_

## 4.21.4
Tue, 28 May 2024 15:10:09 GMT

_Version update only_

## 4.21.3
Tue, 28 May 2024 00:09:47 GMT

_Version update only_

## 4.21.2
Sat, 25 May 2024 04:54:08 GMT

_Version update only_

## 4.21.1
Thu, 23 May 2024 02:26:56 GMT

_Version update only_

## 4.21.0
Thu, 16 May 2024 15:10:22 GMT

### Minor changes

- Mark `onDefineParameters` and `onDefineUnscopedParameters` as deprecated and update README accordingly because defining parameters causes issues when the compiler targets >=es2022.

## 4.20.1
Wed, 15 May 2024 23:42:58 GMT

_Version update only_

## 4.20.0
Wed, 15 May 2024 06:04:17 GMT

### Minor changes

- Rename `CommandLineParser.execute` to `CommandLineParser.executeAsync` and `CommandLineParser.executeWithoutErrorHandling` to `CommandLineParser.executeWithoutErrorHandlingAsync`. The old functions are marked as `@deprecated`.

## 4.19.5
Fri, 10 May 2024 05:33:34 GMT

_Version update only_

## 4.19.4
Wed, 08 May 2024 22:23:50 GMT

### Patches

- Fix an issue where tab completions did not suggest parameter values.

## 4.19.3
Mon, 06 May 2024 15:11:05 GMT

_Version update only_

## 4.19.2
Wed, 10 Apr 2024 15:10:09 GMT

_Version update only_

## 4.19.1
Sun, 03 Mar 2024 20:58:12 GMT

### Patches

- Fix an issue where the `allowNonStandardEnvironmentVariableNames` parameter option had no effect.

## 4.19.0
Sat, 02 Mar 2024 02:22:23 GMT

### Minor changes

- Use more specific types for command line parameters' `kind` properties.
- Allow parameters that may be backed by an environment variable to be marked as `required`.
- Update the return type of `defineChoiceParameter`, `defineIntegerParameter`, and `defineStringParameter` respectively when the `defaultValue` option is provided to return `IRequiredCommandLineChoiceParameter`, `IRequiredCommandLineIntegerParameter`, and `IRequiredCommandLineStringParameter` respectively, as the value will definitely be defined in these cases.

### Patches

- Include a missing `readonly` modifier on the `value` properties of `IRequiredCommandLineChoiceParameter`, `IRequiredCommandLineIntegerParameter`, and `IRequiredCommandLineStringParameter`.

## 4.18.1
Fri, 01 Mar 2024 01:10:08 GMT

### Patches

- Add an "allowNonStandardEnvironmentVariableNames" option to remove naming restrictions on parameter environment variables

## 4.18.0
Wed, 28 Feb 2024 16:09:27 GMT

### Minor changes

- Allow choice parameters alternatives to be typed.
- Update the return type of `defineChoiceParameter`, `defineIntegerParameter`, and `defineStringParameter` respectively when the `{ required: true }` option is set to a new type (`IRequiredCommandLineChoiceParameter`, `IRequiredCommandLineIntegerParameter`, and `IRequiredCommandLineStringParameter` respectively) with a required `value` property.

## 4.17.4
Sat, 24 Feb 2024 23:02:51 GMT

_Version update only_

## 4.17.3
Wed, 21 Feb 2024 21:45:28 GMT

### Patches

- Replace the dependency on the `colors` package with `Colorize` from `@rushstack/terminal`.

## 4.17.2
Sat, 17 Feb 2024 06:24:35 GMT

### Patches

- Fix broken link to API documentation

## 4.17.1
Wed, 01 Nov 2023 23:11:35 GMT

### Patches

- Fix line endings in published package.

## 4.17.0
Mon, 30 Oct 2023 23:36:37 GMT

### Minor changes

- Consider parent tool and action parameters when determining ambiguous abbreviations. For example, if a CLI tool `mytool` has a parameter `--myparam` and an action `myaction`, then `myaction` would not accept a parameter named `--myparam` (i.e. - `mytool --myparam myaction` is valid, `mytool myaction --myparam` is not). Additionally, any parameter that can be abbreviated to `--myparam` must be uniquely provided (i.e. - `--myparam-2` can only be abbreviated to `--myparam-`, since any shorter abbreviation would be ambiguous with the original `--myparam` on the tool).

## 4.16.1
Tue, 26 Sep 2023 09:30:33 GMT

### Patches

- Update type-only imports to include the type modifier.

## 4.16.0
Fri, 15 Sep 2023 00:36:58 GMT

### Minor changes

- Update @types/node from 14 to 18

## 4.15.2
Tue, 08 Aug 2023 07:10:40 GMT

_Version update only_

## 4.15.1
Thu, 15 Jun 2023 00:21:01 GMT

_Version update only_

## 4.15.0
Tue, 13 Jun 2023 01:49:01 GMT

### Minor changes

- Add support for handling ambiguous parameters when conflicting parameters are provided but they provide a non-conflicting alternative (e.g. parameters with the same short-name but different long-names, scoped parameters with the same long-name but different scopes). When using an ambiguous parameter on the CLI, an error message describing the ambiguous parameter usage will appear.

## 4.14.0
Wed, 07 Jun 2023 22:45:16 GMT

### Minor changes

- Add AliasCommandLineAction, a CommandLineAction that can be used to redirect commands with optional default arguments to existing commands.

## 4.13.3
Mon, 22 May 2023 06:34:33 GMT

_Version update only_

## 4.13.2
Fri, 10 Feb 2023 01:18:50 GMT

_Version update only_

## 4.13.1
Tue, 08 Nov 2022 01:20:55 GMT

### Patches

- Make ScopedCommandLineAction.onDefineUnscopedParameters optional to match CommandLineAciton.onDefineParameters

## 4.13.0
Mon, 17 Oct 2022 22:14:21 GMT

### Minor changes

- Make the onDefineParameters function optional for `CommandLineAction`s and `CommandLineParser`s that either don't have parameters or that define their parameters in their constructor.

## 4.12.5
Mon, 10 Oct 2022 15:23:44 GMT

_Version update only_

## 4.12.4
Thu, 29 Sep 2022 07:13:06 GMT

_Version update only_

## 4.12.3
Thu, 15 Sep 2022 00:18:51 GMT

_Version update only_

## 4.12.2
Wed, 03 Aug 2022 18:40:35 GMT

_Version update only_

## 4.12.1
Tue, 28 Jun 2022 00:23:32 GMT

_Version update only_

## 4.12.0
Thu, 23 Jun 2022 22:14:24 GMT

### Minor changes

- Add parameter scopes. Parameter scopes allow for behind-the-scenes conflict resolution between parameters with the same long name. For example, when provided scope "my-scope", a parameter can be referenced on the CLI as "--my-parameter" or as "--my-scope:my-parameter". In the case that multiple parameters are registered with the same long name but different scopes, the parameters can only be referenced by their scoped long names, eg. "--my-scope:my-parameter" and "--my-other-scope:my-parameter".

## 4.11.1
Fri, 17 Jun 2022 00:16:18 GMT

_Version update only_

## 4.11.0
Tue, 10 May 2022 01:20:43 GMT

### Minor changes

- Add ScopedCommandLineAction class, which allows for the definition of actions that have dynamic arguments whose definition depends on a provided scope. See https://github.com/microsoft/rushstack/pull/3364

## 4.10.10
Sat, 23 Apr 2022 02:13:07 GMT

_Version update only_

## 4.10.9
Fri, 15 Apr 2022 00:12:36 GMT

_Version update only_

## 4.10.8
Sat, 09 Apr 2022 02:24:27 GMT

### Patches

- Rename the "master" branch to "main".

## 4.10.7
Tue, 15 Mar 2022 19:15:53 GMT

_Version update only_

## 4.10.6
Mon, 27 Dec 2021 16:10:40 GMT

_Version update only_

## 4.10.5
Mon, 06 Dec 2021 16:08:32 GMT

_Version update only_

## 4.10.4
Fri, 05 Nov 2021 15:09:18 GMT

_Version update only_

## 4.10.3
Wed, 27 Oct 2021 00:08:15 GMT

### Patches

- Update the package.json repository field to include the directory property.

## 4.10.2
Wed, 13 Oct 2021 15:09:54 GMT

_Version update only_

## 4.10.1
Thu, 07 Oct 2021 07:13:35 GMT

_Version update only_

## 4.10.0
Mon, 04 Oct 2021 15:10:18 GMT

### Minor changes

- Add safety check parametersProcessed to CommandLineParameterProvider

## 4.9.1
Thu, 23 Sep 2021 00:10:41 GMT

### Patches

- Upgrade the `@types/node` dependency to version to version 12.

## 4.9.0
Fri, 20 Aug 2021 15:08:10 GMT

### Minor changes

- Add getParameterStringMap to CommandLineParameterProvider, to easily query parameter usage for telemetry

## 4.8.1
Mon, 12 Jul 2021 23:08:26 GMT

_Version update only_

## 4.8.0
Thu, 01 Jul 2021 15:08:27 GMT

### Minor changes

- Add ChoiceList and IntegerList parameter types

## 4.7.10
Mon, 12 Apr 2021 15:10:28 GMT

_Version update only_

## 4.7.9
Tue, 06 Apr 2021 15:14:22 GMT

_Version update only_

## 4.7.8
Thu, 10 Dec 2020 23:25:49 GMT

_Version update only_

## 4.7.7
Wed, 11 Nov 2020 01:08:59 GMT

_Version update only_

## 4.7.6
Fri, 30 Oct 2020 06:38:39 GMT

_Version update only_

## 4.7.5
Fri, 30 Oct 2020 00:10:14 GMT

_Version update only_

## 4.7.4
Wed, 28 Oct 2020 01:18:03 GMT

_Version update only_

## 4.7.3
Tue, 06 Oct 2020 00:24:06 GMT

_Version update only_

## 4.7.2
Mon, 05 Oct 2020 22:36:57 GMT

_Version update only_

## 4.7.1
Wed, 30 Sep 2020 18:39:17 GMT

### Patches

- Update to build with @rushstack/heft-node-rig

## 4.7.0
Wed, 30 Sep 2020 06:53:53 GMT

### Minor changes

- Upgrade compiler; the API now requires TypeScript 3.9 or newer

### Patches

- Update README.md

## 4.6.10
Tue, 22 Sep 2020 05:45:57 GMT

_Version update only_

## 4.6.9
Tue, 22 Sep 2020 01:45:31 GMT

_Version update only_

## 4.6.8
Tue, 22 Sep 2020 00:08:53 GMT

_Version update only_

## 4.6.7
Sat, 19 Sep 2020 04:37:27 GMT

_Version update only_

## 4.6.6
Sat, 19 Sep 2020 03:33:07 GMT

_Version update only_

## 4.6.5
Fri, 18 Sep 2020 22:57:24 GMT

_Version update only_

## 4.6.4
Thu, 27 Aug 2020 11:27:06 GMT

_Version update only_

## 4.6.3
Mon, 24 Aug 2020 07:35:20 GMT

_Version update only_

## 4.6.2
Sat, 22 Aug 2020 05:55:43 GMT

_Version update only_

## 4.6.1
Fri, 21 Aug 2020 01:21:17 GMT

### Patches

- Fix an issue where usage of a parameter specified undocumentedSynonyms yielded invalid data.

## 4.6.0
Thu, 20 Aug 2020 15:13:52 GMT

### Minor changes

- Add a feature for specifying "undocumented synonyms" for parameters.

## 4.5.0
Tue, 18 Aug 2020 23:59:42 GMT

### Minor changes

- Add support for shell tab completion.

## 4.4.8
Mon, 17 Aug 2020 04:53:23 GMT

_Version update only_

## 4.4.7
Wed, 12 Aug 2020 00:10:05 GMT

### Patches

- Updated project to build with Heft

## 4.4.6
Fri, 03 Jul 2020 05:46:41 GMT

### Patches

- Improve formatting of errors reported by CommandLineParser.execute()

## 4.4.5
Thu, 25 Jun 2020 06:43:35 GMT

_Version update only_

## 4.4.4
Wed, 24 Jun 2020 09:50:48 GMT

_Version update only_

## 4.4.3
Wed, 24 Jun 2020 09:04:28 GMT

_Version update only_

## 4.4.2
Mon, 01 Jun 2020 08:34:17 GMT

### Patches

- Fix a typo in the supplementary notes for parameters with environment variable mappings

## 4.4.1
Wed, 27 May 2020 05:15:10 GMT

_Version update only_

## 4.4.0
Fri, 15 May 2020 08:10:59 GMT

### Minor changes

- Add a new feature defineCommandLineRemainder() which allows additional unvalidated CLI arguments, e.g. to pass along to another tool
- Add the ability for an environment variable to specify multiple values for CommandLineStringListParameter, encoded as a JSON array
- Fix some bugs that prevented a CommandLineParser from being defined without any actions

### Patches

- Fix a bug with environmentVariable mapping for CommandLineFlagParameter
- Use API Extractor to trim internal APIs from the .d.ts rollup
- Improve the README.md and API documentation

## 4.3.14
Wed, 08 Apr 2020 04:07:33 GMT

_Version update only_

## 4.3.13
Sat, 28 Mar 2020 00:37:16 GMT

_Version update only_

## 4.3.12
Wed, 18 Mar 2020 15:07:47 GMT

### Patches

- Upgrade cyclic dependencies

## 4.3.11
Tue, 17 Mar 2020 23:55:58 GMT

### Patches

- PACKAGE NAME CHANGE: The NPM scope was changed from `@microsoft/ts-command-line` to `@rushstack/ts-command-line`

## 4.3.10
Tue, 21 Jan 2020 21:56:14 GMT

_Version update only_

## 4.3.9
Sun, 19 Jan 2020 02:26:52 GMT

### Patches

- Upgrade Node typings to Node 10

## 4.3.8
Fri, 17 Jan 2020 01:08:23 GMT

_Version update only_

## 4.3.7
Thu, 09 Jan 2020 06:44:13 GMT

_Version update only_

## 4.3.6
Wed, 08 Jan 2020 00:11:31 GMT

_Version update only_

## 4.3.5
Mon, 11 Nov 2019 16:07:56 GMT

_Version update only_

## 4.3.4
Tue, 22 Oct 2019 06:24:44 GMT

_Version update only_

## 4.3.3
Fri, 18 Oct 2019 15:15:00 GMT

### Patches

- Fix Choice parameter error when only one alternative value is provided

## 4.3.2
Sun, 29 Sep 2019 23:56:29 GMT

### Patches

- Update repository URL

## 4.3.1
Tue, 24 Sep 2019 02:58:49 GMT

### Patches

- Add back a missing dependency.

## 4.3.0
Mon, 23 Sep 2019 15:14:55 GMT

### Minor changes

- Remove unnecessary dependencies on @types/argparse and @types/node

## 4.2.8
Tue, 10 Sep 2019 22:32:23 GMT

### Patches

- Update documentation

## 4.2.7
Mon, 12 Aug 2019 15:15:14 GMT

### Patches

- fix for #1443 allow rush command to use numbers

## 4.2.6
Wed, 12 Jun 2019 19:12:33 GMT

### Patches

- Update Readme.

## 4.2.5
Mon, 27 May 2019 04:13:44 GMT

### Patches

- Fix a broken link in the README.md (GitHub issue #1285)

## 4.2.4
Mon, 06 May 2019 20:46:21 GMT

### Patches

- Allow colons in command line action names

## 4.2.3
Fri, 07 Dec 2018 17:04:56 GMT

### Patches

- Updated to use the new InternalError class for reporting software defects

## 4.2.2
Thu, 06 Sep 2018 01:25:26 GMT

### Patches

- Update "repository" field in package.json

## 4.2.1
Thu, 23 Aug 2018 18:18:53 GMT

### Patches

- Republish all packages in web-build-tools to resolve GitHub issue #782

## 4.2.0
Fri, 08 Jun 2018 08:43:52 GMT

### Minor changes

- Add CommandLineChoiceParameter.appendToArgList() and CommandLineParser.tryGetAction()

## 4.1.0
Fri, 27 Apr 2018 03:04:32 GMT

### Minor changes

- Add "defaultValue", "environmentVariable", and "required" features for command-line parameters

## 4.0.0
Thu, 19 Apr 2018 21:25:56 GMT

### Breaking changes

- Rename "CommandLineOptionParameter" to "CommandLineChoiceParameter" (API change)
- Rename "ICommandLineChoiceDefinition.options" to "alternatives" (API change)
- Add DynamicCommandLineAction, DynamicCommandLineParser, and other APIs to support defining and reading command-line parameters at runtime
- Rename "actionVerb" to "actionName" (API change)
- Replace "CommandLineAction.options" with more concise top-level properties (API change)

## 3.1.1
Fri, 23 Mar 2018 00:34:53 GMT

### Patches

- Upgrade colors to version ~1.2.1

## 3.1.0
Thu, 15 Mar 2018 20:00:50 GMT

### Minor changes

- Add default error handler so the caller to CommandLineParser.execute() is not expected to handle promise rejections
- Add a new API "CommandLineParser.executeWithoutErrorHandling()"

## 3.0.7
Mon, 12 Mar 2018 20:36:19 GMT

### Patches

- Locked down some "@types/" dependency versions to avoid upgrade conflicts

## 3.0.6
Fri, 02 Mar 2018 01:13:59 GMT

_Version update only_

## 3.0.5
Tue, 27 Feb 2018 22:05:57 GMT

_Version update only_

## 3.0.4
Wed, 21 Feb 2018 22:04:19 GMT

_Version update only_

## 3.0.3
Wed, 21 Feb 2018 03:13:28 GMT

_Version update only_

## 3.0.2
Sat, 17 Feb 2018 02:53:49 GMT

_Version update only_

## 3.0.1
Fri, 16 Feb 2018 22:05:23 GMT

_Version update only_

## 3.0.0
Fri, 16 Feb 2018 17:05:11 GMT

### Breaking changes

- Change all CommandLineActions to have an asychronous API that returns a promise.

## 2.3.10
Wed, 07 Feb 2018 17:05:11 GMT

_Version update only_

## 2.3.9
Fri, 26 Jan 2018 22:05:30 GMT

_Version update only_

## 2.3.8
Fri, 26 Jan 2018 17:53:38 GMT

### Patches

- Force a patch bump in case the previous version was an empty package

## 2.3.7
Fri, 26 Jan 2018 00:36:51 GMT

_Version update only_

## 2.3.6
Tue, 23 Jan 2018 17:05:28 GMT

_Version update only_

## 2.3.5
Thu, 18 Jan 2018 03:23:46 GMT

### Patches

- Enable package typings generated by api-extractor

## 2.3.4
Thu, 18 Jan 2018 00:48:06 GMT

_Version update only_

## 2.3.3
Wed, 17 Jan 2018 10:49:31 GMT

_Version update only_

## 2.3.2
Fri, 12 Jan 2018 03:35:22 GMT

_Version update only_

## 2.3.1
Thu, 11 Jan 2018 22:31:51 GMT

_Version update only_

## 2.3.0
Wed, 10 Jan 2018 20:40:01 GMT

### Minor changes

- Upgrade to Node 8

## 2.2.14
Tue, 09 Jan 2018 17:05:51 GMT

### Patches

- Get web-build-tools building with pnpm

## 2.2.13
Sun, 07 Jan 2018 05:12:08 GMT

_Version update only_

## 2.2.12
Fri, 05 Jan 2018 20:26:45 GMT

_Version update only_

## 2.2.11
Fri, 05 Jan 2018 00:48:42 GMT

_Version update only_

## 2.2.10
Fri, 22 Dec 2017 17:04:46 GMT

_Version update only_

## 2.2.9
Tue, 12 Dec 2017 03:33:27 GMT

_Version update only_

## 2.2.8
Thu, 30 Nov 2017 23:59:09 GMT

_Version update only_

## 2.2.7
Thu, 30 Nov 2017 23:12:21 GMT

_Version update only_

## 2.2.6
Wed, 29 Nov 2017 17:05:37 GMT

_Version update only_

## 2.2.5
Tue, 28 Nov 2017 23:43:55 GMT

_Version update only_

## 2.2.4
Mon, 13 Nov 2017 17:04:50 GMT

_Version update only_

## 2.2.3
Mon, 06 Nov 2017 17:04:18 GMT

_Version update only_

## 2.2.2
Thu, 02 Nov 2017 16:05:24 GMT

### Patches

- lock the reference version between web build tools projects

## 2.2.1
Wed, 01 Nov 2017 21:06:08 GMT

### Patches

- Upgrade cyclic dependencies

## 2.2.0
Tue, 31 Oct 2017 21:04:04 GMT

### Minor changes

- Add ability to specify default value for enum options.

## 2.1.4
Tue, 31 Oct 2017 16:04:55 GMT

_Version update only_

## 2.1.3
Wed, 25 Oct 2017 20:03:59 GMT

_Version update only_

## 2.1.2
Tue, 24 Oct 2017 18:17:12 GMT

_Version update only_

## 2.1.1
Mon, 23 Oct 2017 21:53:12 GMT

### Patches

- Updated cyclic dependencies

## 2.1.0
Fri, 22 Sep 2017 01:04:02 GMT

### Minor changes

- Upgrade to es6

## 2.0.7
Fri, 08 Sep 2017 01:28:04 GMT

### Patches

- Deprecate @types/es6-coll ections in favor of built-in typescript typings 'es2015.collection' a nd 'es2015.iterable'

## 2.0.6
Thu, 31 Aug 2017 18:41:18 GMT

_Version update only_

## 2.0.5
Wed, 30 Aug 2017 01:04:34 GMT

_Version update only_

## 2.0.4
Tue, 22 Aug 2017 13:04:22 GMT

_Version update only_

## 2.0.3
Tue, 25 Jul 2017 20:03:31 GMT

### Patches

- Upgrade to TypeScript 2.4

## 2.0.2
Fri, 23 Jun 2017 20:05:07 GMT

### Patches

- Initial open source release of this library

## 2.0.1
Thu, 25 May 2017 21:09:42 GMT

### Patches

- Dependency version change

## 2.0.0
Fri, 17 Feb 2017 23:09:23 GMT

### Breaking changes

- General availability

### Minor changes

- Added a "option" parameter, which can limit the input to a list of possible strings.
- Added the ability to give custom names to keys in the help menu.

### Patches

- Locked version numbers for @types packages
- Updated .npmignore

## 1.1.1
Tue, 06 Dec 2016 20:44:26 GMT

### Patches

- Changes for RC0 release.

## 1.2.0

_Version update only_

## 1.1.0

### Minor changes

- Introduces a new command line argument type for a list of strings
- Introduces a new command line argument type for integers

## 1.0.1

_Initial release_

