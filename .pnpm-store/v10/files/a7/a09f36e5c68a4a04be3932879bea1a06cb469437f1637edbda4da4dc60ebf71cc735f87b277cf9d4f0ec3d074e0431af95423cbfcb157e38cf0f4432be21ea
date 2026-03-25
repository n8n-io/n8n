export type Options = {
	/**
	Change the output style.

	When `false`, returns the value in a [recompilable source form](https://ss64.com/osx/osascript.html).

	@default true

	@example
	```
	import {runAppleScript} from 'run-applescript';

	const result = await runAppleScript('return "unicorn"', {humanReadableOutput: false});

	console.log(result);
	//=> '"unicorn"'
	```
	*/
	readonly humanReadableOutput?: boolean;

	/**
	An AbortSignal that can be used to cancel the AppleScript execution.

	Only supported by the async function.
	*/
	readonly signal?: AbortSignal;
};

/**
Run AppleScript asynchronously.

@param script - The script to run.
@returns The script result.

@example
```
import {runAppleScript} from 'run-applescript';

const result = await runAppleScript('return "unicorn"');

console.log(result);
//=> 'unicorn'
```
*/
export function runAppleScript(
	script: string,
	options?: Options
): Promise<string>;

/**
Run AppleScript synchronously.

@param script - The script to run.
@returns The script result.

@example
```
import {runAppleScriptSync} from 'run-applescript';

const result = runAppleScriptSync('return "unicorn"');

console.log(result);
//=> 'unicorn'
```
*/
export function runAppleScriptSync(script: string, options?: Options): string;
