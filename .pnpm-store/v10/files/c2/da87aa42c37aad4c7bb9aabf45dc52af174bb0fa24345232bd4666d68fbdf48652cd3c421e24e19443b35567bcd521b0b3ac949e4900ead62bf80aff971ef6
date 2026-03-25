import type {Options} from '../arguments/options.js';
import type {ResultPromise} from '../subprocess/subprocess.js';
import type {TemplateString} from './template.js';

/**
Same as `execa()` but using the `node: true` option.
Executes a Node.js file using `node scriptPath ...arguments`.

When `command` is a template string, it includes both the `file` and its `arguments`.

`execaNode(options)` can be used to return a new instance of this method but with different default `options`. Consecutive calls are merged to previous ones.

This is the preferred method when executing Node.js files.

@param scriptPath - Node.js script to execute, as a string or file URL
@param arguments - Arguments to pass to `scriptPath` on execution.
@returns A `ResultPromise` that is both:
- the subprocess.
- a `Promise` either resolving with its successful `result`, or rejecting with its `error`.
@throws `ExecaError`

@example
```
import {execaNode, execa} from 'execa';

await execaNode`file.js argument`;
// Is the same as:
await execa({node: true})`file.js argument`;
// Or:
await execa`node file.js argument`;
```
*/
export declare const execaNode: ExecaNodeMethod<{}>;

/**
`execaNode()` method either exported by Execa, or bound using `execaNode(options)`.
*/
export type ExecaNodeMethod<OptionsType extends Options = Options> =
	& ExecaNodeBind<OptionsType>
	& ExecaNodeTemplate<OptionsType>
	& ExecaNodeArrayLong<OptionsType>
	& ExecaNodeArrayShort<OptionsType>;

// `execaNode(options)` binding
type ExecaNodeBind<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(options: NewOptionsType)
	=> ExecaNodeMethod<OptionsType & NewOptionsType>;

// `execaNode`command`` template syntax
type ExecaNodeTemplate<OptionsType extends Options> =
	(...templateString: TemplateString)
	=> ResultPromise<OptionsType>;

// `execaNode('script', ['argument'], {})` array syntax
type ExecaNodeArrayLong<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(scriptPath: string | URL, arguments?: readonly string[], options?: NewOptionsType)
	=> ResultPromise<OptionsType & NewOptionsType>;

// `execaNode('script', {})` array syntax
type ExecaNodeArrayShort<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(scriptPath: string | URL, options?: NewOptionsType)
	=> ResultPromise<OptionsType & NewOptionsType>;
