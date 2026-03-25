# v8-to-istanbul

[![Build Status](https://img.shields.io/github/actions/workflow/status/istanbuljs/v8-to-istanbul/ci.yaml?branch=master)](https://github.com/istanbuljs/v8-to-istanbul/actions)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
![nycrc config on GitHub](https://img.shields.io/nycrc/istanbuljs/v8-to-istanbul)

converts from v8 coverage format to [istanbul's coverage format](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md).

## Usage

```js
const v8toIstanbul = require('v8-to-istanbul')
// the path to the original source-file is required, as its contents are
// used during the conversion algorithm.
const converter = v8toIstanbul('./path-to-instrumented-file.js')
await converter.load() // this is required due to async file reading.
// provide an array of coverage information in v8 format.
converter.applyCoverage([
  {
    "functionName": "",
    "ranges": [
      {
        "startOffset": 0,
        "endOffset": 520,
        "count": 1
      }
    ],
    "isBlockCoverage": true
  },
  // ...
])
// output coverage information in a form that can
// be consumed by Istanbul.
console.info(JSON.stringify(converter.toIstanbul()))
```

## Ignoring Uncovered Lines

Sometimes you might find yourself wanting to ignore uncovered lines
in your application (for example, perhaps you run your tests in Linux, but
there's code that only executes on Windows).

To ignore lines, use the special comment `/* v8 ignore next */`.

**NOTE**: Before version `9.2.0` the ignore hint had to contain `c8` keyword, e.g. `/* c8 ignore ...`.

### ignoring the next line

```js
const myVariable = 99
/* v8 ignore next */
if (process.platform === 'win32') console.info('hello world')
```

### ignoring the next N lines

```js
const myVariable = 99
/* v8 ignore next 3 */
if (process.platform === 'win32') {
  console.info('hello world')
}
```

### ignoring all lines until told

```js
/* v8 ignore start */
function dontMindMe() {
  // ...
}
/* v8 ignore stop */
```

### ignoring the same line as the comment

```js
const myVariable = 99
const os = process.platform === 'darwin' ? 'OSXy' /* v8 ignore next */ : 'Windowsy' 
```

## Testing

To execute tests, simply run:

```bash
npm test
```
