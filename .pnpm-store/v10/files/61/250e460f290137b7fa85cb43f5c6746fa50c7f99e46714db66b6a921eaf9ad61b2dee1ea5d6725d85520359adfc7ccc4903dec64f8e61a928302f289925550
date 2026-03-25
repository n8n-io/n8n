# run-applescript

> Run AppleScript and get the result

## Install

```sh
npm install run-applescript
```

## Usage

```js
import {runAppleScript} from 'run-applescript';

const result = await runAppleScript('return "unicorn"');

console.log(result);
//=> 'unicorn'
```

## API

### runAppleScript(script, options?)

Returns a `Promise<string>` with the script result.

#### script

Type: `string`

The script to run.

#### options

Type: `object`

##### humanReadableOutput

Type: `boolean`\
Default: `true`

Change the output style.

When `false`, returns the value in a [recompilable source form](https://ss64.com/osx/osascript.html).

##### signal

Type: `AbortSignal`

An AbortSignal that can be used to cancel the AppleScript execution.

### runAppleScriptSync(script, options?)

Returns a `string` with the script result.

#### script

Type: `string`

The script to run.

#### options

Type: `object`

##### humanReadableOutput

Type: `boolean`\
Default: `true`

Change the output style.

When `false`, returns the value in a [recompilable source form](https://ss64.com/osx/osascript.html).

## Related

- [run-jxa](https://github.com/sindresorhus/run-jxa) - Run JXA code and get the result
