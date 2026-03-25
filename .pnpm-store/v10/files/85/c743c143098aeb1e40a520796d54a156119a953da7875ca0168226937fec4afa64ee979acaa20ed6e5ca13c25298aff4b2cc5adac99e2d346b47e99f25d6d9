# Change Log - @rushstack/node-core-library

This log was last generated on Tue, 11 Mar 2025 02:12:33 GMT and should not be manually modified.

## 5.12.0
Tue, 11 Mar 2025 02:12:33 GMT

### Minor changes

- Add `useNodeJSResolver` option to `Import.resolvePackage` to rely on the built-in `require.resolve` and share its cache.
- In `RealNodeModulePathResolver`, add the option to configure to throw or not throw for non-existent paths.

### Patches

- In `RealNodeModulePathResolver`, add negative caching when a path segment that might be a symbolic link is not.

## 5.11.0
Thu, 30 Jan 2025 01:11:42 GMT

### Minor changes

- Update fs-extra to 11.3.0.

## 5.10.2
Thu, 09 Jan 2025 01:10:10 GMT

### Patches

- Provide the `retryCount` parameter to actions executed using `Async.runWithRetriesAsync`

## 5.10.1
Sat, 14 Dec 2024 01:11:07 GMT

### Patches

- Fix handling of trailing slashes and relative paths in RealNodeModulePath to match semantics of `fs.realpathSync.native`.

## 5.10.0
Fri, 22 Nov 2024 01:10:43 GMT

### Minor changes

- Add `RealNodeModulePathResolver` class to get equivalent behavior to `realpath` with fewer system calls (and therefore higher performance) in the typical scenario where the only symlinks in the repository are inside of `node_modules` folders and are links to package folders.

## 5.9.0
Fri, 13 Sep 2024 00:11:42 GMT

### Minor changes

- Add a `Sort.sortKeys` function for sorting keys in an object
- Rename `LockFile.acquire` to `Lockfile.acquireAsync`.

### Patches

- Fix an issue where attempting to acquire multiple `LockFile`s at the same time on POSIX would cause the second to immediately be acquired without releasing the first.

## 5.8.0
Tue, 10 Sep 2024 20:08:11 GMT

### Minor changes

- Add a `customFormats` option to `JsonSchema`.

## 5.7.0
Wed, 21 Aug 2024 05:43:04 GMT

### Minor changes

- Introduce a `Text.splitByNewLines` function.

## 5.6.0
Mon, 12 Aug 2024 22:16:04 GMT

### Minor changes

- Add a `ignoreSchemaField` option to the `JsonSchema.validateObject` options to ignore `$schema` properties and add an options object argument to `JsonSchema.validateObjectWithCallback` with the same `ignoreSchemaField` option.

## 5.5.1
Sat, 27 Jul 2024 00:10:27 GMT

### Patches

- Include CHANGELOG.md in published releases again

## 5.5.0
Tue, 16 Jul 2024 00:36:21 GMT

### Minor changes

- Add support for the `jsonSyntax` option to the `JsonFile.save`, `JsonFile.saveAsync`, and `JsonFile.stringify` functions.

## 5.4.1
Thu, 30 May 2024 00:13:05 GMT

### Patches

- Include missing `type` modifiers on type-only exports.

## 5.4.0
Wed, 29 May 2024 02:03:50 GMT

### Minor changes

- Add a `throwOnSignal` option to the `Executable.waitForExitAsync` to control if that function should throw if the process is terminated with a signal.
- Add a `signal` property to the result of `Executable.waitForExitAsync` that includes a signal if the process was termianted by a signal.

## 5.3.0
Tue, 28 May 2024 15:10:09 GMT

### Minor changes

- Include typings for the the `"files"` field in `IPackageJson`.

## 5.2.0
Tue, 28 May 2024 00:09:47 GMT

### Minor changes

- Include typings for the `"exports"` and `"typesVersions"` fields in `IPackageJson`.

## 5.1.0
Sat, 25 May 2024 04:54:07 GMT

### Minor changes

- Update `JsonFile` to support loading JSON files that include object keys that are members of `Object.prototype`.

### Patches

- Fix an issue with `JsonSchema` where `"uniqueItems": true` would throw an error if the `"item"` type in the schema has `"type": "object"`.

## 5.0.0
Thu, 23 May 2024 02:26:56 GMT

### Breaking changes

- Replace z-schema with ajv for schema validation and add support for json-schema draft-07.
- Remove the deprecated `Async.sleep` function.
- Convert `FileConstants` and `FolderConstants` from enums to const objects.

### Patches

- Fix an issue where waitForExitAsync() might reject before all output was collected

## 4.3.0
Wed, 15 May 2024 06:04:17 GMT

### Minor changes

- Rename `Async.sleep` to `Async.sleepAsync`. The old function is marked as `@deprecated`.

## 4.2.1
Fri, 10 May 2024 05:33:33 GMT

### Patches

- Fix a bug in `Async.forEachAsync` where weight wasn't respected.

## 4.2.0
Mon, 06 May 2024 15:11:04 GMT

### Minor changes

- Add a new `weighted: true` option to the `Async.forEachAsync` method that allows each element to specify how much of the allowed parallelism the callback uses.

### Patches

- Add a new `weighted: true` option to the `Async.mapAsync` method that allows each element to specify how much of the allowed parallelism the callback uses.

## 4.1.0
Wed, 10 Apr 2024 15:10:08 GMT

### Minor changes

- Add `writeBuffersToFile` and `writeBuffersToFileAsync` methods to `FileSystem` for efficient writing of concatenated files.

## 4.0.2
Wed, 21 Feb 2024 21:45:28 GMT

### Patches

- Replace the dependency on the `colors` package with `Colorize` from `@rushstack/terminal`.

## 4.0.1
Tue, 20 Feb 2024 21:45:10 GMT

### Patches

- Remove a no longer needed dependency on the `colors` package

## 4.0.0
Mon, 19 Feb 2024 21:54:27 GMT

### Breaking changes

- (BREAKING CHANGE) Remove the Terminal and related APIs (Colors, AsciEscape, etc). These have been moved into the @rushstack/terminal package. See https://github.com/microsoft/rushstack/pull/3176 for details.
- Remove deprecated `FileSystem.readFolder`, `FileSystem.readFolderAsync`, and `LegacyAdapters.sortStable` APIs.

### Minor changes

- Graduate `Async` and `MinimumHeap` APIs from beta to public.

## 3.66.1
Sat, 17 Feb 2024 06:24:35 GMT

### Patches

- Fix broken link to API documentation

## 3.66.0
Thu, 08 Feb 2024 01:09:21 GMT

### Minor changes

- Add getStatistics() method to FileWriter instances

### Patches

- LockFile: prevent accidentaly deleting freshly created lockfile when multiple processes try to acquire the same lock on macOS/Linux

## 3.65.0
Mon, 05 Feb 2024 23:46:52 GMT

### Minor changes

- Inclue a `Text.reverse` API for reversing a string.

## 3.64.2
Thu, 25 Jan 2024 01:09:29 GMT

### Patches

- Improve 'bin' definition in `IPackageJson` type

## 3.64.1
Tue, 23 Jan 2024 20:12:57 GMT

### Patches

- Fix Executable.getProcessInfoBy* methods truncating the process name on MacOS

## 3.64.0
Tue, 23 Jan 2024 16:15:05 GMT

### Minor changes

- Add the `dependenciesMeta` property to the `INodePackageJson` interface.

## 3.63.0
Wed, 03 Jan 2024 00:31:18 GMT

### Minor changes

- Updates the `JsonFile` API to format JSON as JSON5 if an existing string is being updated to preserve the style of the existing JSON.

## 3.62.0
Thu, 07 Dec 2023 03:44:13 GMT

### Minor changes

- Add functions inside the `Executable` API to list all process trees (`getProcessInfoById`, `getProcessInfoByIdAsync`, `getProcessInfoByName`, and `getProcessInfoByNameAsync`).
- Add functions inside the `Text` API to split iterables (or async iterables) that produce strings or buffers on newlines (`readLinesFromIterable` and `readLinesFromIterableAsync`).
- Add the `waitForExitAsync` method inside the `Executable` API used to wait for a provided child process to exit.

## 3.61.0
Thu, 28 Sep 2023 20:53:17 GMT

### Minor changes

- Add Async.getSignal for promise-based signaling. Add MinimumHeap for use as a priority queue.

## 3.60.1
Tue, 26 Sep 2023 09:30:33 GMT

### Patches

- Update type-only imports to include the type modifier.

## 3.60.0
Fri, 15 Sep 2023 00:36:58 GMT

### Minor changes

- Update @types/node from 14 to 18

## 3.59.7
Tue, 08 Aug 2023 07:10:39 GMT

_Version update only_

## 3.59.6
Wed, 19 Jul 2023 00:20:31 GMT

### Patches

- Updated semver dependency

## 3.59.5
Thu, 06 Jul 2023 00:16:19 GMT

### Patches

- Fix Import.resolveModule* and Import.resolvePackage* methods to return real-paths when resolving self-referencing specs

## 3.59.4
Thu, 15 Jun 2023 00:21:01 GMT

_Version update only_

## 3.59.3
Wed, 07 Jun 2023 22:45:16 GMT

_Version update only_

## 3.59.2
Mon, 29 May 2023 15:21:15 GMT

### Patches

- Remove extraneous string encode/decode of final output during `JsonFile.save`/`JsonFile.saveAsync`.

## 3.59.1
Mon, 22 May 2023 06:34:33 GMT

_Version update only_

## 3.59.0
Fri, 12 May 2023 00:23:05 GMT

### Minor changes

- Add an option to the `PrefixProxyTerminalProvider` to create a dynamic prefix, which can be used for something like prefixing logging lines with a timestamp.

## 3.58.0
Mon, 01 May 2023 15:23:19 GMT

### Minor changes

- Expose a `Text.escapeRegExp` function to escape regexp special characters.

## 3.57.0
Sat, 29 Apr 2023 00:23:02 GMT

### Minor changes

- Add PrefixProxyTerminalProvider to allow for prefixing a provided string before writing to a terminal provider
- Add a Writable stream adapter for ITerminal to allow writing to a terminal as a stream

## 3.56.0
Thu, 27 Apr 2023 17:18:42 GMT

### Minor changes

- Adds the AsyncQueue class, a queue type that allows for iterating and concurrently adding to the queue
- Adds support for async Import.resolve* APIs

### Patches

- Fix a typings issue in FileSystem.copyFilesAsync
- Fix issues with Import.resolve* APIs when attempting to resolve system modules paths (ex. 'fs/promises') and self-referencing module paths

## 3.55.2
Fri, 10 Feb 2023 01:18:51 GMT

_Version update only_

## 3.55.1
Sun, 05 Feb 2023 03:02:02 GMT

### Patches

- Change the peer dependency selector on `@types/node` to a wildcard (`*`).

## 3.55.0
Wed, 01 Feb 2023 02:16:34 GMT

### Minor changes

- Bump @types/node peerDependency to ^14.18.36.

## 3.54.0
Mon, 30 Jan 2023 16:22:30 GMT

### Minor changes

- Add a `peerDependenciesMeta` property to `IPackageJson`.
- Move the @types/node dependency to an optional peerDependency.

## 3.53.3
Fri, 09 Dec 2022 16:18:27 GMT

### Patches

- Improve performance of `Import.resolvePackage`.
- Improve the error message emitted when a path inside a package is passed to `Import.resolvePackage`.

## 3.53.2
Thu, 13 Oct 2022 00:20:15 GMT

### Patches

- Fix a bug where `Sort.isSorted` and `Sort.isSortedBy` unexpectedly compared the first element against `undefined`. Optimize `Sort.sortMapKeys` to run the check for already being sorted against the original Map instead of a derived array.

## 3.53.1
Mon, 10 Oct 2022 15:23:44 GMT

_Version update only_

## 3.53.0
Thu, 29 Sep 2022 07:13:06 GMT

### Minor changes

- Add a Path.convertToPlatformDefault API to convert a path to use the platform-default slashes.

## 3.52.0
Wed, 21 Sep 2022 20:21:10 GMT

### Minor changes

- Add a "FileSystem.isNotDirectoryError" function that returns `true` if the passed-in error object is an ENOTDIR error.
- Add a parameter to the `LockFile.release` function to optionally delete the lockfile.

## 3.51.2
Thu, 15 Sep 2022 00:18:51 GMT

_Version update only_

## 3.51.1
Wed, 24 Aug 2022 03:01:22 GMT

### Patches

- Introduce JsonSyntax option for JsonFile.load() and related APIs

## 3.51.0
Wed, 24 Aug 2022 00:14:38 GMT

### Minor changes

- Deprecate LegacyAdapters.sortStable and remove support for NodeJS < 11. If you are using NodeJS < 11, this is a breaking change.

## 3.50.2
Fri, 19 Aug 2022 00:17:19 GMT

### Patches

- Update `PackageJsonLookup` to only resolve to `package.json` files that contain a `"name"` field. See GitHub issue #2070

## 3.50.1
Wed, 03 Aug 2022 18:40:35 GMT

_Version update only_

## 3.50.0
Mon, 01 Aug 2022 02:45:32 GMT

### Minor changes

- Add an Async.runWithRetriesAsync() API to run and a retry an async function that may intermittently fail.

## 3.49.0
Tue, 28 Jun 2022 22:47:13 GMT

### Minor changes

- Add SubprocessTerminator utility, which can be used to kill a process and all of its child processes on demand or on termination of the host process.

## 3.48.0
Tue, 28 Jun 2022 00:23:32 GMT

### Minor changes

- Add FileSystem.isDirectoryError utility function to determine if an error has the code "EISDIR". This error code may be returned (for example) when attempting to delete a folder as if it were a file using the FileSystem.deleteFile API.

## 3.47.0
Mon, 27 Jun 2022 18:43:09 GMT

### Minor changes

- Add a "trimLeadingDotSlash" option to the Path.formatConcisely function to not include the leading "./" in paths under the baseFolder.
- Change the FileError relative path output to not include the leading "./"

## 3.46.0
Sat, 25 Jun 2022 01:54:29 GMT

### Minor changes

- Add FileError class. This error type can be thrown when encountering an error at a specific line and column of a target file.

## 3.45.7
Fri, 17 Jun 2022 09:17:54 GMT

### Patches

- Fix a race condition affecting the LockFile API on the Linux operating system

## 3.45.6
Fri, 17 Jun 2022 00:16:18 GMT

_Version update only_

## 3.45.5
Tue, 10 May 2022 01:20:43 GMT

### Patches

- Fix and issue where Async.forEachAsync with an async iterator can overflow the max concurrency

## 3.45.4
Sat, 23 Apr 2022 02:13:07 GMT

_Version update only_

## 3.45.3
Fri, 15 Apr 2022 00:12:36 GMT

_Version update only_

## 3.45.2
Sat, 09 Apr 2022 02:24:26 GMT

### Patches

- Rename the "master" branch to "main".

## 3.45.1
Tue, 15 Mar 2022 19:15:53 GMT

_Version update only_

## 3.45.0
Wed, 05 Jan 2022 16:07:47 GMT

### Minor changes

- Expose a FileSystem.readFolderItems and FileSystem.readFolderItemsAsync API to get folder entries with types in a single API call.
- Deprecate FileSystem.readFolder in favor of FileSystem.readFolderItemNames.

## 3.44.3
Mon, 27 Dec 2021 16:10:40 GMT

_Version update only_

## 3.44.2
Thu, 09 Dec 2021 20:34:41 GMT

### Patches

- Update z-schema to ~5.0.2.

## 3.44.1
Mon, 06 Dec 2021 16:08:33 GMT

_Version update only_

## 3.44.0
Fri, 03 Dec 2021 03:05:22 GMT

### Minor changes

- Replace const enums with conventional enums to allow for compatability with JavaScript consumers.

## 3.43.2
Sat, 06 Nov 2021 00:09:13 GMT

### Patches

- Updated Path.convertToSlashes() to use replace(/\\/g, '/') instead of split/join for better performance.

## 3.43.1
Fri, 05 Nov 2021 15:09:18 GMT

_Version update only_

## 3.43.0
Wed, 27 Oct 2021 00:08:15 GMT

### Minor changes

- Add more elaborate "repository" field types in IPackageJson.

### Patches

- Update the package.json repository field to include the directory property.

## 3.42.3
Wed, 13 Oct 2021 15:09:54 GMT

_Version update only_

## 3.42.2
Fri, 08 Oct 2021 08:08:34 GMT

### Patches

- Fix an issue where Async.foreEachAsync can never resolve when operating on a large array.

## 3.42.1
Thu, 07 Oct 2021 07:13:35 GMT

_Version update only_

## 3.42.0
Tue, 05 Oct 2021 15:08:38 GMT

### Minor changes

- Expose an ITerminal interface.

## 3.41.0
Fri, 24 Sep 2021 00:09:29 GMT

### Minor changes

- Allow Async.mapAsync and Async.forEachAsync to take an iterator.

## 3.40.3
Thu, 23 Sep 2021 00:10:41 GMT

### Patches

- Upgrade the `@types/node` dependency to version to version 12.

## 3.40.2
Tue, 14 Sep 2021 01:17:04 GMT

### Patches

- Improve documentation to clarify usage for FileSystem APIs related to symbolic links

## 3.40.1
Mon, 13 Sep 2021 15:07:05 GMT

### Patches

- Add support for AlreadyExistsBehavior in symlink and junction scenarios

## 3.40.0
Wed, 11 Aug 2021 00:07:21 GMT

### Minor changes

- Add new Terminal message severity "debug", below verbose.

## 3.39.1
Mon, 12 Jul 2021 23:08:26 GMT

_Version update only_

## 3.39.0
Fri, 04 Jun 2021 19:59:53 GMT

### Minor changes

- BREAKING CHANGE: Remove FileSystem.copyFileToManyAsync API. It was determined that this API was a likely source of 0-length file copies. Recommended replacement is to call copyFileAsync.

## 3.38.0
Wed, 19 May 2021 00:11:39 GMT

### Minor changes

- Add `ignoreUndefinedValues` option to JsonFile to discard keys with undefined values during serialization; this is the standard behavior of `JSON.stringify()` and other JSON serializers.

## 3.37.0
Mon, 03 May 2021 15:10:28 GMT

### Minor changes

- Add a new API "Async" with some utilities for working with promises

## 3.36.2
Mon, 12 Apr 2021 15:10:28 GMT

_Version update only_

## 3.36.1
Tue, 06 Apr 2021 15:14:22 GMT

_Version update only_

## 3.36.0
Fri, 05 Feb 2021 16:10:42 GMT

### Minor changes

- Add EnvironmentMap API
- Add Executable.spawn() API

## 3.35.2
Thu, 10 Dec 2020 23:25:49 GMT

_Version update only_

## 3.35.1
Wed, 11 Nov 2020 01:08:59 GMT

_Version update only_

## 3.35.0
Tue, 10 Nov 2020 23:13:11 GMT

### Minor changes

- Add new "copyFileToMany" API to copy a single file to multiple locations
- Add an alreadyExistsBehavior option to the options for creating links in FileSystem.

## 3.34.7
Fri, 30 Oct 2020 06:38:39 GMT

_Version update only_

## 3.34.6
Fri, 30 Oct 2020 00:10:14 GMT

_Version update only_

## 3.34.5
Wed, 28 Oct 2020 01:18:03 GMT

_Version update only_

## 3.34.4
Tue, 27 Oct 2020 15:10:13 GMT

### Patches

- Fix an issue where the TextAttribute.Bold ANSI escape was not rendered correctly by Linux

## 3.34.3
Tue, 06 Oct 2020 00:24:06 GMT

_Version update only_

## 3.34.2
Mon, 05 Oct 2020 22:36:57 GMT

_Version update only_

## 3.34.1
Wed, 30 Sep 2020 18:39:17 GMT

### Patches

- Update to build with @rushstack/heft-node-rig

## 3.34.0
Wed, 30 Sep 2020 06:53:53 GMT

### Minor changes

- Add Path.isEqual(), Path.formatConcisely(), Path.convertToSlashes(), Path.convertToBackslashes(), and Path.isDownwardRelative()
- Upgrade compiler; the API now requires TypeScript 3.9 or newer

### Patches

- Update README.md

## 3.33.6
Tue, 22 Sep 2020 05:45:57 GMT

_Version update only_

## 3.33.5
Tue, 22 Sep 2020 01:45:31 GMT

_Version update only_

## 3.33.4
Tue, 22 Sep 2020 00:08:53 GMT

_Version update only_

## 3.33.3
Sat, 19 Sep 2020 04:37:27 GMT

_Version update only_

## 3.33.2
Sat, 19 Sep 2020 03:33:07 GMT

_Version update only_

## 3.33.1
Fri, 18 Sep 2020 22:57:25 GMT

_Version update only_

## 3.33.0
Fri, 18 Sep 2020 21:49:53 GMT

### Minor changes

- Add a missing "existsAsync" function to the FileSystem API.

## 3.32.0
Fri, 11 Sep 2020 02:13:35 GMT

### Minor changes

- Add Text.getNewline() and FileWriter.filePath
- Add Brand API

## 3.31.0
Mon, 07 Sep 2020 07:37:37 GMT

### Minor changes

- Replace Colors.normalizeColorTokensForTest() (which was marked as "beta") with AnsiEscape.formatForTests()

## 3.30.0
Thu, 27 Aug 2020 11:27:06 GMT

### Minor changes

- Include an API for resolving packages and modules.

## 3.29.1
Mon, 24 Aug 2020 07:35:20 GMT

_Version update only_

## 3.29.0
Sat, 22 Aug 2020 05:55:42 GMT

### Minor changes

- Introduce a "JsonNull" type for describing legacy JSON structures without triggering the "@rushstack/no-new-null" lint rule

## 3.28.0
Tue, 18 Aug 2020 23:59:42 GMT

### Minor changes

- Add a utility function for making console color codes human-readable.
- Create a lighter weight function to get own package version.

### Patches

- Lazy-import some packages to improve spin up times.

## 3.27.0
Mon, 17 Aug 2020 04:53:23 GMT

### Minor changes

- Add new APIs AlreadyReportedError and TypeUuid

## 3.26.2
Wed, 12 Aug 2020 00:10:05 GMT

### Patches

- Updated project to build with Heft

## 3.26.1
Wed, 05 Aug 2020 18:27:32 GMT

### Patches

- Triggering publish of dependents

## 3.26.0
Mon, 03 Aug 2020 06:55:14 GMT

### Minor changes

- Added IJsonFileStringifyOptions.headerComment

## 3.25.0
Fri, 03 Jul 2020 15:09:04 GMT

### Minor changes

- Add a utility method to convert a map into an object

## 3.24.4
Thu, 25 Jun 2020 06:43:35 GMT

_Version update only_

## 3.24.3
Wed, 24 Jun 2020 09:50:48 GMT

_Version update only_

## 3.24.2
Wed, 24 Jun 2020 09:04:28 GMT

_Version update only_

## 3.24.1
Wed, 10 Jun 2020 20:48:30 GMT

### Patches

- Improve API docs for "LockFile"

## 3.24.0
Sat, 30 May 2020 02:59:54 GMT

### Minor changes

- Add a FileSystem.copyFiles() API for recursively copying folders, and clarify that FileSystem.copyFile() only copies a single file

## 3.23.1
Thu, 28 May 2020 05:59:02 GMT

### Patches

- Improve async callstacks for FileSystem API (when using Node 12)

## 3.23.0
Wed, 27 May 2020 05:15:10 GMT

### Minor changes

- Add an "FileSystemStats" alias to avoid the need to import "fs" when using the FileSystem API
- Add FileSystem.readLink() and readLinkAsync()

## 3.22.1
Tue, 26 May 2020 23:00:25 GMT

### Patches

- Make not-exist error messages more readable.

## 3.22.0
Fri, 22 May 2020 15:08:42 GMT

### Minor changes

- Expose string parsing APIs from JsonFile.

## 3.21.0
Thu, 21 May 2020 23:09:44 GMT

### Minor changes

- Create async versions of FileSystem and JsonFile APIs.

## 3.20.0
Thu, 21 May 2020 15:41:59 GMT

### Minor changes

- Add PackageNameParser class, which is a configurable version of the PackageName API

## 3.19.7
Wed, 08 Apr 2020 04:07:34 GMT

_Version update only_

## 3.19.6
Sat, 28 Mar 2020 00:37:16 GMT

_Version update only_

## 3.19.5
Wed, 18 Mar 2020 15:07:47 GMT

### Patches

- Upgrade cyclic dependencies

## 3.19.4
Tue, 17 Mar 2020 23:55:58 GMT

### Patches

- PACKAGE NAME CHANGE: The NPM scope was changed from `@microsoft/node-core-library` to `@rushstack/node-core-library`

## 3.19.3
Tue, 28 Jan 2020 02:23:44 GMT

### Patches

- Fix a typing issue that prevented LegacyAdapters from being used with the new glob typings.

## 3.19.2
Thu, 23 Jan 2020 01:07:56 GMT

### Patches

- Fix an issue with a missing type in LegacyAdapters

## 3.19.1
Tue, 21 Jan 2020 21:56:14 GMT

_Version update only_

## 3.19.0
Sun, 19 Jan 2020 02:26:52 GMT

### Minor changes

- Upgrade Node typings to Node 10

## 3.18.3
Fri, 17 Jan 2020 01:08:23 GMT

_Version update only_

## 3.18.2
Thu, 09 Jan 2020 06:44:13 GMT

_Version update only_

## 3.18.1
Wed, 08 Jan 2020 00:11:31 GMT

_Version update only_

## 3.18.0
Fri, 15 Nov 2019 04:50:50 GMT

### Minor changes

- Add NewlineKind.OsDefault and fix some comments

## 3.17.1
Mon, 11 Nov 2019 16:07:56 GMT

_Version update only_

## 3.17.0
Tue, 05 Nov 2019 06:49:28 GMT

### Minor changes

- Add new API LegacyAdapters.stableSort(), and update the Sort API to be stable

## 3.16.0
Tue, 22 Oct 2019 06:24:44 GMT

### Minor changes

- Add JsonObject type

### Patches

- Refactor some code as part of migration from TSLint to ESLint

## 3.15.1
Sun, 29 Sep 2019 23:56:29 GMT

### Patches

- Update repository URL

## 3.15.0
Mon, 23 Sep 2019 15:14:55 GMT

### Minor changes

- Upgrade @types/node dependency and remove unnecessary dependencies on @types/fs-extra, @types/jju, and @types/z-schema

## 3.14.2
Tue, 10 Sep 2019 22:32:23 GMT

### Patches

- Update documentation

## 3.14.1
Wed, 04 Sep 2019 18:28:06 GMT

### Patches

- Add support for two more arguments in LegacyAdapters.convertCallbackToPromise.

## 3.14.0
Thu, 08 Aug 2019 15:14:17 GMT

### Minor changes

- Remove experimental IPackageJsonTsdocConfiguration API, since the "tsdocFlavor" field is no longer used by API Extractor

## 3.13.0
Wed, 20 Mar 2019 19:14:49 GMT

### Minor changes

- Introduce an interface INodePackageJson for loading package.json files whose "version" field may be missing.
- Add two new APIs PackageJsonLookup.loadNodePackageJson() and tryLoadNodePackageJsonFor() that return INodePackageJson

## 3.12.1
Mon, 18 Mar 2019 04:28:43 GMT

### Patches

- Export ColorValue and TextAttribute to eliminate the ae-forgotten-export warning

## 3.12.0
Wed, 27 Feb 2019 22:13:58 GMT

### Minor changes

- Treat `types` as an alias for `typings` in package.json

## 3.11.1
Wed, 27 Feb 2019 17:13:17 GMT

### Patches

- Include an enum that had been missing from the exports.

## 3.11.0
Mon, 18 Feb 2019 17:13:23 GMT

### Minor changes

- Exposing field tsdocMetadata in package.json

## 3.10.0
Mon, 11 Feb 2019 03:31:55 GMT

### Minor changes

- Include support for text formatting in the Terminal API.
- Add new API `InternalError.breakInDebugger`

### Patches

- Exposing utility class StringBufferTerminalProvider, useful to clients of Terminal API for their own unit tests

## 3.9.0
Thu, 10 Jan 2019 01:57:52 GMT

### Minor changes

- Remove deprecated FileDiffTest API for unit tests; please use Jest snapshots instead

## 3.8.3
Wed, 19 Dec 2018 05:57:33 GMT

### Patches

- Add missing space in error message

## 3.8.2
Thu, 13 Dec 2018 02:58:10 GMT

### Patches

- Use @types/jju not custom typings

## 3.8.1
Wed, 12 Dec 2018 17:04:19 GMT

### Patches

- Clarify error message reported by JsonFile._validateNoUndefinedMembers()

## 3.8.0
Fri, 07 Dec 2018 17:04:56 GMT

### Minor changes

- Added a new "InternalError" API for reporting software defects

## 3.7.1
Thu, 29 Nov 2018 07:02:09 GMT

### Patches

- Improve Sort.compareByValue() to consistently order "null" and "undefined" values

## 3.7.0
Wed, 28 Nov 2018 02:17:11 GMT

### Minor changes

- Add new API PackageJsonLookup.loadOwnPackageJson()

## 3.6.0
Fri, 16 Nov 2018 21:37:10 GMT

### Minor changes

- Add new APIs Sort.sortSet() and Sort.sortSetBy()

## 3.5.2
Wed, 07 Nov 2018 21:04:35 GMT

### Patches

- Upgrade fs-extra to eliminate the "ERROR: ENOTEMPTY: directory not empty, rmdir" error that sometimes occurred with FileSystem.deleteFolder()

## 3.5.1
Mon, 05 Nov 2018 17:04:24 GMT

### Patches

- Remove all dependencies on the "rimraf" library

## 3.5.0
Thu, 25 Oct 2018 23:20:40 GMT

### Minor changes

- Add Sort API

## 3.4.0
Wed, 24 Oct 2018 16:03:10 GMT

### Minor changes

- Adding Terminal API.

## 3.3.1
Wed, 17 Oct 2018 21:04:49 GMT

### Patches

- Remove use of a deprecated Buffer API.

## 3.3.0
Mon, 08 Oct 2018 16:04:27 GMT

### Minor changes

- Renaming PromiseUtilities to LegacyAdapters

## 3.2.0
Sun, 07 Oct 2018 06:15:56 GMT

### Minor changes

- Introduce promiseify utility function.

### Patches

- Update documentation

## 3.1.0
Fri, 28 Sep 2018 16:05:35 GMT

### Minor changes

- Add `Path.isUnderOrEquals()`

## 3.0.1
Thu, 06 Sep 2018 01:25:26 GMT

### Patches

- Update "repository" field in package.json

## 3.0.0
Wed, 29 Aug 2018 06:36:50 GMT

### Breaking changes

- (Breaking API change) The FileSystem move/copy/createLink operations now require the source/target parameters to be explicitly specified, to avoid confusion

## 2.2.1
Thu, 23 Aug 2018 18:18:53 GMT

### Patches

- Republish all packages in web-build-tools to resolve GitHub issue #782

## 2.2.0
Wed, 22 Aug 2018 20:58:58 GMT

### Minor changes

- Add features to JsonFile API to update an existing JSON file while preserving comments and whitespace

## 2.1.1
Wed, 22 Aug 2018 16:03:25 GMT

### Patches

- Fix an issue where Executable.spawnSync() was returning SpawnSyncReturns<Buffer> instead of SpawnSyncReturns<string>
- Fix an issue where Executable.spawnSync() did not support command paths containing spaces

## 2.1.0
Thu, 09 Aug 2018 21:03:22 GMT

### Minor changes

- Add a new API "Executable" for spawning child processes

## 2.0.0
Thu, 26 Jul 2018 16:04:17 GMT

### Breaking changes

- Replace IFileModeBits with a more flexible PosixModeBits enum
- Rename FileSystem.changePermissionBits() to changePosixModeBits()

### Minor changes

- Add new APIs FileSystem.getPosixModeBits() and FileSystem.formatPosixModeBits()

## 1.5.0
Tue, 03 Jul 2018 21:03:31 GMT

### Minor changes

- Add a FileSystem API that wraps and replaces fs and fs-extra

## 1.4.1
Thu, 21 Jun 2018 08:27:29 GMT

### Patches

- issue #705: fallback on linux to /proc/{n}/stat if 'ps -p 1 -o lstart' is not supported

## 1.4.0
Fri, 08 Jun 2018 08:43:52 GMT

### Minor changes

- Add Text.truncateWithEllipsis() API

## 1.3.2
Thu, 31 May 2018 01:39:33 GMT

### Patches

- Add missing "repository" property in IPackageJSON.

## 1.3.1
Tue, 15 May 2018 02:26:45 GMT

### Patches

- Fix an issue where the PackageName class could not parse the package name "Base64"

## 1.3.0
Fri, 04 May 2018 00:42:38 GMT

### Minor changes

- Update the package resolution logic to preserve symlinks in paths

## 1.2.0
Tue, 03 Apr 2018 16:05:29 GMT

### Minor changes

- Add a new API "MapExtensions.mergeFromMap"

## 1.1.0
Mon, 02 Apr 2018 16:05:24 GMT

### Minor changes

- Add new API "PackageName" for validating package names and extracting scopes
- Add new API "ProtectableMap" for tracking/restricting how a map is consumed

## 1.0.0
Sat, 17 Mar 2018 02:54:22 GMT

### Breaking changes

- Redesign the PackageJsonLookup API. This is a breaking change.

### Minor changes

- Add new APIs IPackageJson, FileConstants, and FolderConstants

### Patches

- Add "tsdoc" field to the IPackageJson API
- Improve PackageJsonLookup.tryGetPackageFolderFor() to deduplicate symlinks by using fs.realpathSync()

## 0.8.0
Thu, 15 Mar 2018 16:05:43 GMT

### Minor changes

- Add new Text API

## 0.7.3
Fri, 02 Mar 2018 01:13:59 GMT

_Version update only_

## 0.7.2
Tue, 27 Feb 2018 22:05:57 GMT

### Patches

- Fix an issue where the LockFile was unable to acquire the lock if the resource dir doesn't exist.

## 0.7.1
Wed, 21 Feb 2018 22:04:19 GMT

_Version update only_

## 0.7.0
Wed, 21 Feb 2018 03:13:28 GMT

### Minor changes

- Add "Path.isUnder()" API

## 0.6.1
Sat, 17 Feb 2018 02:53:49 GMT

### Patches

- Fix an issue for LockFiles where not all filesystem operations were wrapped in a try/catch block.

## 0.6.0
Fri, 16 Feb 2018 22:05:23 GMT

### Minor changes

- Add an API to `LockFile` which allows the caller to asyncronously wait for a LockFile to become available.

## 0.5.1
Fri, 16 Feb 2018 17:05:11 GMT

_Version update only_

## 0.5.0
Wed, 07 Feb 2018 17:05:11 GMT

### Minor changes

- Add a LockFile class to work with LockFile's that manage resources across multiple processes.

## 0.4.10
Fri, 26 Jan 2018 22:05:30 GMT

_Version update only_

## 0.4.9
Fri, 26 Jan 2018 17:53:38 GMT

### Patches

- Force a patch bump in case the previous version was an empty package

## 0.4.8
Fri, 26 Jan 2018 00:36:51 GMT

_Version update only_

## 0.4.7
Tue, 23 Jan 2018 17:05:28 GMT

_Version update only_

## 0.4.6
Thu, 18 Jan 2018 03:23:46 GMT

_Version update only_

## 0.4.5
Thu, 18 Jan 2018 00:48:06 GMT

_Version update only_

## 0.4.4
Thu, 18 Jan 2018 00:27:23 GMT

### Patches

- Enable package typings generated by api-extractor

## 0.4.3
Wed, 17 Jan 2018 10:49:31 GMT

_Version update only_

## 0.4.2
Fri, 12 Jan 2018 03:35:22 GMT

_Version update only_

## 0.4.1
Thu, 11 Jan 2018 22:31:51 GMT

_Version update only_

## 0.4.0
Wed, 10 Jan 2018 20:40:01 GMT

### Minor changes

- Upgrade to Node 8

## 0.3.26
Tue, 09 Jan 2018 17:05:51 GMT

### Patches

- Get web-build-tools building with pnpm

## 0.3.25
Sun, 07 Jan 2018 05:12:08 GMT

_Version update only_

## 0.3.24
Fri, 05 Jan 2018 20:26:45 GMT

_Version update only_

## 0.3.23
Fri, 05 Jan 2018 00:48:41 GMT

_Version update only_

## 0.3.22
Fri, 22 Dec 2017 17:04:46 GMT

_Version update only_

## 0.3.21
Tue, 12 Dec 2017 03:33:27 GMT

_Version update only_

## 0.3.20
Thu, 30 Nov 2017 23:59:09 GMT

_Version update only_

## 0.3.19
Thu, 30 Nov 2017 23:12:21 GMT

_Version update only_

## 0.3.18
Wed, 29 Nov 2017 17:05:37 GMT

_Version update only_

## 0.3.17
Tue, 28 Nov 2017 23:43:55 GMT

_Version update only_

## 0.3.16
Mon, 13 Nov 2017 17:04:50 GMT

_Version update only_

## 0.3.15
Mon, 06 Nov 2017 17:04:18 GMT

_Version update only_

## 0.3.14
Thu, 02 Nov 2017 16:05:24 GMT

### Patches

- lock the reference version between web build tools projects

## 0.3.13
Wed, 01 Nov 2017 21:06:08 GMT

### Patches

- Upgrade cyclic dependencies

## 0.3.12
Tue, 31 Oct 2017 21:04:04 GMT

_Version update only_

## 0.3.11
Tue, 31 Oct 2017 16:04:55 GMT

_Version update only_

## 0.3.10
Wed, 25 Oct 2017 20:03:59 GMT

_Version update only_

## 0.3.9
Tue, 24 Oct 2017 18:17:12 GMT

_Version update only_

## 0.3.8
Mon, 23 Oct 2017 21:53:12 GMT

### Patches

- Updated cyclic dependencies

## 0.3.7
Fri, 20 Oct 2017 19:57:12 GMT

_Version update only_

## 0.3.6
Fri, 20 Oct 2017 01:52:54 GMT

_Version update only_

## 0.3.5
Fri, 20 Oct 2017 01:04:44 GMT

_Version update only_

## 0.3.4
Fri, 13 Oct 2017 19:02:46 GMT

### Patches

- When FileDiffTest creates a copy of the expected output for comparison, it is now marked as read-only to avoid confusion

## 0.3.3
Thu, 05 Oct 2017 01:05:02 GMT

_Version update only_

## 0.3.2
Fri, 29 Sep 2017 01:03:42 GMT

### Patches

- FileDiffTest now copies the expected file into the same folder as the actual file for easier comparisons

## 0.3.1
Thu, 28 Sep 2017 01:04:28 GMT

_Version update only_

## 0.3.0
Fri, 22 Sep 2017 01:04:02 GMT

### Minor changes

- Upgrade to es6

## 0.2.11
Wed, 20 Sep 2017 22:10:17 GMT

_Version update only_

## 0.2.10
Mon, 11 Sep 2017 13:04:55 GMT

_Version update only_

## 0.2.9
Fri, 08 Sep 2017 13:04:00 GMT

### Patches

- Improve error reporting for JsonFile.validateNoUndefinedMembers()

## 0.2.8
Fri, 08 Sep 2017 01:28:04 GMT

### Patches

- Deprecate @types/es6-coll ections in favor of built-in typescript typings 'es2015.collection' a nd 'es2015.iterable'

## 0.2.7
Thu, 07 Sep 2017 13:04:35 GMT

_Version update only_

## 0.2.6
Thu, 07 Sep 2017 00:11:12 GMT

_Version update only_

## 0.2.5
Wed, 06 Sep 2017 13:03:42 GMT

_Version update only_

## 0.2.4
Tue, 05 Sep 2017 19:03:56 GMT

_Version update only_

## 0.2.3
Sat, 02 Sep 2017 01:04:26 GMT

_Version update only_

## 0.2.2
Thu, 31 Aug 2017 18:41:18 GMT

_Version update only_

## 0.2.1
Thu, 31 Aug 2017 17:46:25 GMT

_Version update only_

## 0.2.0
Wed, 30 Aug 2017 01:04:34 GMT

### Minor changes

- Initial implementation of DiffTest, JsonFile, and PackageJsonLookup

