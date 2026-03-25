import type {
	CommonOptions,
	Options,
	SyncOptions,
	StricterOptions,
} from '../arguments/options.js';
import type {SyncResult} from '../return/result.js';
import type {ResultPromise} from '../subprocess/subprocess.js';
import type {TemplateString} from './template.js';

/**
Same as `execa()` but using script-friendly default options.

When `command` is a template string, it includes both the `file` and its `arguments`.

`$(options)` can be used to return a new instance of this method but with different default `options`. Consecutive calls are merged to previous ones.

This is the preferred method when executing multiple commands in a script file.

@returns A `ResultPromise` that is both:
- the subprocess.
- a `Promise` either resolving with its successful `result`, or rejecting with its `error`.
@throws `ExecaError`

@example <caption>Basic</caption>
```
import {$} from 'execa';

const branch = await $`git branch --show-current`;
await $`dep deploy --branch=${branch}`;
```

@example <caption>Verbose mode</caption>
```
$ node build.js
Building application...
Done building.
Running tests...
Error: the entrypoint is invalid.

$ NODE_DEBUG=execa node build.js
[00:57:44.581] [0] $ npm run build
[00:57:44.653] [0]   Building application...
[00:57:44.653] [0]   Done building.
[00:57:44.658] [0] ✔ (done in 78ms)
[00:57:44.658] [1] $ npm run test
[00:57:44.740] [1]   Running tests...
[00:57:44.740] [1]   Error: the entrypoint is invalid.
[00:57:44.747] [1] ✘ Command failed with exit code 1: npm run test
[00:57:44.747] [1] ✘ (done in 89ms)
```
*/
export const $: ExecaScriptMethod<{}>;

/**
`$()` method either exported by Execa, or bound using `$(options)`.
*/
export type ExecaScriptMethod<OptionsType extends CommonOptions = CommonOptions> =
	& ExecaScriptBind<OptionsType>
	& ExecaScriptTemplate<OptionsType>
	& ExecaScriptArrayLong<OptionsType>
	& ExecaScriptArrayShort<OptionsType>
	& {sync: ExecaScriptSyncMethod<OptionsType>}
	& {s: ExecaScriptSyncMethod<OptionsType>};

// `$(options)` binding
type ExecaScriptBind<OptionsType extends CommonOptions> =
	<NewOptionsType extends CommonOptions = {}>(options: NewOptionsType)
	=> ExecaScriptMethod<OptionsType & NewOptionsType>;

// `$`command`` template syntax
type ExecaScriptTemplate<OptionsType extends CommonOptions> =
	(...templateString: TemplateString)
	=> ResultPromise<StricterOptions<OptionsType, Options>>;

// `$('file', ['arg'], {})` array syntax
type ExecaScriptArrayLong<OptionsType extends CommonOptions> =
	<NewOptionsType extends Options = {}>(file: string | URL, arguments?: readonly string[], options?: NewOptionsType)
	=> ResultPromise<StricterOptions<OptionsType & NewOptionsType, Options>>;

// `$('file', {})` array syntax
type ExecaScriptArrayShort<OptionsType extends CommonOptions> =
	<NewOptionsType extends Options = {}>(file: string | URL, options?: NewOptionsType)
	=> ResultPromise<StricterOptions<OptionsType & NewOptionsType, Options>>;

// We must intersect the overloaded methods with & instead of using a simple object as a workaround for a TypeScript bug
// See https://github.com/microsoft/TypeScript/issues/58765
/**
`$.sync()` method either exported by Execa, or bound using `$.sync(options)`.
*/
export type ExecaScriptSyncMethod<OptionsType extends CommonOptions = CommonOptions> =
	& ExecaScriptSyncBind<OptionsType>
	& ExecaScriptSyncTemplate<OptionsType>
	& ExecaScriptSyncArrayLong<OptionsType>
	& ExecaScriptSyncArrayShort<OptionsType>;

// `$.sync(options)` binding
type ExecaScriptSyncBind<OptionsType extends CommonOptions> =
	<NewOptionsType extends SyncOptions = {}>(options: NewOptionsType)
	=> ExecaScriptSyncMethod<OptionsType & NewOptionsType>;

// $.sync`command` template syntax
type ExecaScriptSyncTemplate<OptionsType extends CommonOptions> =
	(...templateString: TemplateString)
	=> SyncResult<StricterOptions<OptionsType, SyncOptions>>;

// `$.sync('file', ['arg'], {})` array syntax
type ExecaScriptSyncArrayLong<OptionsType extends CommonOptions> =
	<NewOptionsType extends SyncOptions = {}>(file: string | URL, arguments?: readonly string[], options?: NewOptionsType)
	=> SyncResult<StricterOptions<OptionsType & NewOptionsType, SyncOptions>>;

// `$.sync('file', {})` array syntax
type ExecaScriptSyncArrayShort<OptionsType extends CommonOptions> =
	<NewOptionsType extends SyncOptions = {}>(file: string | URL, options?: NewOptionsType)
	=> SyncResult<StricterOptions<OptionsType & NewOptionsType, SyncOptions>>;
