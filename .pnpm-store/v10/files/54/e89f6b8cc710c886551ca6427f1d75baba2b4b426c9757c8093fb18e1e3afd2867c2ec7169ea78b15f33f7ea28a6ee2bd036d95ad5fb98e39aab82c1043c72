import type {Options} from '../arguments/options.js';
import type {ResultPromise} from '../subprocess/subprocess.js';
import type {TemplateString} from './template.js';

/**
Executes a command using `file ...arguments`.

When `command` is a template string, it includes both the `file` and its `arguments`.

`execa(options)` can be used to return a new instance of this method but with different default `options`. Consecutive calls are merged to previous ones.

@param file - The program/script to execute, as a string or file URL
@param arguments - Arguments to pass to `file` on execution.
@returns A `ResultPromise` that is both:
- the subprocess.
- a `Promise` either resolving with its successful `result`, or rejecting with its `error`.
@throws `ExecaError`

@example <caption>Simple syntax</caption>

```
import {execa} from 'execa';

const {stdout} = await execa`npm run build`;
// Print command's output
console.log(stdout);
```

@example <caption>Script</caption>

```
import {$} from 'execa';

const {stdout: name} = await $`cat package.json`.pipe`grep name`;
console.log(name);

const branch = await $`git branch --show-current`;
await $`dep deploy --branch=${branch}`;

await Promise.all([
	$`sleep 1`,
	$`sleep 2`,
	$`sleep 3`,
]);

const directoryName = 'foo bar';
await $`mkdir /tmp/${directoryName}`;
```

@example <caption>Local binaries</caption>

```
$ npm install -D eslint
```

```
await execa({preferLocal: true})`eslint`;
```

@example <caption>Pipe multiple subprocesses</caption>

```
const {stdout, pipedFrom} = await execa`npm run build`
	.pipe`sort`
	.pipe`head -n 2`;

// Output of `npm run build | sort | head -n 2`
console.log(stdout);
// Output of `npm run build | sort`
console.log(pipedFrom[0].stdout);
// Output of `npm run build`
console.log(pipedFrom[0].pipedFrom[0].stdout);
```

@example <caption>Interleaved output</caption>

```
const {all} = await execa({all: true})`npm run build`;
// stdout + stderr, interleaved
console.log(all);
```

@example <caption>Programmatic + terminal output</caption>

```
const {stdout} = await execa({stdout: ['pipe', 'inherit']})`npm run build`;
// stdout is also printed to the terminal
console.log(stdout);
```

@example <caption>Simple input</caption>

```
const getInputString = () => { /* ... *\/ };
const {stdout} = await execa({input: getInputString()})`sort`;
console.log(stdout);
```

@example <caption>File input</caption>

```
// Similar to: npm run build < input.txt
await execa({stdin: {file: 'input.txt'}})`npm run build`;
```

@example <caption>File output</caption>

```
// Similar to: npm run build > output.txt
await execa({stdout: {file: 'output.txt'}})`npm run build`;
```

@example <caption>Split into text lines</caption>

```
const {stdout} = await execa({lines: true})`npm run build`;
// Print first 10 lines
console.log(stdout.slice(0, 10).join('\n'));
```

@example <caption>Iterate over text lines</caption>

```
for await (const line of execa`npm run build`) {
	if (line.includes('WARN')) {
		console.warn(line);
	}
}
```

@example <caption>Transform/filter output</caption>

```
let count = 0;

// Filter out secret lines, then prepend the line number
const transform = function * (line) {
	if (!line.includes('secret')) {
		yield `[${count++}] ${line}`;
	}
};

await execa({stdout: transform})`npm run build`;
```

@example <caption>Web streams</caption>

```
const response = await fetch('https://example.com');
await execa({stdin: response.body})`sort`;
```

@example <caption>Convert to Duplex stream</caption>

```
import {execa} from 'execa';
import {pipeline} from 'node:stream/promises';
import {createReadStream, createWriteStream} from 'node:fs';

await pipeline(
	createReadStream('./input.txt'),
	execa`node ./transform.js`.duplex(),
	createWriteStream('./output.txt'),
);
```

@example <caption>Exchange messages</caption>

```
// parent.js
import {execaNode} from 'execa';

const subprocess = execaNode`child.js`;
await subprocess.sendMessage('Hello from parent');
const message = await subprocess.getOneMessage();
console.log(message); // 'Hello from child'
```

```
// child.js
import {getOneMessage, sendMessage} from 'execa';

const message = await getOneMessage(); // 'Hello from parent'
const newMessage = message.replace('parent', 'child'); // 'Hello from child'
await sendMessage(newMessage);
```

@example <caption>Any input type</caption>

```
// main.js
import {execaNode} from 'execa';

const ipcInput = [
	{task: 'lint', ignore: /test\.js/},
	{task: 'copy', files: new Set(['main.js', 'index.js']),
}];
await execaNode({ipcInput})`build.js`;
```

```
// build.js
import {getOneMessage} from 'execa';

const ipcInput = await getOneMessage();
```

@example <caption>Any output type</caption>

```
// main.js
import {execaNode} from 'execa';

const {ipcOutput} = await execaNode`build.js`;
console.log(ipcOutput[0]); // {kind: 'start', timestamp: date}
console.log(ipcOutput[1]); // {kind: 'stop', timestamp: date}
```

```
// build.js
import {sendMessage} from 'execa';

const runBuild = () => { /* ... *\/ };

await sendMessage({kind: 'start', timestamp: new Date()});
await runBuild();
await sendMessage({kind: 'stop', timestamp: new Date()});
```

@example <caption>Graceful termination</caption>

```
// main.js
import {execaNode} from 'execa';

const controller = new AbortController();
setTimeout(() => {
	controller.abort();
}, 5000);

await execaNode({
	cancelSignal: controller.signal,
	gracefulCancel: true,
})`build.js`;
```

```
// build.js
import {getCancelSignal} from 'execa';

const cancelSignal = await getCancelSignal();
const url = 'https://example.com/build/info';
const response = await fetch(url, {signal: cancelSignal});
```

@example <caption>Detailed error</caption>

```
import {execa, ExecaError} from 'execa';

try {
	await execa`unknown command`;
} catch (error) {
	if (error instanceof ExecaError) {
		console.log(error);
	}
	/*
	ExecaError: Command failed with ENOENT: unknown command
	spawn unknown ENOENT
			at ...
			at ... {
		shortMessage: 'Command failed with ENOENT: unknown command\nspawn unknown ENOENT',
		originalMessage: 'spawn unknown ENOENT',
		command: 'unknown command',
		escapedCommand: 'unknown command',
		cwd: '/path/to/cwd',
		durationMs: 28.217566,
		failed: true,
		timedOut: false,
		isCanceled: false,
		isTerminated: false,
		isMaxBuffer: false,
		code: 'ENOENT',
		stdout: '',
		stderr: '',
		stdio: [undefined, '', ''],
		pipedFrom: []
		[cause]: Error: spawn unknown ENOENT
				at ...
				at ... {
			errno: -2,
			code: 'ENOENT',
			syscall: 'spawn unknown',
			path: 'unknown',
			spawnargs: [ 'command' ]
		}
	}
	*\/
}
```

@example <caption>Verbose mode</caption>

```
await execa`npm run build`;
await execa`npm run test`;
```

```
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

@example <caption>Custom logging</caption>

```
import {execa as execa_} from 'execa';
import {createLogger, transports} from 'winston';

// Log to a file using Winston
const transport = new transports.File({filename: 'logs.txt'});
const logger = createLogger({transports: [transport]});
const LOG_LEVELS = {
	command: 'info',
	output: 'verbose',
	ipc: 'verbose',
	error: 'error',
	duration: 'info',
};

const execa = execa_({
	verbose(verboseLine, {message, ...verboseObject}) {
		const level = LOG_LEVELS[verboseObject.type];
		logger[level](message, verboseObject);
	},
});

await execa`npm run build`;
await execa`npm run test`;
```
*/
export declare const execa: ExecaMethod<{}>;

/**
`execa()` method either exported by Execa, or bound using `execa(options)`.
*/
export type ExecaMethod<OptionsType extends Options = Options> =
	& ExecaBind<OptionsType>
	& ExecaTemplate<OptionsType>
	& ExecaArrayLong<OptionsType>
	& ExecaArrayShort<OptionsType>;

// `execa(options)` binding
type ExecaBind<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(options: NewOptionsType)
	=> ExecaMethod<OptionsType & NewOptionsType>;

// `execa`command`` template syntax
type ExecaTemplate<OptionsType extends Options> =
	(...templateString: TemplateString)
	=> ResultPromise<OptionsType>;

// `execa('file', ['argument'], {})` array syntax
type ExecaArrayLong<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(file: string | URL, arguments?: readonly string[], options?: NewOptionsType)
	=> ResultPromise<OptionsType & NewOptionsType>;

// `execa('file', {})` array syntax
type ExecaArrayShort<OptionsType extends Options> =
	<NewOptionsType extends Options = {}>(file: string | URL, options?: NewOptionsType)
	=> ResultPromise<OptionsType & NewOptionsType>;
