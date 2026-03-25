# Replace in file

[![npm version](https://img.shields.io/npm/v/replace-in-file.svg)](https://www.npmjs.com/package/replace-in-file)
[![build status](https://travis-ci.org/adamreisnz/replace-in-file.svg?branch=master)](https://travis-ci.org/adamreisnz/replace-in-file)
[![coverage status](https://coveralls.io/repos/github/adamreisnz/replace-in-file/badge.svg?branch=master)](https://coveralls.io/github/adamreisnz/replace-in-file?branch=master)
[![github issues](https://img.shields.io/github/issues/adamreisnz/replace-in-file.svg)](https://github.com/adamreisnz/replace-in-file/issues)

A simple utility to quickly replace text in one or more files or globs. Works synchronously or asynchronously with either promises or callbacks. Make a single replacement or multiple replacements at once.

# Index
- [Installation](#installation)
- [Basic usage](#basic-usage)
  - [Asynchronous replacement with `async`/`await`](#asynchronous-replacement-with-asyncawait)
  - [Asynchronous replacement with promises](asynchronous-replacement-with-promises)
  - [Asynchronous replacement with callback](#asynchronous-replacement-with-callback)
  - [Synchronous replacement](#synchronous-replacement)
  - [Return value](#return-value)
  - [Counting matches and replacements](#counting-matches-and-replacements)
  - [Custom processor](#custom-processor)
- [Advanced usage](#advanced-usage)
  - [Replace a single file or glob](#replace-a-single-file-or-glob)
  - [Replace multiple files or globs](#replace-multiple-files-or-globs)
  - [Replace first occurrence only](#replace-first-occurrence-only)
  - [Replace all occurrences](#replace-all-occurrences)
  - [Multiple values with the same replacement](#multiple-values-with-the-same-replacement)
  - [Custom regular expressions](#custom-regular-expressions)
  - [Multiple values with different replacements](#multiple-values-with-different-replacements)
  - [Using callbacks for `from`](#using-callbacks-for-from)
  - [Using callbacks for `to`](#using-callbacks-for-to)
  - [Ignore a single file or glob](#ignore-a-single-file-or-glob)
  - [Ignore multiple files or globs](#ignore-multiple-files-or-globs)
  - [Allow empty/invalid paths](#allow-emptyinvalid-paths)
  - [Disable globs](#disable-globs)
  - [Specify glob configuration](#specify-glob-configuration)
  - [Making replacements on network drives](#making-replacements-on-network-drives)
  - [Specify character encoding](#specify-character-encoding)
  - [Dry run](#dry-run)
- [CLI usage](#cli-usage)
- [A note on using globs with the CLI](#a-note-on-using-globs-with-the-cli)
- [Version information](#version-information)
- [License](#license)

## Installation
```shell
# Using npm, installing to local project
npm i --save replace-in-file

# Using npm, installing globally for global cli usage
npm i -g replace-in-file

# Using yarn
yarn add replace-in-file
```

## Basic usage

```js
//Load the library and specify options
const replace = require('replace-in-file');
const options = {
  files: 'path/to/file',
  from: /foo/g,
  to: 'bar',
};
```

### Asynchronous replacement with `async`/`await`

```js
try {
  const results = await replace(options)
  console.log('Replacement results:', results);
}
catch (error) {
  console.error('Error occurred:', error);
}
```

### Asynchronous replacement with promises

```js
replace(options)
  .then(results => {
    console.log('Replacement results:', results);
  })
  .catch(error => {
    console.error('Error occurred:', error);
  });
```

### Asynchronous replacement with callback

```js
replace(options, (error, results) => {
  if (error) {
    return console.error('Error occurred:', error);
  }
  console.log('Replacement results:', results);
});
```

### Synchronous replacement

```js
try {
  const results = replace.sync(options);
  console.log('Replacement results:', results);
}
catch (error) {
  console.error('Error occurred:', error);
}
```

### Return value

The return value of the library is an array of replacement results against each file that was processed. This includes files in which no replacements were made.

Each result contains the following values:

- `file`: The path to the file that was processed
- `hasChanged`: Flag to indicate if the file was changed or not

```js
const results = replace.sync({
  files: 'path/to/files/*.html',
  from: /foo/g,
  to: 'bar',
});

console.log(results);

// [
//   {
//     file: 'path/to/files/file1.html',
//     hasChanged: true,
//   },
//   {
//     file: 'path/to/files/file2.html',
//     hasChanged: true,
//   },
//   {
//     file: 'path/to/files/file3.html',
//     hasChanged: false,
//   },
// ]

```

To get an array of changed files, simply map the results as follows:

```js
const changedFiles = results
  .filter(result => result.hasChanged)
  .map(result => result.file);
```

### Counting matches and replacements
By setting the `countMatches` configuration flag to `true`, the number of matches and replacements per file will be counted and present in the results array.

- `numMatches`: Indicates the number of times a match was found in the file
- `numReplacements`: Indicates the number of times a replacement was made in the file

Note that the number of matches can be higher than the number of replacements if a match and replacement are the same string.

```js
const results = replace.sync({
  files: 'path/to/files/*.html',
  from: /foo/g,
  to: 'bar',
  countMatches: true,
});

console.log(results);

// [
//   {
//     file: 'path/to/files/file1.html',
//     hasChanged: true,
//     numMatches: 3,
//     numReplacements: 3,
//   },
//   {
//     file: 'path/to/files/file2.html',
//     hasChanged: true,
//     numMatches: 1,
//     numReplacements: 1,
//   },
//   {
//     file: 'path/to/files/file3.html',
//     hasChanged: false,
//     numMatches: 0,
//     numReplacements: 0,
//   },
// ]
```

### Custom processor

For advanced usage where complex processing is needed it's possible to use a callback that will receive content as an argument and should return it processed.

```js
const results = replace.sync({
  files: 'path/to/files/*.html',
  processor: (input) => input.replace(/foo/g, 'bar'),
});
```

### Array of custom processors

Passing processor function also supports passing an array of functions that will be executed sequentially

```js
function someProcessingA(input) {
  const chapters = input.split('###')
  chapters[1] = chapters[1].replace(/foo/g, 'bar')
  return chapters.join('###')
}

function someProcessingB(input) {
  return input.replace(/foo/g, 'bar')
}

const results = replace.sync({
  files: 'path/to/files/*.html',
  processor: [someProcessingA, someProcessingB],
});
```

## Advanced usage

### Replace a single file or glob
```js
const options = {
  files: 'path/to/file',
};
```

### Replace multiple files or globs

```js
const options = {
  files: [
    'path/to/file',
    'path/to/other/file',
    'path/to/files/*.html',
    'another/**/*.path',
  ],
};
```

### Replace first occurrence only

```js
const options = {
  from: 'foo',
  to: 'bar',
};
```

### Replace all occurrences
Please note that the value specified in the `from` parameter is passed straight to the native [String replace method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace). As such, if you pass a string as the `from` parameter, it will _only replace the first occurrence_.

To replace multiple occurrences at once, you must use a regular expression for the `from` parameter with the global flag enabled, e.g. `/foo/g`.

```js
const options = {
  from: /foo/g,
  to: 'bar',
};
```

### Multiple values with the same replacement

These will be replaced sequentially.

```js
const options = {
  from: [/foo/g, /baz/g],
  to: 'bar',
};
```

### Multiple values with different replacements

These will be replaced sequentially.

```js
const options = {
  from: [/foo/g, /baz/g],
  to: ['bar', 'bax'],
};
```

### Custom regular expressions

Use the [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) constructor to create any regular expression.

```js
const str = 'foo';
const regex = new RegExp('^' + str + 'bar', 'i');
const options = {
  from: regex,
  to: 'bar',
};
```

### Using callbacks for `from`
You can also specify a callback that returns a string or a regular expression. The callback receives the name of the file in which the replacement is being performed, thereby allowing the user to tailor the search string. The following example uses a callback to produce a search string dependent on the filename:

```js
const options = {
  files: 'path/to/file',
  from: (file) => new RegExp(file, 'g'),
  to: 'bar',
};
```

### Using callbacks for `to`
As the `to` parameter is passed to the native [String replace method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace), you can also specify a callback. The following example uses a callback to convert matching strings to lowercase:

```js
const options = {
  files: 'path/to/file',
  from: /SomePattern[A-Za-z-]+/g,
  to: (match) => match.toLowerCase(),
};
```

This callback provides for an extra argument above the String replace method, which is the name of the file in which the replacement is being performed. The following example replaces the matched string with the filename:

```js
const options = {
  files: 'path/to/file',
  from: /SomePattern[A-Za-z-]+/g,
  to: (...args) => args.pop(),
};
```

### Ignore a single file or glob

```js
const options = {
  ignore: 'path/to/ignored/file',
};
```

### Ignore multiple files or globs

```js
const options = {
  ignore: [
    'path/to/ignored/file',
    'path/to/other/ignored_file',
    'path/to/ignored_files/*.html',
    'another/**/*.ignore',
  ],
};
```

Please note that there is an [open issue with Glob](https://github.com/isaacs/node-glob/issues/309) that causes ignored patterns to be ignored when using a `./` prefix in your files glob. To work around this, simply remove the prefix, e.g. use `**/*` instead of `./**/*`.

### Allow empty/invalid paths
If set to true, empty or invalid paths will fail silently and no error will be thrown. For asynchronous replacement only. Defaults to `false`.

```js
const options = {
  allowEmptyPaths: true,
};
```

### Disable globs
You can disable globs if needed using this flag. Use this when you run into issues with file paths like files like `//SERVER/share/file.txt`. Defaults to `false`.

```js
const options = {
  disableGlobs: true,
};
```

### Specify glob configuration
Specify configuration passed to the [glob](https://www.npmjs.com/package/glob) call:

```js
const options = {
  glob: {
    //Glob settings here
    dot: true, //E.g. to include file names starting with a dot
  },
};
```

Please note that the setting `nodir` will always be passed as `false`.

### Making replacements on network drives
To make replacements in files on network drives, you may need to specify the UNC path as the `cwd` config option. This will then be passed to glob and prefixed to your paths accordingly. See [#56](https://github.com/adamreisnz/replace-in-file/issues/56) for more details.

### Specify character encoding
Use a different character encoding for reading/writing files. Defaults to `utf-8`.

```js
const options = {
  encoding: 'utf8',
};
```

### Dry run
To do a dry run without actually making replacements, for testing purposes. Defaults to `false`.

```js
const options = {
  dry: true,
};
```

## CLI usage

```sh
replace-in-file from to some/file.js,some/**/glob.js
  [--configFile=replace-config.js]
  [--ignore=ignore/files.js,ignore/**/glob.js]
  [--encoding=utf-8]
  [--disableGlobs]
  [--isRegex]
  [--verbose]
  [--quiet]
  [--dry]
```

Multiple files or globs can be replaced by providing a comma separated list.

The flags `--disableGlobs`, `--ignore` and `--encoding` are supported in the CLI.

The setting `allowEmptyPaths` is not supported in the CLI as the replacement is
synchronous, and this setting is only relevant for asynchronous replacement.

To list the changed files, use the `--verbose` flag. Success output can be suppressed by using the `--quiet` flag.

To do a dry run without making any actual changes, use `--dry`.

A regular expression may be used for the `from` parameter by specifying the `--isRegex` flag.

The `from` and `to` parameters, as well as the files list, can be omitted if you provide this
information in a configuration file. You can provide a path to a configuration file
(either Javascript or JSON) with the `--configFile` flag. This path will be resolved using
Node’s built in `path.resolve()`, so you can pass in an absolute or relative path.

## A note on using globs with the CLI
When using the CLI, the glob pattern is handled by the operating system. But if you specify the glob pattern in the configuration file, the package will use the glob module from the Node modules, and this can lead to different behaviour despite using the same pattern.

For example, the following will only look at top level files:

```js
//config.js
module.exports = {
  from: /cat/g,
  to: 'dog',
};
```

```sh
replace-in-file **  --configFile=config.js
```

However, this example is recursive:

```js
//config.js
module.exports = {
  files: '**',
  from: /cat/g,
  to: 'dog',
};
```

```sh
replace-in-file --configFile=config.js
```

If you want to do a recursive file search as an argument you must use:

```sh
replace-in-file $(ls l {,**/}*)  --configFile=config.js
```

## Version information
From version 3.0.0 onwards, replace in file requires Node 6 or higher. If you need support for Node 4 or 5, please use version 2.x.x.

From version 5.0.0 onwards, replace in file requires Node 8 or higher. If you need support for Node 6, please use version 4.x.x.

See the [Changelog](CHANGELOG.md) for more information.

## License
(MIT License)

Copyright 2015-2020, Adam Reis, Co-founder at [Hello Club](https://helloclub.com/?source=npm)
