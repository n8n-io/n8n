# Simple Git

[![NPM version](https://img.shields.io/npm/v/simple-git.svg)](https://www.npmjs.com/package/simple-git)

A lightweight interface for running `git` commands in any [node.js](https://nodejs.org) application.

# Installation

Use your favourite package manager:

-  [npm](https://npmjs.org): `npm install simple-git`
-  [yarn](https://yarnpkg.com/): `yarn add simple-git`

# System Dependencies

Requires [git](https://git-scm.com/downloads) to be installed and that it can be called using the command `git`.

# Usage

Include into your JavaScript app using common js:

```javascript
// require the library, main export is a function
const simpleGit = require('simple-git');
simpleGit().clean(simpleGit.CleanOptions.FORCE);

// or use named properties
const { simpleGit, CleanOptions } = require('simple-git');
simpleGit().clean(CleanOptions.FORCE);
```

Include into your JavaScript app as an ES Module:

```javascript
import { simpleGit, CleanOptions } from 'simple-git';

simpleGit().clean(CleanOptions.FORCE);
```

Include in a TypeScript app using the bundled type definitions:

```typescript
import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';

const git: SimpleGit = simpleGit().clean(CleanOptions.FORCE);
```

## Configuration

Configure each `simple-git` instance with a properties object passed to the main `simpleGit` function:

```typescript
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

const options: Partial<SimpleGitOptions> = {
   baseDir: process.cwd(),
   binary: 'git',
   maxConcurrentProcesses: 6,
   trimmed: false,
};

// when setting all options in a single object
const git: SimpleGit = simpleGit(options);

// or split out the baseDir, supported for backward compatibility
const git: SimpleGit = simpleGit('/some/path', { binary: 'git' });
```

The first argument can be either a string (representing the working directory for `git` commands to run in),
`SimpleGitOptions` object or `undefined`, the second parameter is an optional `SimpleGitOptions` object.

All configuration properties are optional, the default values are shown in the example above.

## Per-command Configuration

To prefix the commands run by `simple-git` with custom configuration not saved in the git config (ie: using the
`-c` command) supply a `config` option to the instance builder:

```typescript
// configure the instance with a custom configuration property
const git: SimpleGit = simpleGit('/some/path', { config: ['http.proxy=someproxy'] });

// any command executed will be prefixed with this config
// runs: git -c http.proxy=someproxy pull
await git.pull();
```

## Configuring Plugins

- [AbortController](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-ABORT-CONTROLLER.md)
   Terminate pending and future tasks in a `simple-git` instance (requires node >= 16).

- [Custom Binary](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-CUSTOM-BINARY.md)
   Customise the `git` binary `simple-git` uses when spawning `git` child processes. 

- [Completion Detection](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-COMPLETION-DETECTION.md)
   Customise how `simple-git` detects the end of a `git` process.

- [Error Detection](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-ERRORS.md)
   Customise the detection of errors from the underlying `git` process.

- [Progress Events](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-PROGRESS-EVENTS.md)
   Receive progress events as `git` works through long-running processes.

- [Spawned Process Ownership](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-SPAWN-OPTIONS.md)
   Configure the system `uid` / `gid` to use for spawned `git` processes.

- [Timeout](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-TIMEOUT.md)
   Automatically kill the wrapped `git` process after a rolling timeout.

- [Unsafe](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-UNSAFE-ACTIONS.md)
   Selectively opt out of `simple-git` safety precautions - for advanced users and use cases.

## Using Task Promises

Each task in the API returns the `simpleGit` instance for chaining together multiple tasks, and each
step in the chain is also a `Promise` that can be `await` ed in an `async` function or returned in a
`Promise` chain.

```javascript
const git = simpleGit();

// chain together tasks to await final result
await git.init().addRemote('origin', '...remote.git');

// or await each step individually
await git.init();
await git.addRemote('origin', '...remote.git');
```

### Catching errors in async code

To catch errors in async code, either wrap the whole chain in a try/catch:

```javascript
const git = simpleGit();
try {
   await git.init();
   await git.addRemote(name, repoUrl);
} catch (e) {
   /* handle all errors here */
}
```

or catch individual steps to permit the main chain to carry on executing rather than
jumping to the final `catch` on the first error:

```javascript
const git = simpleGit();
try {
   await git.init().catch(ignoreError);
   await git.addRemote(name, repoUrl);
} catch (e) {
   /* handle all errors here */
}

function ignoreError() {}
```

## Using Task Callbacks

In addition to returning a promise, each method can also be called with a trailing callback argument
to handle the result of the task.

```javascript
const git = simpleGit();
git.init(onInit).addRemote('origin', 'git@github.com:steveukx/git-js.git', onRemoteAdd);

function onInit(err, initResult) {}
function onRemoteAdd(err, addRemoteResult) {}
```

If any of the steps in the chain result in an error, all pending steps will be cancelled, see the
[parallel tasks](<(#concurrent--parallel-requests)>) section for more information on how to run tasks in parallel rather than in series .

## Task Responses

Whether using a trailing callback or a Promise, tasks either return the raw `string` or `Buffer` response from the
`git` binary, or where possible a parsed interpretation of the response.

For type details of the response for each of the tasks, please see the [TypeScript definitions](https://github.com/steveukx/git-js/blob/main/simple-git/typings/simple-git.d.ts).

# Upgrading from Version 2

From v3 of `simple-git` you can now import as an ES module, Common JS module or as TypeScript with bundled type
definitions. Upgrading from v2 will be seamless for any application not relying on APIs that were marked as deprecated
in v2 (deprecation notices were logged to `stdout` as `console.warn` in v2).

# API

| API                                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------- |------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `.add([fileA, ...], handlerFn)`                      | adds one or more files to be under source control                                                                                                                                                                                                                                                                                                                                                                            |
| `.addAnnotatedTag(tagName, tagMessage, handlerFn)`   | adds an annotated tag to the head of the current branch                                                                                                                                                                                                                                                                                                                                                                      |
| `.addTag(name, handlerFn)`                           | adds a lightweight tag to the head of the current branch                                                                                                                                                                                                                                                                                                                                                                     |
| `.catFile(options, [handlerFn])`                     | generate `cat-file` detail, `options` should be an array of strings as supported arguments to the [cat-file](https://git-scm.com/docs/git-cat-file) command                                                                                                                                                                                                                                                                  |
| `.checkIgnore([filepath, ...], handlerFn)`           | checks if filepath excluded by .gitignore rules                                                                                                                                                                                                                                                                                                                                                                              |
| `.commit(message, handlerFn)`                        | commits changes in the current working directory with the supplied message where the message can be either a single string or array of strings to be passed as separate arguments (the `git` command line interface converts these to be separated by double line breaks)                                                                                                                                                    |
| `.commit(message, [fileA, ...], options, handlerFn)` | commits changes on the named files with the supplied message, when supplied, the optional options object can contain any other parameters to pass to the commit command, setting the value of the property to be a string will add `name=value` to the command string, setting any other type of value will result in just the key from the object being passed (ie: just `name`), an example of setting the author is below |
| `.customBinary(gitPath)`                             | sets the command to use to reference git, allows for using a git binary not available on the path environment variable [docs](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-CUSTOM-BINARY.md)                                                                                                                                                                                                                     |
| `.env(name, value)`                                  | Set environment variables to be passed to the spawned child processes, [see usage in detail below](#environment-variables).                                                                                                                                                                                                                                                                                                  |
| `.exec(handlerFn)`                                   | calls a simple function in the current step                                                                                                                                                                                                                                                                                                                                                                                  |
| `.fetch([options, ] handlerFn)`                      | update the local working copy database with changes from the default remote repo and branch, when supplied the options argument can be a standard [options object](#how-to-specify-options) either an array of string commands as supported by the [git fetch](https://git-scm.com/docs/git-fetch).                                                                                                                          |
| `.fetch(remote, branch, handlerFn)`                  | update the local working copy database with changes from a remote repo                                                                                                                                                                                                                                                                                                                                                       |
| `.fetch(handlerFn)`                                  | update the local working copy database with changes from the default remote repo and branch                                                                                                                                                                                                                                                                                                                                  |
| `.outputHandler(handlerFn)`                          | attaches a handler that will be called with the name of the command being run and the `stdout` and `stderr` [readable streams](https://nodejs.org/api/stream.html#stream_class_stream_readable) created by the [child process](https://nodejs.org/api/child_process.html#child_process_class_childprocess) running that command, see [examples](https://github.com/steveukx/git-js/blob/main/examples/git-output-handler.md) |
| `.raw(args, [handlerFn])`                            | Execute any arbitrary array of commands supported by the underlying git binary. When the git process returns a non-zero signal on exit and it printed something to `stderr`, the command will be treated as an error, otherwise treated as a success.                                                                                                                                                                        |
| `.rebase([options,] handlerFn)`                      | Rebases the repo, `options` should be supplied as an array of string parameters supported by the [git rebase](https://git-scm.com/docs/git-rebase) command, or an object of options (see details below for option formats).                                                                                                                                                                                                  |
| `.revert(commit , [options , [handlerFn]])`          | reverts one or more commits in the working copy. The commit can be any regular commit-ish value (hash, name or offset such as `HEAD~2`) or a range of commits (eg: `master~5..master~2`). When supplied the [options](#how-to-specify-options) argument contain any options accepted by [git-revert](https://git-scm.com/docs/git-revert).                                                                                   |
| `.rm([fileA, ...], handlerFn)`                       | removes any number of files from source control                                                                                                                                                                                                                                                                                                                                                                              |
| `.rmKeepLocal([fileA, ...], handlerFn)`              | removes files from source control but leaves them on disk                                                                                                                                                                                                                                                                                                                                                                    |
| `.tag(args[], handlerFn)`                            | Runs any supported [git tag](https://git-scm.com/docs/git-tag) commands with arguments passed as an array of strings .                                                                                                                                                                                                                                                                                                       |
| `.tags([options, ] handlerFn)`                       | list all tags, use the optional [options](#how-to-specify-options) object to set any options allows by the [git tag](https://git-scm.com/docs/git-tag) command. Tags will be sorted by semantic version number by default, for git versions 2.7 and above, use the `--sort` option to set a custom sort.                                                                                                                     |

## git apply

-  `.applyPatch(patch, [options])` applies a single string patch (as generated by `git diff`), optionally configured with the supplied [options](#how-to-specify-options) to set any arguments supported by the [apply](https://git-scm.com/docs/git-apply) command. Returns the unmodified string response from `stdout` of the `git` binary.
-  `.applyPatch(patches, [options])` applies an array of string patches (as generated by `git diff`), optionally configured with the supplied [options](#how-to-specify-options) to set any arguments supported by the [apply](https://git-scm.com/docs/git-apply) command. Returns the unmodified string response from `stdout` of the `git` binary.

## git branch

-  `.branch([options])` uses the supplied [options](#how-to-specify-options) to run any arguments supported by the [branch](https://git-scm.com/docs/git-branch) command. Either returns a [BranchSummaryResult](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/responses/BranchSummary.ts) instance when listing branches, or a [BranchSingleDeleteResult](https://github.com/steveukx/git-js/blob/main/simple-git/typings/response.d.ts) type object when the options included `-d`, `-D` or `--delete` which cause it to delete a named branch rather than list existing branches.
-  `.branchLocal()` gets a list of local branches as a [BranchSummaryResult](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/responses/BranchSummary.ts) instance
-  `.deleteLocalBranch(branchName)` deletes a local branch - treats a failed attempt as an error
-  `.deleteLocalBranch(branchName, forceDelete)` deletes a local branch, optionally explicitly setting forceDelete to true - treats a failed attempt as an error
-  `.deleteLocalBranches(branchNames)` deletes multiple local branches
-  `.deleteLocalBranches(branchNames, forceDelete)` deletes multiple local branches, optionally explicitly setting forceDelete to true

## git clean

-  `.clean(mode)` clean the working tree. Mode should be "n" - dry run or "f" - force
-  `.clean(cleanSwitches [,options])` set `cleanSwitches` to a string containing any number of the supported single character options, optionally with a standard [options](#how-to-specify-options) object

## git checkout

-  `.checkout(checkoutWhat , [options])` - checks out the supplied tag, revision or branch when supplied as a string,
   additional arguments supported by [git checkout](https://git-scm.com/docs/git-checkout) can be supplied as an
   [options](#how-to-specify-options) object/array.

-  `.checkout(options)` - check out a tag or revision using the supplied [options](#how-to-specify-options)

-  `.checkoutBranch(branchName, startPoint)` - checks out a new branch from the supplied start point.

-  `.checkoutLocalBranch(branchName)` - checks out a new local branch

## git clone

-  `.clone(repoPath, [localPath, [options]])` clone a remote repo at `repoPath` to a local directory at `localPath`, optionally with a standard [options](#how-to-specify-options) object of additional arguments to include between `git clone` and the trailing `repo local` arguments
-  `.clone(repoPath, [options])` clone a remote repo at `repoPath` to a directory in the current working directory with the same name as the repo

-  `mirror(repoPath, [localPath, [options]])` behaves the same as the `.clone` interface with the [`--mirror` flag](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---mirror) enabled.

## git config

-  `.addConfig(key, value, append = false, scope = 'local')` add a local configuration property, when `append` is set to
   `true` the configuration setting is appended to rather than overwritten in the local config. Use the `scope` argument
   to pick where to save the new configuration setting (use the exported `GitConfigScope` enum, or equivalent string
   values - `worktree | local | global | system`).
-  `.getConfig(key)` get the value(s) for a named key as a [ConfigGetResult](https://github.com/steveukx/git-js/blob/main/simple-git/typings/response.d.ts)
-  `.getConfig(key, scope)` get the value(s) for a named key as a [ConfigGetResult](https://github.com/steveukx/git-js/blob/main/simple-git/typings/response.d.ts) but limit the
   scope of the properties searched to a single specified scope (use the exported `GitConfigScope` enum, or equivalent
   string values - `worktree | local | global | system`)

-  `.listConfig()` reads the current configuration and returns a [ConfigListSummary](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/responses/ConfigList.ts)
-  `.listConfig(scope: GitConfigScope)` as with `listConfig` but returns only those items in a specified scope (note that configuration values are overlaid on top of each other to build the config `git` will actually use - to resolve the configuration you are using use `(await listConfig()).all` without the scope argument)

## git count-objects

- `.countObjects()` queries the pack and disk usage properties of the local repository and returns a [CountObjectsResult](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/tasks/count-objects.ts). All disk sizes are reported in Kb, see https://git-scm.com/docs/git-count-objects for full description of properties.

## git diff

-  `.diff([ options ])` get the diff of the current repo compared to the last commit, optionally including
   any number of other arguments supported by [git diff](https://git-scm.com/docs/git-diff) supplied as an
   [options](#how-to-specify-options) object/array. Returns the raw `diff` output as a string.

-  `.diffSummary([ options ])` creates a [DiffResult](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/responses/DiffSummary.ts)
   to summarise the diff for files in the repo. Uses the `--stat` format by default which can be overridden
   by passing in any of the log format commands (eg: `--numstat` or `--name-stat`) as part of the optional
   [options](#how-to-specify-options) object/array.

## git grep [examples](https://github.com/steveukx/git-js/blob/main/examples/git-grep.md)

-  `.grep(searchTerm)` searches for a single search term across all files in the working tree, optionally passing a standard [options](#how-to-specify-options) object of additional arguments
-  `.grep(grepQueryBuilder(...))` use the `grepQueryBuilder` to create a complex query to search for, optionally passing a standard [options](#how-to-specify-options) object of additional arguments

## git hash-object

-  `.hashObject(filePath, write = false)` computes the object ID value for the contents of the named file (which can be
   outside of the work tree), optionally writing the resulting value to the object database.

## git init

-  `.init(bare , [options])` initialize a repository using the boolean `bare` parameter to intialise a bare repository.
   Any number of other arguments supported by [git init](https://git-scm.com/docs/git-init) can be supplied as an
   [options](#how-to-specify-options) object/array.

-  `.init([options])` initialize a repository using any arguments supported by
   [git init](https://git-scm.com/docs/git-init) supplied as an [options](#how-to-specify-options) object/array.

## git log

-  `.log([options])` list commits between `options.from` and `options.to` tags or branch (if not specified will
   show all history). Use the `options` object to set any [options](#how-to-specify-options) supported by the
   [git log](https://git-scm.com/docs/git-log) command or any of the following:

   -  `options.file` - the path to a file in your repository to only consider this path.
   -  `options.format` - custom log format object, keys are the property names used on the returned object, values are the format string from [pretty formats](https://git-scm.com/docs/pretty-formats#Documentation/pretty-formats.txt)
   -  `options.from` - sets the oldest commit in the range to return, use along with `options.to` to set a bounded range
   -  `options.mailMap` - defaults to true, enables the use of [mail map](https://git-scm.com/docs/gitmailmap) in returned values for email and name from the default format
   -  `options.maxCount` - equivalent to setting the `--max-count` option
   -  `options.multiLine` - enables multiline body values in the default format (disabled by default)
   -  `options.splitter` - the character sequence to use as a delimiter between fields in the log, should be a value that doesn't appear in any log message (defaults to `ò`)
   -  `options.strictDate` - switches the authored date value from an ISO 8601-like format to be strict ISO 8601 format
   -  `options.symmetric` - defaults to true, enables [symmetric revision range](https://git-scm.com/docs/gitrevisions#_dotted_range_notations) rather than a two-dot range
   -  `options.to` - sets the newset commit in the range to return, use along with `options.from` to set a bounded range
   
   When only one of `options.from` and `options.to` is supplied, the default value of the omitted option is equivalent to `HEAD`. For any other commit, explicitly supply both from and to commits (for example use `await git.firstCommit()` as the default value of `from` to log since the first commit of the repo). 

## git merge

-  `.merge(options)` runs a merge using any configuration [options](#how-to-specify-options) supported
   by [git merge](https://git-scm.com/docs/git-merge).
   Conflicts during the merge result in an error response, the response is an instance of
   [MergeSummary](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/responses/MergeSummary.ts) whether it was an error or success.
   When successful, the MergeSummary has all detail from a the [PullSummary](https://github.com/steveukx/git-js/blob/main/simple-git/src/lib/responses/PullSummary.ts)
   along with summary detail for the merge.
   When the merge failed, the MergeSummary contains summary detail for why the merge failed and which files
   prevented the merge.

-  `.mergeFromTo(remote, branch , [options])` - merge from the specified branch into the currently checked out branch,
   similar to `.merge` but with the `remote` and `branch` supplied as strings separately to any additional
   [options](#how-to-specify-options).

## git mv

-  `.mv(from, to)` rename or move a single file at `from` to `to`

-  `.mv(from, to)` move all files in the `from` array to the `to` directory

## git pull

-  `.pull([options])` pulls all updates from the default tracked remote, any arguments supported by
   [git pull](https://git-scm.com/docs/git-pull) can be supplied as an [options](#how-to-specify-options) object/array.

-  `.pull(remote, branch, [options])` pulls all updates from the specified remote branch (eg 'origin'/'master') along
   with any custom [options](#how-to-specify-options) object/array

## git push

-  `.push([options])` pushes to a named remote/branch using any supported [options](#how-to-specify-options)
   from the [git push](https://git-scm.com/docs/git-push) command. Note that `simple-git` enforces the use of
   `--verbose --porcelain` options in order to parse the response. You don't need to supply these options.

-  `.push(remote, branch, [options])` pushes to a named remote/branch, supports additional
   [options](#how-to-specify-options) from the [git push](https://git-scm.com/docs/git-push) command.

-  `.pushTags(remote, [options])` pushes local tags to a named remote (equivalent to using `.push([remote, '--tags'])`)

## git remote

-  `.addRemote(name, repo, [options])` adds a new named remote to be tracked as `name` at the path `repo`, optionally with any supported [options](#how-to-specify-options) for the [git add](https://git-scm.com/docs/git-remote#Documentation/git-remote.txt-emaddem) call.
-  `.getRemotes([verbose])` gets a list of the named remotes, supply the optional `verbose` option as `true` to include the URLs and purpose of each ref
-  `.listRemote([options])` lists remote repositories - there are so many optional arguments in the underlying `git ls-remote` call, just supply any you want to use as the optional [options](#how-to-specify-options) eg: `git.listRemote(['--heads', '--tags'], console.log)`
-  `.remote([options])` runs a `git remote` command with any number of [options](#how-to-specify-options)
-  `.removeRemote(name)` removes the named remote

## git reset

-  `.reset(resetMode, [resetOptions])` resets the repository, sets the reset mode to one of the supported types (use a constant from
   the exported `ResetMode` enum, or a string equivalent: `mixed`, `soft`, `hard`, `merge`, `keep`). Any number of other arguments
   supported by [git reset](https://git-scm.com/docs/git-reset) can be supplied as an [options](#how-to-specify-options) object/array.

-  `.reset(resetOptions)` resets the repository with the supplied [options](#how-to-specify-options)

-  `.reset()` resets the repository in `soft` mode.

## git rev-parse / repo properties

-  `.revparse([options])` sends the supplied [options](#how-to-specify-options) to [git rev-parse](https://git-scm.com/docs/git-rev-parse) and returns the string response from `git`.

-  `.checkIsRepo()` gets whether the current working directory is a descendent of a git repository.
-  `.checkIsRepo('bare')` gets whether the current working directory is within a bare git repo (see either [git clone --bare](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---bare) or [git init --bare](https://git-scm.com/docs/git-init#Documentation/git-init.txt---bare)).
-  `.checkIsRepo('root')` gets whether the current working directory is the root directory for a repo (sub-directories will return false).

-  `.firstCommit()` gets the commit hash of the first commit made to the current repo.

## git show

- `.show(options)` show various types of objects for example the file content at a certain commit. `options` is the single value string or any [options](#how-to-specify-options) supported by the [git show](https://git-scm.com/docs/git-show) command.
- `.showBuffer(options)` same as the `.show` API, but returns the Buffer content directly to allow for showing binary file content.

## git status

-  `.status([options])` gets the status of the current repo, resulting in a [StatusResult](https://github.com/steveukx/git-js/blob/main/simple-git/typings/response.d.ts). Additional arguments
   supported by [git status](https://git-scm.com/docs/git-status) can be supplied as an [options](#how-to-specify-options) object/array.

## git submodule

-  `.subModule(options)` Run a `git submodule` command with on or more arguments passed in as an [options](#how-to-specify-options) array or object
-  `.submoduleAdd(repo, path)` Adds a new sub module
-  `.submoduleInit([options]` Initialises sub modules, the optional [options](#how-to-specify-options) argument can be used to pass extra options to the `git submodule init` command.
-  `.submoduleUpdate(subModuleName, [options])` Updates sub modules, can be called with a sub module name and [options](#how-to-specify-options), just the options or with no arguments

## git stash

- `.stash([ options ])` Stash the working directory, optional first argument can be an array of string arguments or [options](#how-to-specify-options) object to pass to the [git stash](https://git-scm.com/docs/git-stash) command.

- `.stashList([ options ])` Retrieves the stash list, optional first argument can be an object in the same format as used in [git log](#git-log).

## git version [examples](https://github.com/steveukx/git-js/blob/main/examples/git-version.md)

- `.version()` retrieve the major, minor and patch for the currently installed `git`. Use the `.installed` property of the result to determine whether `git` is accessible on the path.

## changing the working directory [examples](https://github.com/steveukx/git-js/blob/main/examples/git-change-working-directory.md)

-  `.cwd(workingDirectory)` Sets the working directory for all future commands - note, this will change the working for the root instance, any chain created from the root will also be changed.
-  `.cwd({ path, root = false })` Sets the working directory for all future commands either in the current chain of commands (where `root` is omitted or set to `false`) or in the main instance (where `root` is `true`).

## How to Specify Options

Where the task accepts custom options (eg: `pull` or `commit`), these can be supplied as an object, the keys of which
will all be merged as trailing arguments in the command string, or as a simple array of strings.

### Options as an Object

When the value of the property in the options object is a `string`, that name value
pair will be included in the command string as `name=value`. For example:

```javascript
// results in 'git pull origin master --no-rebase'
git.pull('origin', 'master', { '--no-rebase': null });

// results in 'git pull origin master --rebase=true'
git.pull('origin', 'master', { '--rebase': 'true' });
```

When the value of the property is an array of `string`s or `number`s, each element will be 
included as separate `name=value` pairs:

```javascript
// results in 'git log --grep=bug --grep=fix --grep=feature'
git.log({ '--grep': ['bug', 'fix', 'feature'] });
```

### Options as an Array

Options can also be supplied as an array of strings to be merged into the task's commands
in the same way as when an object is used:

```javascript
// results in 'git pull origin master --no-rebase'
git.pull('origin', 'master', ['--no-rebase']);
```

# Release History

Major release 3.x changes the packaging of the library, making it consumable as a CommonJS module, ES module as well as
with TypeScript (see [usage](#usage) above). The library is now published as a single file, so please ensure your
application hasn't been making use of non-documented APIs by importing from a sub-directory path.

See also:

- [release notes v3](https://github.com/steveukx/git-js/blob/main/simple-git/CHANGELOG.md)
- [release notes v2](https://github.com/steveukx/git-js/blob/main/docs/RELEASE-NOTES-V2.md)

# Concurrent / Parallel Requests

When the methods of `simple-git` are chained together, they create an execution chain that will run in series, useful
for when the tasks themselves are order-dependent, eg:

```typescript
simpleGit().init().addRemote('origin', 'https://some-repo.git').fetch();
```

Each task requires that the one before it has been run successfully before it is called, any errors in a
step of the chain should prevent later steps from being attempted.

When the methods of `simple-git` are called on the root instance (ie: `git = simpleGit()`) rather than chained
off another task, it starts a new chain and will not be affected failures in tasks already being run. Useful
for when the tasks are independent of each other, eg:

```typescript
const git = simpleGit();
const results = await Promise.all([
   git.raw('rev-parse', '--show-cdup').catch(swallow),
   git.raw('rev-parse', '--show-prefix').catch(swallow),
]);
function swallow(err) {
   return null;
}
```

Each `simple-git` instance limits the number of spawned child processes that can be run simultaneously and
manages the queue of pending tasks for you. Configure this value by passing an options object to the
`simpleGit` function, eg:

```typescript
const git = simpleGit({ maxConcurrentProcesses: 10 });
```

Treating tasks called on the root instance as the start of separate chains is a change to the behaviour of
`simple-git` and was added in version `2.11.0`.

# Complex Requests

When no suitable wrapper exists in the interface for creating a request, run the command directly
using `git.raw([...], handler)`. The array of commands are passed directly to the `git` binary:

```javascript
const path = '/path/to/repo';
const commands = ['config', '--global', 'advice.pushNonFastForward', 'false'];

// using an array of commands and node-style callback
simpleGit(path).raw(commands, (err, result) => {
   // err is null unless this command failed
   // result is the raw output of this command
});

// using a var-args of strings and awaiting rather than using the callback
const result = await simpleGit(path).raw(...commands);

// automatically trim trailing white-space in responses
const result = await simpleGit(path, { trimmed: true }).raw(...commands);
```

# Authentication

The easiest way to supply a username / password to the remote host is to include it in the URL, for example:

```javascript
const USER = 'something';
const PASS = 'somewhere';
const REPO = 'github.com/username/private-repo';

const remote = `https://${USER}:${PASS}@${REPO}`;

simpleGit()
   .clone(remote)
   .then(() => console.log('finished'))
   .catch((err) => console.error('failed: ', err));
```

Be sure to not enable debug logging when using this mechanism for authentication
to ensure passwords aren't logged to stdout.

# Environment Variables

Pass one or more environment variables to the child processes spawned by `simple-git` with the `.env` method which
supports passing either an object of name=value pairs or setting a single variable at a time:

```javascript
const GIT_SSH_COMMAND = 'ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no';

simpleGit()
   .env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)
   .status((err, status) => {
      /*  */
   });

simpleGit()
   .env({ ...process.env, GIT_SSH_COMMAND })
   .status()
   .then((status) => {})
   .catch((err) => {});
```

Note - when passing environment variables into the child process, these will replace the standard `process.env`
variables, the example above creates a new object based on `process.env` but with the `GIT_SSH_COMMAND` property added.

# Exception Handling

When the `git` process exits with a non-zero status (or in some cases like `merge` the git process exits with a
successful zero code but there are conflicts in the merge) the task will reject with a `GitError` when there is no
available parser to handle the error or a
`GitResponseError` for when there is.

See the `err` property of the callback:

```javascript
git.merge((err, mergeSummary) => {
   if (err.git) {
      mergeSummary = err.git; // the failed mergeSummary
   }
});
```

Catch errors with try/catch in async code:

```javascript
try {
   const mergeSummary = await git.merge();
   console.log(`Merged ${mergeSummary.merges.length} files`);
} catch (err) {
   // err.message - the string summary of the error
   // err.stack - some stack trace detail
   // err.git - where a parser was able to run, this is the parsed content

   console.error(`Merge resulted in ${err.git.conflicts.length} conflicts`);
}
```

Catch errors with a `.catch` on the promise:

```javascript
const mergeSummary = await git.merge().catch((err) => {
   if (err.git) {
      return err.git;
   } // the unsuccessful mergeSummary
   throw err; // some other error, so throw
});

if (mergeSummary.failed) {
   console.error(`Merge resulted in ${mergeSummary.conflicts.length} conflicts`);
}
```

With typed errors available in TypeScript

```typescript
import { simpleGit, MergeSummary, GitResponseError } from 'simple-git';
try {
   const mergeSummary = await simpleGit().merge();
   console.log(`Merged ${mergeSummary.merges.length} files`);
} catch (err) {
   // err.message - the string summary of the error
   // err.stack - some stack trace detail
   // err.git - where a parser was able to run, this is the parsed content
   const mergeSummary: MergeSummary = (err as GitResponseError<MergeSummary>).git;
   const conflicts = mergeSummary?.conflicts || [];

   console.error(`Merge resulted in ${conflicts.length} conflicts`);
}
```

# Troubleshooting / FAQ

### Enable logging

See the [debug logging guide](https://github.com/steveukx/git-js/blob/main/docs/DEBUG-LOGGING-GUIDE.md) for logging examples and how to
make use of the [debug](https://www.npmjs.com/package/debug) library's programmatic interface
in your application.

### Enable Verbose Logging

See the [debug logging guide](https://github.com/steveukx/git-js/blob/main/docs/DEBUG-LOGGING-GUIDE.md#verbose-logging-options) for
the full list of verbose logging options to use with the
[debug](https://www.npmjs.com/package/debug) library.

### Every command returns ENOENT error message

There are a few potential reasons:

-  `git` isn't available as a binary for the user running the main `node` process, custom paths to the binary can be used
   with the `.customBinary(...)` API option.

-  the working directory passed in to the main `simple-git` function isn't accessible, check it is read/write accessible
   by the user running the `node` process. This library uses
   [@kwsites/file-exists](https://www.npmjs.com/package/@kwsites/file-exists) to validate the working directory exists,
   to output its logs add `@kwsites/file-exists` to your `DEBUG` environment variable. eg:

   `DEBUG=@kwsites/file-exists,simple-git node ./your-app.js`

### Log format fails

The properties of `git log` are fetched using the `--pretty=format` argument which supports different tokens depending
on the version of `git` - for example the `%D` token used to show the refs was added in git `2.2.3`, for any version
before that please ensure you are supplying your own format object with properties supported by the version of git you
are using.

For more details of the supported tokens, please see the
[official `git log` documentation](https://git-scm.com/docs/git-log#_pretty_formats)

### Log response properties are out of order

The properties of `git.log` are fetched using the character sequence `ò` as a delimiter. If your commit messages
use this sequence, supply a custom `splitter` in the options, for example: `git.log({ splitter: '💻' })`

### Pull / Diff / Merge summary responses don't recognise any files

-  Enable verbose logs with the environment variable `DEBUG=simple-git:task:*,simple-git:output:*`
-  Check the output (for example: `simple-git:output:diff:1 [stdOut] 1 file changed, 1 insertion(+)`)
-  Check the `stdOut` output is the same as you would expect to see when running the command directly in terminal
-  Check the language used in the response is english locale

In some cases `git` will show progress messages or additional detail on error states in the output for
`stdErr` that will help debug your issue, these messages are also included in the verbose log.

### Legacy Node Versions

From `v3.x`, `simple-git` will drop support for `node.js` version 10 or below, to use in a lower version of node will
result in errors such as:

-  `Object.fromEntries is not a function`
-  `Object.entries is not a function`
-  `message.flatMap is not a function`

To resolve these issues, either upgrade to a newer version of node.js or ensure you are using the necessary polyfills
from `core-js` - see [Legacy Node Versions](https://github.com/steveukx/git-js/blob/main/docs/LEGACY_NODE_VERSIONS.md).

# Examples

### using a pathspec to limit the scope of the task

If the `simple-git` API doesn't explicitly limit the scope of the task being run (ie: `git.add()` requires the files to
be added, but `git.status()` will run against the entire repo), add a `pathspec` to the command using trailing options:

```typescript
import { simpleGit, pathspec } from "simple-git";

const git = simpleGit();
const wholeRepoStatus = await git.status();
const subDirStatusUsingOptArray = await git.status([pathspec('sub-dir')]);
const subDirStatusUsingOptObject = await git.status({ 'sub-dir': pathspec('sub-dir') });
```

### async await

```javascript
async function status(workingDir) {
   let statusSummary = null;
   try {
      statusSummary = await simpleGit(workingDir).status();
   } catch (e) {
      // handle the error
   }

   return statusSummary;
}

// using the async function
status(__dirname + '/some-repo').then((status) => console.log(status));
```

### Initialise a git repo if necessary

```javascript
const git = simpleGit(__dirname);

git.checkIsRepo()
   .then((isRepo) => !isRepo && initialiseRepo(git))
   .then(() => git.fetch());

function initialiseRepo(git) {
   return git.init().then(() => git.addRemote('origin', 'https://some.git.repo'));
}
```

### Update repo and get a list of tags

```javascript
simpleGit(__dirname + '/some-repo')
   .pull()
   .tags((err, tags) => console.log('Latest available tag: %s', tags.latest));

// update repo and when there are changes, restart the app
simpleGit().pull((err, update) => {
   if (update && update.summary.changes) {
      require('child_process').exec('npm restart');
   }
});
```

### Starting a new repo

```javascript
simpleGit()
   .init()
   .add('./*')
   .commit('first commit!')
   .addRemote('origin', 'https://github.com/user/repo.git')
   .push('origin', 'master');
```

### push with `-u`

```javascript
simpleGit()
   .add('./*')
   .commit('first commit!')
   .addRemote('origin', 'some-repo-url')
   .push(['-u', 'origin', 'master'], () => console.log('done'));
```

### Piping to the console for long-running tasks

See [progress events](https://github.com/steveukx/git-js/blob/main/docs/PLUGIN-PROGRESS-EVENTS.md) for more details on
logging progress updates.

```javascript
const git = simpleGit({
   progress({ method, stage, progress }) {
      console.log(`git.${method} ${stage} stage ${progress}% complete`);
   },
});
git.checkout('https://github.com/user/repo.git');
```

### Update repo and print messages when there are changes, restart the app

```javascript
// when using a chain
simpleGit()
   .exec(() => console.log('Starting pull...'))
   .pull((err, update) => {
      if (update && update.summary.changes) {
         require('child_process').exec('npm restart');
      }
   })
   .exec(() => console.log('pull done.'));

// when using async and optional chaining
const git = simpleGit();
console.log('Starting pull...');
if ((await git.pull())?.summary.changes) {
   require('child_process').exec('npm restart');
}
console.log('pull done.');
```

### Get a full commits list, and then only between 0.11.0 and 0.12.0 tags

```javascript
console.log(await simpleGit().log());
console.log(await simpleGit().log('0.11.0', '0.12.0'));
```

### Set the local configuration for author, then author for an individual commit

```javascript
simpleGit()
   .addConfig('user.name', 'Some One')
   .addConfig('user.email', 'some@one.com')
   .commit('committed as "Some One"', 'file-one')
   .commit('committed as "Another Person"', 'file-two', {
      '--author': '"Another Person <another@person.com>"',
   });
```

### Get remote repositories

```javascript
simpleGit().listRemote(['--get-url'], (err, data) => {
   if (!err) {
      console.log('Remote url for repository at ' + __dirname + ':');
      console.log(data);
   }
});
```
