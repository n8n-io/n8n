# clean-stack [![Build Status](https://travis-ci.com/sindresorhus/clean-stack.svg?branch=master)](https://travis-ci.com/github/sindresorhus/clean-stack)

> Clean up error stack traces

Removes the mostly unhelpful internal Node.js entries.

Also works in Electron.

## Install

```
$ npm install clean-stack
```

## Usage

```js
const cleanStack = require('clean-stack');

const error = new Error('Missing unicorn');

console.log(error.stack);
/*
Error: Missing unicorn
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at startup (node.js:139:18)
*/

console.log(cleanStack(error.stack));
/*
Error: Missing unicorn
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
*/
```

## API

### cleanStack(stack, options?)

#### stack

Type: `string`

The `stack` property of an `Error`.

#### options

Type: `object`

##### pretty

Type: `boolean`\
Default: `false`

Prettify the file paths in the stack:

`/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `~/dev/clean-stack/unicorn.js:2:15`

##### basePath

Type: `string?`

Remove the given base path from stack trace file paths, effectively turning absolute paths into relative ones.

Example with `'/Users/sindresorhus/dev/clean-stack/'` as `basePath`:

`/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `unicorn.js:2:15`

## Related

- [extract-stack](https://github.com/sindresorhus/extract-stack) - Extract the actual stack of an error
- [stack-utils](https://github.com/tapjs/stack-utils) - Captures and cleans stack traces
