# EditorConfig JavaScript Core

[![Tests](https://github.com/editorconfig/editorconfig-core-js/actions/workflows/node.js.yml/badge.svg)](https://github.com/editorconfig/editorconfig-core-js/actions/workflows/node.js.yml)
[![Coverage Status](https://coveralls.io/repos/github/editorconfig/editorconfig-core-js/badge.svg?branch=master)](https://coveralls.io/github/editorconfig/editorconfig-core-js?branch=master)

The EditorConfig JavaScript core will provide the same functionality as the
[EditorConfig C Core][] and [EditorConfig Python Core][].

## Installation

You need [node][] to use this package.

To install the package locally:

```bash
$ npm install editorconfig
```

To install the package system-wide:

```bash
$ npm install -g editorconfig
```

## Usage

### Options

Most of the API takes an `options` object, which has the following defaults:

```js
{
  config: '.editorconfig',
  version: pkg.version,
  root: '/',
  files: undefined,
  cache: undefined,
  unset: false,
};
```

<dl>
  <dt>config</dt>
  <dd>The name of the config file to look for in the current and every parent
      directory.</dd>

  <dt>version</dt>
  <dd>Which editorconfig spec version to use.  Earlier versions had different
      defaults.</dd>

  <dt>root</dt>
  <dd>What directory to stop processing in, even if we haven't found a file
      containing root=true.  Defaults to the root of the filesystem containing
      `process.cwd()`.</dd>

  <dt>files</dt>
  <dd>Pass in an empty array, which will be filled with one object for each
      config file processed.  The objects will have the shape
      `{filename: "[DIRECTORY]/.editorconfig", glob: "*"}`</dd>

  <dt>cache</dt>
  <dd>If you are going to process more than one file in the same project, pass
      in a cache object.  It must have `get(string): object|undefined` and
      `set(string, object)` methods, like a JavaScript Map.  A long-running
      process might want to consider that this cache might grow over time,
      and that the config files might change over time.  However, we leave any
      complexity of that nature to the caller, since there are so many different
      approaches that might be taken based on latency, memory, and CPU trade-offs.
      Note that some of the objects in the cache will be for files that did not
      exist.  Those objects will have a `notfound: true` property.  All of the
      objects will have a `name: string` property that contains the
      fully-qualified file name of the config file and a `root: boolean` property
      that describes if the config file had a `root=true` at the top.  Any other
      properties in the objects should be treated as opaque.</dd>

  <dt>unset</dt>
  <dd>If true, after combining all properties, remove all properties whose value
      remains as "unset".  This is typically left for plugin authors to do, and
      the conformance tests assume that this value is always false.</dd>
</dl>

### in Node.js:

#### parse(filePath[, options])

Search for `.editorconfig` files starting from the current directory to the
root directory.  Combine all of the sections whose section names match
filePath into a single object.

Example:

```js
const editorconfig = require('editorconfig');
const path = require('path');

const filePath = path.join(__dirname, 'sample.js');

(async () => {
  console.log(await editorconfig.parse(filePath, {files: []}));
})();
/*
  {
    indent_style: 'space',
    indent_size: 2,
    end_of_line: 'lf',
    charset: 'utf-8',
    trim_trailing_whitespace: true,
    insert_final_newline: true,
    tab_width: 2
  };
  assert.deepEqual(files, [
    { fileName: '[DIRECTORY]/.editorconfig', glob: '*' },
    { fileName: '[DIRECTORY]/.editorconfig', glob: '*.js' }
  ])
*/
```

#### parseSync(filePath[, options])

Synchronous version of `editorconfig.parse()`.

#### parseBuffer(fileContent)

The `parse()` function above uses `parseBuffer()` under the hood. If you have
the contents of a config file, and want to see what is being processed for
just that file rather than the full directory hierarchy, this might be useful.

#### parseString(fileContent)

This is a thin wrapper around `parseBuffer()` for backward-compatibility.
Prefer `parseBuffer()` to avoid an unnecessary UTF8-to-UTF16-to-UTF8
conversion.  Deprecated.

#### parseFromFiles(filePath, configs[, options])

Low-level interface, which exists only for backward-compatibility.  Deprecated.

Example:

```js
const editorconfig = require('editorconfig');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '.editorconfig');
const configs = [
  {
    name: configPath,
    contents: fs.readFileSync(configPath, 'utf8')
  }
];

const filePath = path.join(__dirname, '/sample.js');

(async () => {
  console.log(await editorconfig.parseFromFiles(filePath, Promise.resolve(configs)))
})();
/*
  {
    indent_style: 'space',
    indent_size: 2,
    end_of_line: 'lf',
    charset: 'utf-8',
    trim_trailing_whitespace: true,
    insert_final_newline: true,
    tab_width: 2
  };
*/
```

#### parseFromFilesSync(filePath, configs[, options])

Synchronous version of `editorconfig.parseFromFiles()`.  Deprecated.

### in Command Line

```bash
$ ./bin/editorconfig

Usage: editorconfig [options] <FILEPATH...>

Arguments:
  FILEPATH       Files to find configuration for.  Can be a hyphen (-) if you
                 want path(s) to be read from stdin.

Options:
  -v, --version  Display version information from the package
  -f <path>      Specify conf filename other than '.editorconfig'
  -b <version>   Specify version (used by devs to test compatibility)
  --files        Output file names that contributed to the configuration,
                 rather than the configuation itself
  -h, --help     display help for command
```

Example:

```bash
$ ./bin/editorconfig /home/zoidberg/humans/anatomy.md
charset=utf-8
insert_final_newline=true
end_of_line=lf
tab_width=8
trim_trailing_whitespace=sometimes
```

```bash
$ ./bin/editorconfig --files /home/zoidberg/humans/anatomy.md
/home/zoidberg/.editorconfig [*]
/home/zoidberg/.editorconfig [*.md]
/home/zoidberg/humans/.editorconfig [*]
```

## Development

To install dependencies for this package run this in the package directory:

```bash
$ npm install
```

Next, run the following commands:

```bash
$ npm run build
$ npm link
```

The global editorconfig will now point to the files in your development
repository instead of a globally-installed version from npm. You can now use
editorconfig directly to test your changes.

If you ever update from the central repository and there are errors, it might
be because you are missing some dependencies. If that happens, just run npm
link again to get the latest dependencies.

To test the command line interface:

```bash
$ editorconfig <filepath>
```

# Testing

[CMake][] must be installed to run the tests.

To run the tests:

```bash
$ npm test
```

To run the tests with increased verbosity (for debugging test failures):

```bash
$ npm run ci
```

[EditorConfig C Core]: https://github.com/editorconfig/editorconfig-core
[EditorConfig Python Core]: https://github.com/editorconfig/editorconfig-core-py
[node]: http://nodejs.org/
[cmake]: http://www.cmake.org
