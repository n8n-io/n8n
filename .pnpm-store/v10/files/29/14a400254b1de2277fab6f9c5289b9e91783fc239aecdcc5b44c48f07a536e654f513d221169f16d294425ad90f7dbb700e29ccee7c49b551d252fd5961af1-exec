
# dockerignore

`dockerignore` is a file filter library fully compatible with Docker's [.dockerignore
file](https://docs.docker.com/engine/reference/builder/#dockerignore-file), exposing the
same API as the popular [ignore](https://github.com/kaelzhang/node-ignore) package for the
`.gitignore` format.

`dockerignore` is also:

* Compatible with Linux, macOS and Windows.
* Compact with 0 external dependencies (production install).
* A pure Javascript port of Docker's Golang implementation of the `.dockerignore` format.
* Well tested with hundreds of test cases including comparison against the actual behavior
  of `docker build` on Windows and Linux.
* Relied on in production environments by
  [balena-cli](https://www.balena.io/docs/reference/balena-cli/),
  [now-cli](https://github.com/zeit/now-cli/)
  and other prominent projects built around Docker.

### What's different from `ignore`?

The `.dockerignore` spec has several differences from `.gitignore`:

- `*` in `.gitignore` matches everything, whereas in `.dockerignore` it only matches files in the
  current directory (like glob). This difference is important when whitelisting after a `*` rule.
- `abc` in `.gitignore` matches all `abc` files and directories, however deeply nested, whereas
  in `.dockerignore` it matches only at `./abc` and not in subdirectories like `./somedir/abc`.
- With `.gitignore`, when a parent directory is ignored, subdirectories cannot be re-added (using
  `!`) since `git` simply avoids walking through the subtree as an optimization. With
  `.dockerignore`, a subdirectory can be re-added even if a parent directory has been ignored.
- For a complete list of differences, check out the [.gitignore
  spec](https://git-scm.com/docs/gitignore) and the [.dockerignore
  spec](https://docs.docker.com/engine/reference/builder/#dockerignore-file).

### What's the same as `ignore`?

The entire API. `dockerignore` started as a fork of
[node-ignore](https://github.com/kaelzhang/node-ignore), and even reuses the same `index.d.ts` file
for TypeScript definitions. Under the hood, `node-ignore`'s matching logic was rewritten to closely
match Docker's implementation (modeled mainly around
[dockerignore.go](https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go)
and [fileutils.go](https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go)).

### Compatibility

`dockerignore` works with Node.js version 8 and above, on Linux, macOS and Windows.
The code is compiled with [Babel](https://babeljs.io/docs/en/).

## Install

```bash
npm install --save @balena/dockerignore
```

## Usage

```js
const ignore = require('@balena/dockerignore')
const ig = ignore().add(['.abc/*', '!.abc/d/'])
```

Typescript type definitions are also included:

```typescript
import ignore from '@balena/dockerignore'
const ig = ignore().add(['.abc/*', '!.abc/d/'])
```

### Filter the given paths

```js
const paths = [
  '.abc/a.js',    // filtered out
  '.abc/d/e.js'   // included
]

ig.filter(paths)        // ['.abc/d/e.js']
ig.ignores('.abc/a.js') // true
```

### As the filter function

```js
paths.filter(ig.createFilter()); // ['.abc/d/e.js']
```

### Windows paths are supported

```js
ig.filter(['.abc\\a.js', '.abc\\d\\e.js'])
// if the code above runs on windows, the result will be
// ['.abc\\d\\e.js']
```

## Backslashes _vs._ forward slashes

`dockerignore` behaves just like the Docker CLI ("docker build") in relation to the backslash (`\`)
and forward slash (`/`) characters:

OS           | Location                | Slash (`/`)    | Backslash (`\`)
------------ | ----------------------- | ---------------| --------------------
Linux, macOS | `.dockerignore`         | Path separator | Escape character
Linux, macOS | `filter()`, `ignores()` | Path separator | Part of file name
Windows      | `.dockerignore`         | Path separator | Path separator
Windows      | `filter()`, `ignores()` | Path separator | Path separator

This means that forward slashes can be used in the `.dockerignore` file for cross-platform
compatibility. This is consistent with how Windows works generally: both forward slashes
and backslashes are accepted as path separators by the Command Prompt (cmd.exe) or
PowerShell, and by library functions like the Golang
[filepath.Clean](https://golang.org/pkg/path/filepath/#Clean) or the Node.js
[path.normalize](https://nodejs.org/docs/latest-v10.x/api/path.html#path_path_normalize_path).

The use of the backslash as an escape character (Linux and macOS only) is not documented in the
`.dockerignore` specification. "Reasonable" uses are probably to escape the few characters that
have a special meaning in the `.dockerignore` file, namely `"*#!\"` (excluding the double quotes),
as opposed to characters that have a special meaning in [regular
expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
generally. The "escaping" behavior for any other characters (e.g. `'\\b'`) is undefined and subject
to implementation-specific interpretation that may change at any time.

## Absolute paths

Leading and trailing slashes (or backslashes on Windows) are removed from `.dockerignore` patterns,
so `'/a'`, `'a/'` and `'/a/'` are all equivalent to `'a'` in a `.dockerignore` file, and they all
anchor to the "leftmost" directory when matching against relative paths. For example, pattern `'a'`
is compared with `'x'` for a given path `'x/y/z'`. This follows Docker's Golang implementation for
compatibility. Conversely, a given absolute path will not match a non-wildcard pattern. More
examples:

```js
  ignore().add('a').ignores('a')    // true
  ignore().add('/a').ignores('a')   // true
  ignore().add('/a/').ignores('a')  // true
  ignore().add('a').ignores('/a')   // false
  ignore().add('/a').ignores('/a')  // false
  ignore().add('/a/').ignores('/a') // false
```

Considering pattern slash removal, the cases above may be reduced to:

```js
  ignore().add('a').ignores('a')  // true
  ignore().add('a').ignores('/a') // false
```

The 'false' outcome for these examples may appear to mismatch the behavior of "docker build", when
the source argument for the Dockerfile [ADD](https://docs.docker.com/engine/reference/builder/#add)
or [COPY](https://docs.docker.com/engine/reference/builder/#copy) instructions is an absolute path
(starting with a slash). The explanation is that docker converts absolute source paths to relative
paths (relative to the "build context") **prior to pattern matching:**
https://github.com/moby/moby/blob/v19.03.8/pkg/archive/archive.go#L806
https://github.com/moby/moby/blob/v19.03.8/pkg/archive/archive.go#L825

... while `dockerignore` mirrors the implementation of the pattern matcher itself. The advice is
for your application to do the same as the docker CLI: use relative paths for pattern matching.
This is also generally more portable across different environments: development machine, CI
pipelines, servers or end user devices.

## Comments

A pattern starting with `'#'` (hash) is ignored as a comment. The hash can be prefixed with
a slash or backslash in order to match a file name that also starts with a hash:

```js
ignore().add('#abc').ignores('#abc')   // false
ignore().add('/#abc').ignores('#abc')  // true
ignore().add('\\#abc').ignores('#abc') // true
```

This works because of the leading slash removal from patterns described in [Absolute
Paths](#absolute-paths).

## Exclusion patterns

Patterns starting with `'!'` (exclamation mark) define matching exclusions (exceptions) as
documented in the [.dockerignore
specification](https://docs.docker.com/engine/reference/builder/#dockerignore-file). For
compatibility with Docker's implementation, patterns starting with `'/!'` or `'!/'` (but not
`'/!/'`) will also be considered exclusion patterns, in addition to slash removal described in
[Absolute Paths](#absolute-paths). Backslash escaping as `'\\!'` may be used in order to match a
file or directory name that starts with the exclamation mark, but this is only possible on Linux
and macOS, not on Windows. Again, it only behaves this way for compatibility with Docker's
implementation.

## Options

Matching is case-insensitive by default, following the `ignore` API
([ignorecase](https://www.npmjs.com/package/ignore#optionsignorecase-since-400)).
Note however that Docker performs case-sensitive matching.
Use the `ignorecase: false` option to align with Docker's behavior:

```js
const ig = ignore({ ignorecase: false }) // for case-sensitive matching
```

## Methods

### .add(pattern)
### .add(patterns)

- **pattern** `String|Ignore` An ignore pattern string, or the `Ignore` instance
- **patterns** `Array.<pattern>` Array of ignore patterns.

Adds a rule or several rules to the current manager.

Returns `this`

`pattern` could either be a line of ignore pattern or a string of multiple ignore patterns, which means we could just `ignore().add()` the content of a ignore file:

```js
ignore()
.add(fs.readFileSync(filenameOfGitignore).toString())
.filter(filenames)
```

`pattern` could also be an `ignore` instance, so that we could easily inherit the rules of another `Ignore` instance.

### .ignores(pathname)

Returns `Boolean` whether `pathname` should be ignored.

```js
ig.ignores('.abc/a.js')    // true
```

### .filter(paths)

Filters the given array of pathnames, and returns the filtered array.

- **paths** `Array.<path>` The array of `pathname`s to be filtered.

### .createFilter()

Creates a filter function which could filter an array of paths with `Array.prototype.filter`.

Returns `function(path)` the filter function.

## Contributing

Contributions are always welcome!

1. Fork this repository to your own GitHub account and then clone it to your local device.
2. Install the dependencies: `npm install`
3. Add a test case (if applicable) and ensure it currently fails
4. Add code to pass the test
5. Make a pull request (additional tests will run on CI to ensure that your test case agrees with an actual `docker build`)

## Acknowledgements

The initial work on this project was done by Pranay Prakash
([@pranaygp](https://twitter.com/pranaygp)) / [▲ZEIT](https://zeit.co), Kael Zhang
([@kaelzhang](https://github.com/kaelzhang)) and the [node-ignore
contributors](https://github.com/kaelzhang/node-ignore/graphs/contributors).

Paulo Castro ([@pdcastro](https://github.com/pdcastro)) / [balena.io](https://www.balena.io/)
forked the repository in year 2020 ([encouraged by
Zeit](https://github.com/zeit/dockerignore/pull/16#issuecomment-611790479)) and put in a
substantial effort on Windows support, cross-platform compatibility and testing, leading to release
1.0.0.
