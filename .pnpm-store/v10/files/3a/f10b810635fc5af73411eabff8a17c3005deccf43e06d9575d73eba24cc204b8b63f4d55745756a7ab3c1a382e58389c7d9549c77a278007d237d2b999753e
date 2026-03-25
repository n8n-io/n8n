import {
	type ExecFileOptionsWithStringEncoding,
	type ExecFileSyncOptionsWithStringEncoding,
	type PromiseWithChild,
} from 'node:child_process';

/**
Converts a `URL` or path to a path.

__Not available in browsers.__

@example
```
import path from 'node:path';
import {toPath} from 'unicorn-magic';

// `cwd` can be `URL` or a path string.
const getUnicornPath = cwd => path.join(toPath(cwd), 'unicorn');
```
*/
export function toPath(urlOrPath: URL | string): string;

/**
Finds the root directory of the given path.

__Not available in browsers.__

On Unix-based systems, the root is always `'/'`.
On Windows, the root varies and includes the drive letter (e.g., `'C:\\'`).

This function operates purely on paths and does not interact with the file system.

@param path - The path or URL to check.
@returns The root directory of the path.

@example
```
import {rootDirectory} from 'unicorn-magic';

console.log(rootDirectory('/Users/x/y/z'));
//=> '/'

console.log(rootDirectory('C:\\Users\\x\\y\\z'));
//=> 'C:\\'
```
*/
export function rootDirectory(path: string | URL): string;

/**
Creates an iterable for traversing from a given start path up to the root directory.

__Not available in browsers.__

This function operates purely on paths and does not interact with the file system.

@param startPath - The starting path. Can be relative.
@returns An iterable that iterates over each parent directory up to the root.

Tip: To stop iteration before reaching the root, use a `break` statement within a conditional check.

@example
```
import {traversePathUp} from 'unicorn-magic';

for (const directory of traversePathUp('/Users/x/y/z')) {
	console.log(directory);
	//=> '/Users/x/y/z'
	//=> '/Users/x/y'
	//=> '/Users/x'
	//=> '/Users'
	//=> '/'
}
```
*/
export function traversePathUp(startPath: string | URL): Iterable<string>;

/**
Executes a file.

Same as the built-in `execFile` but with:
- Promise API
- 10 MB `maxBuffer` instead of 1 MB

@example
```
import {execFile} from 'unicorn-magic';

console.log(await execFile('ls', ['-l']));
```

__Not available in browsers.__
*/
export function execFile(
	file: string,
	arguments_: readonly string[],
	options?: ExecFileOptionsWithStringEncoding
): PromiseWithChild<{
	stdout: string;
	stderr: string;
}>;

/**
Executes a file synchronously.

Same as the built-in `execFileSync` but with:
- String output instead of buffer (same as `execFile`)
- Does not output `stderr` to the terminal by default (same as `execFile`)
- 10 MB `maxBuffer` instead of 1 MB

@example
```
import {execFileSync} from 'unicorn-magic';

console.log(execFileSync('ls', ['-l']));
```

__Not available in browsers.__
*/
export function execFileSync(
	file: string,
	arguments_?: readonly string[],
	options?: ExecFileSyncOptionsWithStringEncoding
): string;

export * from './default.js';
