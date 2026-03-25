import type {Options, SyncOptions} from '../arguments/options.js';
import type {SyncResult} from '../return/result.js';
import type {ResultPromise} from '../subprocess/subprocess.js';
import type {SimpleTemplateString} from './template.js';

/**
Executes a command. `command` is a string that includes both the `file` and its `arguments`.

When `command` is a template string, it includes both the `file` and its `arguments`.

`execaCommand(options)` can be used to return a new instance of this method but with different default `options`. Consecutive calls are merged to previous ones.

This is only intended for very specific cases, such as a REPL. This should be avoided otherwise.

@param command - The program/script to execute and its arguments.
@returns A `ResultPromise` that is both:
- the subprocess.
- a `Promise` either resolving with its successful `result`, or rejecting with its `error`.
@throws `ExecaError`

@example
```
import {execaCommand} from 'execa';

for await (const commandAndArguments of getReplLine()) {
	await execaCommand(commandAndArguments);
}
```
*/
export declare const execaCommand: ExecaCommandMethod<{}>;

type ExecaCommandMethod<OptionsType extends Options> =
	& ExecaCommandBind<OptionsType>
	& ExecaCommandTemplate<OptionsType>
	& ExecaCommandArray<OptionsType>;

// `execaCommand(options)` binding
type ExecaCommandBind<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(options: NewOptionsType)
	=> ExecaCommandMethod<OptionsType & NewOptionsType>;

// `execaCommand`command`` template syntax
type ExecaCommandTemplate<OptionsType extends Options> =
	(...templateString: SimpleTemplateString)
	=> ResultPromise<OptionsType>;

// `execaCommand('command', {})` array syntax
type ExecaCommandArray<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(command: string, options?: NewOptionsType)
	=> ResultPromise<OptionsType & NewOptionsType>;

/**
Same as `execaCommand()` but synchronous.

When `command` is a template string, it includes both the `file` and its `arguments`.

`execaCommandSync(options)` can be used to return a new instance of this method but with different default `options`. Consecutive calls are merged to previous ones.

Returns a subprocess `result` or throws an `error`. The `subprocess` is not returned: its methods and properties are not available.

@param command - The program/script to execute and its arguments.
@returns `SyncResult`
@throws `ExecaSyncError`

@example
```
import {execaCommandSync} from 'execa';

for (const commandAndArguments of getReplLine()) {
	execaCommandSync(commandAndArguments);
}
```
*/
export declare const execaCommandSync: ExecaCommandSyncMethod<{}>;

type ExecaCommandSyncMethod<OptionsType extends SyncOptions> =
	& ExecaCommandSyncBind<OptionsType>
	& ExecaCommandSyncTemplate<OptionsType>
	& ExecaCommandSyncArray<OptionsType>;

// `execaCommandSync(options)` binding
type ExecaCommandSyncBind<OptionsType extends SyncOptions> =
	<NewOptionsType extends SyncOptions = {}>(options: NewOptionsType)
	=> ExecaCommandSyncMethod<OptionsType & NewOptionsType>;

// `execaCommandSync`command`` template syntax
type ExecaCommandSyncTemplate<OptionsType extends SyncOptions> =
	(...templateString: SimpleTemplateString)
	=> SyncResult<OptionsType>;

// `execaCommandSync('command', {})` array syntax
type ExecaCommandSyncArray<OptionsType extends SyncOptions> =
	<NewOptionsType extends SyncOptions = {}>(command: string, options?: NewOptionsType)
	=> SyncResult<OptionsType & NewOptionsType>;

/**
Split a `command` string into an array. For example, `'npm run build'` returns `['npm', 'run', 'build']` and `'argument otherArgument'` returns `['argument', 'otherArgument']`.

@param command - The file to execute and/or its arguments.
@returns fileOrArgument[]

@example
```
import {execa, parseCommandString} from 'execa';

const commandString = 'npm run task';
const commandArray = parseCommandString(commandString);
await execa`${commandArray}`;

const [file, ...commandArguments] = commandArray;
await execa(file, commandArguments);
```
*/
export function parseCommandString(command: string): string[];
