import * as resp from './response';
import * as types from './types';
import { GitError } from './errors';

export interface SimpleGitFactory {
   (baseDir?: string, options?: Partial<types.SimpleGitOptions>): SimpleGit;

   (baseDir: string): SimpleGit;

   (options: Partial<types.SimpleGitOptions>): SimpleGit;
}

export type Response<T> = SimpleGit & Promise<T>;

export interface SimpleGitBase {
   /**
    * Adds one or more files to source control
    */
   add(files: string | string[], callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Sets the working directory of the subsequent commands.
    */
   cwd(
      directory: { path: string; root?: boolean },
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   cwd<path extends string>(
      directory: path,
      callback?: types.SimpleGitTaskCallback<path>
   ): Response<path>;

   /**
    * Compute object ID from a file
    */
   hashObject(path: string, callback?: types.SimpleGitTaskCallback): Response<string>;

   hashObject(
      path: string,
      write?: boolean,
      callback?: types.SimpleGitTaskCallback
   ): Response<string>;

   /**
    * Initialize a git repo
    */
   init(
      bare: boolean,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.InitResult>
   ): Response<resp.InitResult>;

   init(
      bare: boolean,
      callback?: types.SimpleGitTaskCallback<resp.InitResult>
   ): Response<resp.InitResult>;

   init(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.InitResult>
   ): Response<resp.InitResult>;

   init(callback?: types.SimpleGitTaskCallback<resp.InitResult>): Response<resp.InitResult>;

   /**
    * Runs a merge, `options` can be either an array of arguments
    * supported by the [`git merge`](https://git-scm.com/docs/git-merge)
    * or an options object.
    *
    * Conflicts during the merge result in an error response,
    * the response type whether it was an error or success will be a MergeSummary instance.
    * When successful, the MergeSummary has all detail from a the PullSummary
    *
    * @see https://github.com/steveukx/git-js/blob/master/src/responses/MergeSummary.js
    * @see https://github.com/steveukx/git-js/blob/master/src/responses/PullSummary.js
    */
   merge(
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.MergeResult>
   ): Response<resp.MergeResult>;

   /**
    * Merges from one branch to another, equivalent to running `git merge ${remote} ${branch}`, the `options` argument can
    * either be an array of additional parameters to pass to the command or null / omitted to be ignored.
    */
   mergeFromTo<E extends GitError>(
      remote: string,
      branch: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.MergeResult, E>
   ): Response<resp.MergeResult>;

   mergeFromTo<E extends GitError>(
      remote: string,
      branch: string,
      callback?: types.SimpleGitTaskCallback<resp.MergeResult, E>
   ): Response<resp.MergeResult>;

   /**
    * Sets a handler function to be called whenever a new child process is created, the handler function will be called
    * with the name of the command being run and the stdout & stderr streams used by the ChildProcess.
    *
    * @example
    * require('simple-git')
    *    .outputHandler(function (command, stdout, stderr) {
    *       stdout.pipe(process.stdout);
    *    })
    *    .checkout('https://github.com/user/repo.git');
    *
    * @see https://nodejs.org/api/child_process.html#child_process_class_childprocess
    * @see https://nodejs.org/api/stream.html#stream_class_stream_readable
    */
   outputHandler(handler: types.outputHandler | void): this;

   /**
    * Pushes the current committed changes to a remote, optionally specify the names of the remote and branch to use
    * when pushing. Supply multiple options as an array of strings in the first argument - see examples below.
    */
   push(
      remote?: string,
      branch?: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.PushResult>
   ): Response<resp.PushResult>;

   push(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.PushResult>
   ): Response<resp.PushResult>;

   push(callback?: types.SimpleGitTaskCallback<resp.PushResult>): Response<resp.PushResult>;

   /**
    * Stash the local repo
    */
   stash(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   stash(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Show the working tree status.
    */
   status(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.StatusResult>
   ): Response<resp.StatusResult>;

   status(callback?: types.SimpleGitTaskCallback<resp.StatusResult>): Response<resp.StatusResult>;
}

export interface SimpleGit extends SimpleGitBase {
   /**
    * Add an annotated tag to the head of the current branch
    */
   addAnnotatedTag(
      tagName: string,
      tagMessage: string,
      callback?: types.SimpleGitTaskCallback<{ name: string }>
   ): Response<{ name: string }>;

   /**
    * Add config to local git instance for the specified `key` (eg: user.name) and value (eg: 'your name').
    * Set `append` to true to append to rather than overwrite the key
    */
   addConfig(
      key: string,
      value: string,
      append?: boolean,
      scope?: keyof typeof types.GitConfigScope,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   addConfig(
      key: string,
      value: string,
      append?: boolean,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   addConfig(
      key: string,
      value: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Applies a patch to the repo
    */
   applyPatch(
      patches: string | string[],
      options: types.TaskOptions<types.ApplyOptions>,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   applyPatch(
      patches: string | string[],
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Configuration values visible to git in the current working directory
    */
   listConfig(
      scope: keyof typeof types.GitConfigScope,
      callback?: types.SimpleGitTaskCallback<resp.ConfigListSummary>
   ): Response<resp.ConfigListSummary>;

   listConfig(
      callback?: types.SimpleGitTaskCallback<resp.ConfigListSummary>
   ): Response<resp.ConfigListSummary>;

   /**
    * Adds a remote to the list of remotes.
    *
    * - `remoteName` Name of the repository - eg "upstream"
    * - `remoteRepo` Fully qualified SSH or HTTP(S) path to the remote repo
    * - `options` Optional additional settings permitted by the `git remote add` command, merged into the command prior to the repo name and remote url
    */
   addRemote(
      remoteName: string,
      remoteRepo: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   addRemote(
      remoteName: string,
      remoteRepo: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Add a lightweight tag to the head of the current branch
    */
   addTag(
      name: string,
      callback?: types.SimpleGitTaskCallback<{ name: string }>
   ): Response<{ name: string }>;

   /**
    * Equivalent to `catFile` but will return the native `Buffer` of content from the git command's stdout.
    */
   binaryCatFile(options: string[], callback?: types.SimpleGitTaskCallback<any>): Response<any>;

   /**
    * List all branches
    */
   branch(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.BranchSummary>
   ): Response<resp.BranchSummary>;

   /**
    * List of local branches
    */
   branchLocal(
      callback?: types.SimpleGitTaskCallback<resp.BranchSummary>
   ): Response<resp.BranchSummary>;

   /**
    * Returns a list of objects in a tree based on commit hash.
    * Passing in an object hash returns the object's content, size, and type.
    *
    * Passing "-p" will instruct cat-file to determine the object type, and display its formatted contents.
    *
    * @see https://git-scm.com/docs/git-cat-file
    */
   catFile(options: string[], callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   catFile(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Check if a pathname or pathnames are excluded by .gitignore
    *
    */
   checkIgnore(
      pathNames: string[],
      callback?: types.SimpleGitTaskCallback<string[]>
   ): Response<string[]>;

   checkIgnore(path: string, callback?: types.SimpleGitTaskCallback<string[]>): Response<string[]>;

   /**
    * Validates that the current working directory is a valid git repo file path.
    *
    * To make a more specific assertion of the repo, add the `action` argument:
    *
    * - `bare` to validate that the working directory is inside a bare repo.
    * - `root` to validate that the working directory is the root of a repo.
    * - `tree` (default value when omitted) to simply validate that the working
    *    directory is the descendent of a repo
    */
   checkIsRepo(
      action?: types.CheckRepoActions,
      callback?: types.SimpleGitTaskCallback<boolean>
   ): Response<boolean>;

   checkIsRepo(callback?: types.SimpleGitTaskCallback<boolean>): Response<boolean>;

   /**
    * Checkout a tag or revision, any number of additional arguments can be passed to the `git checkout` command
    * by supplying either a string or array of strings as the `what` parameter.
    */
   checkout(
      what: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   checkout(what: string, callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   checkout(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Checkout a remote branch - equivalent to `git checkout -b ${branchName} ${startPoint}`
    *
    * - branchName name of branch.
    * - startPoint (e.g origin/development).
    */
   checkoutBranch(
      branchName: string,
      startPoint: string,
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   checkoutBranch(
      branchName: string,
      startPoint: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   /**
    * Internally uses pull and tags to get the list of tags then checks out the latest tag.
    */
   checkoutLatestTag(
      branchName: string,
      startPoint: string,
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   /**
    * Checkout a local branch - equivalent to `git checkout -b ${branchName}`
    */
   checkoutLocalBranch(
      branchName: string,
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   checkoutLocalBranch(
      branchName: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   /**
    * Deletes unwanted content from the local repo - when supplying the first argument as
    * an array of `CleanOptions`, the array must include one of `CleanOptions.FORCE` or
    * `CleanOptions.DRY_RUN`.
    *
    * eg:
    *
    * ```typescript
    await git.clean(CleanOptions.FORCE);
    await git.clean(CleanOptions.DRY_RUN + CleanOptions.RECURSIVE);
    await git.clean(CleanOptions.FORCE, ['./path']);
    await git.clean(CleanOptions.IGNORED + CleanOptions.FORCE, {'./path': null});
    * ```
    */
   clean(
      args: types.CleanOptions[],
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.CleanSummary>
   ): Response<resp.CleanSummary>;

   clean(
      mode: types.CleanMode | string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.CleanSummary>
   ): Response<resp.CleanSummary>;

   clean(
      mode: types.CleanMode | string,
      callback?: types.SimpleGitTaskCallback<resp.CleanSummary>
   ): Response<resp.CleanSummary>;

   clean(options?: types.TaskOptions): Response<resp.CleanSummary>;

   clean(callback?: types.SimpleGitTaskCallback<resp.CleanSummary>): Response<resp.CleanSummary>;

   /**
    * @deprecated
    * Removed in v2, use `abortPlugin` configuration to abort execution of pending tasks.
    */
   clearQueue(): this;

   /**
    * Clone a repository into a new directory.
    *
    * - repoPath repository url to clone e.g. https://github.com/steveukx/git-js.git
    * -  localPath local folder path to clone to.
    * - options supported by [git](https://git-scm.com/docs/git-clone).
    */
   clone(
      repoPath: string,
      localPath: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   clone(
      repoPath: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Commits changes in the current working directory - when specific file paths are supplied, only changes on those
    * files will be committed.
    */
   commit(
      message: string | string[],
      files?: string | string[],
      options?: types.Options,
      callback?: types.SimpleGitTaskCallback<resp.CommitResult>
   ): Response<resp.CommitResult>;

   commit(
      message: string | string[],
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.CommitResult>
   ): Response<resp.CommitResult>;

   commit(
      message: string | string[],
      files?: string | string[],
      callback?: types.SimpleGitTaskCallback<resp.CommitResult>
   ): Response<resp.CommitResult>;

   commit(
      message: string | string[],
      callback?: types.SimpleGitTaskCallback<resp.CommitResult>
   ): Response<resp.CommitResult>;

   /**
    * Retrieves `git` disk usage information, see https://git-scm.com/docs/git-count-objects
    */
   countObjects(
      callback?: types.SimpleGitTaskCallback<types.VersionResult>
   ): Response<types.CountObjectsResult>;

   /**
    * Sets the path to a custom git binary, should either be `git` when there is an installation of git available on
    * the system path, or a fully qualified path to the executable.
    */
   customBinary(command: Exclude<types.SimpleGitOptions['binary'], undefined>): this;

   /**
    * Delete one local branch. Supply the branchName as a string to return a
    * single `BranchDeletionSummary` instances.
    *
    * - branchName name of branch
    * - forceDelete (optional, defaults to false) set to true to forcibly delete unmerged branches
    */
   deleteLocalBranch(
      branchName: string,
      forceDelete?: boolean,
      callback?: types.SimpleGitTaskCallback<resp.BranchSingleDeleteResult>
   ): Response<resp.BranchSingleDeleteResult>;

   deleteLocalBranch(
      branchName: string,
      callback?: types.SimpleGitTaskCallback<resp.BranchSingleDeleteResult>
   ): Response<resp.BranchSingleDeleteResult>;

   /**
    * Delete one or more local branches. Supply the branchName as a string to return a
    * single `BranchDeletionSummary` or as an array of branch names to return an array of
    * `BranchDeletionSummary` instances.
    *
    * - branchNames name of branch or array of branch names
    * - forceDelete (optional, defaults to false) set to true to forcibly delete unmerged branches
    */
   deleteLocalBranches(
      branchNames: string[],
      forceDelete?: boolean,
      callback?: types.SimpleGitTaskCallback<resp.BranchMultiDeleteResult>
   ): Response<resp.BranchMultiDeleteResult>;

   /**
    * Get the diff of the current repo compared to the last commit with a set of options supplied as a string.
    */
   diff(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Gets a summary of the diff for files in the repo, uses the `git diff --stat` format to calculate changes.
    *
    * in order to get staged (only): `--cached` or `--staged`.
    */
   diffSummary(
      command: string | number,
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.DiffResult>
   ): Response<resp.DiffResult>;

   diffSummary(
      command: string | number,
      callback?: types.SimpleGitTaskCallback<resp.DiffResult>
   ): Response<resp.DiffResult>;

   diffSummary(
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.DiffResult>
   ): Response<resp.DiffResult>;

   diffSummary(callback?: types.SimpleGitTaskCallback<resp.DiffResult>): Response<resp.DiffResult>;

   /**
    * Sets an environment variable for the spawned child process, either supply both a name and value as strings or
    * a single object to entirely replace the current environment variables.
    *
    * @param {string|Object} name
    * @param {string} [value]
    */
   env(name: string, value: string): this;

   env(env: object): this;

   /**
    * Calls the supplied `handle` function at the next step in the chain, used to run arbitrary functions synchronously
    * before the next task in the git API.
    */
   exec(handle: () => void): Response<void>;

   /**
    * Updates the local working copy database with changes from the default remote repo and branch.
    */
   fetch(
      remote: string,
      branch: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.FetchResult>
   ): Response<resp.FetchResult>;

   fetch(
      remote: string,
      branch: string,
      callback?: types.SimpleGitTaskCallback<resp.FetchResult>
   ): Response<resp.FetchResult>;

   fetch(
      remote: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.FetchResult>
   ): Response<resp.FetchResult>;

   fetch(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.FetchResult>
   ): Response<resp.FetchResult>;

   fetch(callback?: types.SimpleGitTaskCallback<resp.FetchResult>): Response<resp.FetchResult>;

   /**
    * Gets the commit hash of the first commit in the repo
    */
   firstCommit(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Gets the current value of a configuration property by it key, optionally specify the scope in which
    * to run the command (omit / set to `undefined` to check in the complete overlaid configuration visible
    * to the `git` process).
    */
   getConfig(
      key: string,
      scope?: keyof typeof types.GitConfigScope,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<resp.ConfigGetResult>;

   /**
    * Gets the currently available remotes, setting the optional verbose argument to true includes additional
    * detail on the remotes themselves.
    */
   getRemotes(
      callback?: types.SimpleGitTaskCallback<types.RemoteWithoutRefs[]>
   ): Response<types.RemoteWithoutRefs[]>;

   getRemotes(
      verbose?: false,
      callback?: types.SimpleGitTaskCallback<types.RemoteWithoutRefs[]>
   ): Response<types.RemoteWithoutRefs[]>;

   getRemotes(
      verbose: true,
      callback?: types.SimpleGitTaskCallback<types.RemoteWithRefs[]>
   ): Response<types.RemoteWithRefs[]>;

   /**
    * Search for files matching the supplied search terms
    */
   grep(
      searchTerm: string | types.GitGrepQuery,
      callback?: types.SimpleGitTaskCallback<resp.GrepResult>
   ): Response<resp.GrepResult>;

   grep(
      searchTerm: string | types.GitGrepQuery,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.GrepResult>
   ): Response<resp.GrepResult>;

   /**
    * List remotes by running the `ls-remote` command with any number of arbitrary options
    * in either array of object form.
    */
   listRemote(
      args?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Show commit logs from `HEAD` to the first commit.
    * If provided between `options.from` and `options.to` tags or branch.
    *
    * You can provide `options.file`, which is the path to a file in your repository. Then only this file will be considered.
    *
    * To use a custom splitter in the log format, set `options.splitter` to be the string the log should be split on.
    *
    * By default the following fields will be part of the result:
    *   `hash`: full commit hash
    *   `date`: author date, ISO 8601-like format
    *   `message`: subject + ref names, like the --decorate option of git-log
    *   `author_name`: author name
    *   `author_email`: author mail
    * You can specify `options.format` to be an mapping from key to a format option like `%H` (for commit hash).
    * The fields specified in `options.format` will be the fields in the result.
    *
    * Options can also be supplied as a standard options object for adding custom properties supported by the git log command.
    * For any other set of options, supply options as an array of strings to be appended to the git log command.
    *
    * @returns Response<ListLogSummary>
    *
    * @see https://git-scm.com/docs/git-log
    */
   log<T = types.DefaultLogFields>(
      options?: types.TaskOptions | types.LogOptions<T>,
      callback?: types.SimpleGitTaskCallback<resp.LogResult<T>>
   ): Response<resp.LogResult<T>>;

   /**
    * Mirror a git repo
    *
    * Equivalent to `git.clone(repoPath, localPath, ['--mirror'])`, `clone` allows
    * for additional task options.
    */
   mirror(
      repoPath: string,
      localPath: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Moves one or more files to a new destination.
    *
    * @see https://git-scm.com/docs/git-mv
    */
   mv(
      from: string | string[],
      to: string,
      callback?: types.SimpleGitTaskCallback<resp.MoveSummary>
   ): Response<resp.MoveSummary>;

   /**
    * Fetch from and integrate with another repository or a local branch. In the case that the `git pull` fails with a
    * recognised fatal error, the exception thrown by this function will be a `GitResponseError<PullFailedResult>`.
    */
   pull(
      remote?: string,
      branch?: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.PullResult>
   ): Response<resp.PullResult>;

   pull(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.PullResult>
   ): Response<resp.PullResult>;

   pull(callback?: types.SimpleGitTaskCallback<resp.PullResult>): Response<resp.PullResult>;

   /**
    * Pushes the current tag changes to a remote which can be either a URL or named remote. When not specified uses the
    * default configured remote spec.
    */
   pushTags(
      remote: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.PushResult>
   ): Response<resp.PushResult>;

   pushTags(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.PushResult>
   ): Response<resp.PushResult>;

   pushTags(callback?: types.SimpleGitTaskCallback<resp.PushResult>): Response<resp.PushResult>;

   /**
    * Executes any command against the git binary.
    */
   raw(
      commands: string | string[] | types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(...commands: string[]): Response<string>;

   // leading varargs with trailing options/callback
   raw(
      a: string,
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      a: string,
      b: string,
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      a: string,
      b: string,
      c: string,
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      a: string,
      b: string,
      c: string,
      d: string,
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      a: string,
      b: string,
      c: string,
      d: string,
      e: string,
      options: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   // leading varargs with trailing callback
   raw(a: string, callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   raw(a: string, b: string, callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   raw(
      a: string,
      b: string,
      c: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      a: string,
      b: string,
      c: string,
      d: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   raw(
      a: string,
      b: string,
      c: string,
      d: string,
      e: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Rebases the current working copy. Options can be supplied either as an array of string parameters
    * to be sent to the `git rebase` command, or a standard options object.
    */
   rebase(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   rebase(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Call any `git remote` function with arguments passed as an array of strings.
    */
   remote(
      options: string[],
      callback?: types.SimpleGitTaskCallback<void | string>
   ): Response<void | string>;

   /**
    * Removes an entry from the list of remotes.
    *
    * - remoteName Name of the repository - eg "upstream"
    */
   removeRemote(remoteName: string, callback?: types.SimpleGitTaskCallback<void>): Response<void>;

   /**
    * Reset a repo. Called without arguments this is a soft reset for the whole repo,
    * for explicitly setting the reset mode, supply the first argument as one of the
    * supported reset modes.
    *
    * Trailing options argument can be either a string array, or an extension of the
    * ResetOptions, use this argument for supplying arbitrary additional arguments,
    * such as restricting the pathspec.
    *
    * ```typescript
    // equivalent to each other
    simpleGit().reset(ResetMode.HARD, ['--', 'my-file.txt']);
    simpleGit().reset(['--hard', '--', 'my-file.txt']);
    simpleGit().reset(ResetMode.HARD, {'--': null, 'my-file.txt': null});
    simpleGit().reset({'--hard': null, '--': null, 'my-file.txt': null});
    ```
    */
   reset(
      mode: types.ResetMode,
      options?: types.TaskOptions<types.ResetOptions>,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   reset(mode: types.ResetMode, callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   reset(
      options?: types.TaskOptions<types.ResetOptions>,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Revert one or more commits in the local working copy
    *
    * - commit The commit to revert. Can be any hash, offset (eg: `HEAD~2`) or range (eg: `master~5..master~2`)
    */
   revert(
      commit: String,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   revert(commit: String, callback?: types.SimpleGitTaskCallback<void>): Response<void>;

   /**
    * Passes the supplied options to `git rev-parse` and returns the string response. Options can be either a
    * string array or `Options` object of options compatible with the [rev-parse](https://git-scm.com/docs/git-rev-parse)
    *
    * Example uses of `rev-parse` include converting friendly commit references (ie: branch names) to SHA1 hashes
    * and retrieving meta details about the current repo (eg: the root directory, and whether it was created as
    * a bare repo).
    */
   revparse(
      option: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   revparse(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Removes the named files from source control.
    */
   rm(paths: string | string[], callback?: types.SimpleGitTaskCallback<void>): Response<void>;

   /**
    * Removes the named files from source control but keeps them on disk rather than deleting them entirely. To
    * completely remove the files, use `rm`.
    */
   rmKeepLocal(
      paths: string | string[],
      callback?: types.SimpleGitTaskCallback<void>
   ): Response<void>;

   /**
    * Show various types of objects, for example the file at a certain commit
    */
   show(
      option: string | types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   show(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   showBuffer(option: string | types.TaskOptions): Response<Buffer>;

   /**
    * @deprecated
    *
    * From version 2.7.0, use of `silent` is deprecated in favour of using the `debug` library, this method will
    * be removed in version 3.x.
    *
    * Please see the [readme](https://github.com/steveukx/git-js/blob/master/readme.md#enable-logging) for more details.
    *
    * Disables/enables the use of the console for printing warnings and errors, by default messages are not shown in
    * a production environment.
    *
    * @param {boolean} silence
    */
   silent(silence?: boolean): this;

   /**
    * List the stash(s) of the local repo
    */
   stashList(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.LogResult>
   ): Response<resp.LogResult>;

   stashList(callback?: types.SimpleGitTaskCallback<resp.LogResult>): Response<resp.LogResult>;

   /**
    * Call any `git submodule` function with arguments passed as an array of strings.
    */
   subModule(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Add a submodule
    */
   submoduleAdd(
      repo: string,
      path: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Initialise submodules
    */
   submoduleInit(
      moduleName: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   submoduleInit(
      moduleName: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   submoduleInit(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   submoduleInit(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Update submodules
    */
   submoduleUpdate(
      moduleName: string,
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   submoduleUpdate(
      moduleName: string,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   submoduleUpdate(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   submoduleUpdate(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * List all tags. When using git 2.7.0 or above, include an options object with `"--sort": "property-name"` to
    * sort the tags by that property instead of using the default semantic versioning sort.
    *
    * Note, supplying this option when it is not supported by your Git version will cause the operation to fail.
    */
   tag(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<string>
   ): Response<string>;

   /**
    * Gets a list of tagged versions.
    */
   tags(
      options?: types.TaskOptions,
      callback?: types.SimpleGitTaskCallback<resp.TagResult>
   ): Response<resp.TagResult>;

   tags(callback?: types.SimpleGitTaskCallback<resp.TagResult>): Response<resp.TagResult>;

   /**
    * Updates repository server info
    */
   updateServerInfo(callback?: types.SimpleGitTaskCallback<string>): Response<string>;

   /**
    * Retrieves `git` version information, including whether `git` is installed on the `PATH`
    */
   version(
      callback?: types.SimpleGitTaskCallback<types.VersionResult>
   ): Response<types.VersionResult>;
}
