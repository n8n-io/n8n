/* eslint-disable @typescript-eslint/unified-signatures */
import {Options as LocatePathOptions} from 'locate-path';

/**
Return this in a `matcher` function to stop the search and force `findUp` to immediately return `undefined`.
*/
export const findUpStop: unique symbol;

export type Match = string | typeof findUpStop | undefined;

export interface Options extends LocatePathOptions {
	/**
	The path to the directory to stop the search before reaching root if there were no matches before the `stopAt` directory.

	@default path.parse(cwd).root
	*/
	readonly stopAt?: string;
}

/**
Find a file or directory by walking up parent directories.

@param name - The name of the file or directory to find. Can be multiple.
@returns The first path found (by respecting the order of `name`s) or `undefined` if none could be found.

@example
```
// /
// └── Users
//     └── sindresorhus
//         ├── unicorn.png
//         └── foo
//             └── bar
//                 ├── baz
//                 └── example.js

// example.js
import {findUp} from 'find-up';

console.log(await findUp('unicorn.png'));
//=> '/Users/sindresorhus/unicorn.png'

console.log(await findUp(['rainbow.png', 'unicorn.png']));
//=> '/Users/sindresorhus/unicorn.png'
```
*/
export function findUp(name: string | readonly string[], options?: Options): Promise<string | undefined>;

/**
Find a file or directory by walking up parent directories.

@param matcher - Called for each directory in the search. Return a path or `findUpStop` to stop the search.
@returns The first path found or `undefined` if none could be found.

@example
```
import path from 'node:path';
import {findUp, pathExists} from 'find-up';

console.log(await findUp(async directory => {
	const hasUnicorns = await pathExists(path.join(directory, 'unicorn.png'));
	return hasUnicorns && directory;
}, {type: 'directory'}));
//=> '/Users/sindresorhus'
```
*/
export function findUp(matcher: (directory: string) => (Match | Promise<Match>), options?: Options): Promise<string | undefined>;

/**
Synchronously find a file or directory by walking up parent directories.

@param name - The name of the file or directory to find. Can be multiple.
@returns The first path found (by respecting the order of `name`s) or `undefined` if none could be found.

@example
```
// /
// └── Users
//     └── sindresorhus
//         ├── unicorn.png
//         └── foo
//             └── bar
//                 ├── baz
//                 └── example.js

// example.js
import {findUpSync} from 'find-up';

console.log(findUpSync('unicorn.png'));
//=> '/Users/sindresorhus/unicorn.png'

console.log(findUpSync(['rainbow.png', 'unicorn.png']));
//=> '/Users/sindresorhus/unicorn.png'
```
*/
export function findUpSync(name: string | readonly string[], options?: Options): string | undefined;

/**
Synchronously find a file or directory by walking up parent directories.

@param matcher - Called for each directory in the search. Return a path or `findUpStop` to stop the search.
@returns The first path found or `undefined` if none could be found.

@example
```
import path from 'node:path';
import {findUpSync, pathExistsSync} from 'find-up';

console.log(findUpSync(directory => {
	const hasUnicorns = pathExistsSync(path.join(directory, 'unicorn.png'));
	return hasUnicorns && directory;
}, {type: 'directory'}));
//=> '/Users/sindresorhus'
```
*/
export function findUpSync(matcher: (directory: string) => Match, options?: Options): string | undefined;

/**
Find files or directories by walking up parent directories.

@param name - The name of the file or directory to find. Can be multiple.
@returns All paths found (by respecting the order of `name`s) or an empty array if none could be found.

@example
```
// /
// └── Users
//     └── sindresorhus
//         ├── unicorn.png
//         └── foo
//             ├── unicorn.png
//             └── bar
//                 ├── baz
//                 └── example.js

// example.js
import {findUpMultiple} from 'find-up';

console.log(await findUpMultiple('unicorn.png'));
//=> ['/Users/sindresorhus/foo/unicorn.png', '/Users/sindresorhus/unicorn.png']

console.log(await findUpMultiple(['rainbow.png', 'unicorn.png']));
//=> ['/Users/sindresorhus/foo/unicorn.png', '/Users/sindresorhus/unicorn.png']
```
*/
export function findUpMultiple(name: string | readonly string[], options?: Options): Promise<string[]>;

/**
Find files or directories by walking up parent directories.

@param matcher - Called for each directory in the search. Return a path or `findUpStop` to stop the search.
@returns All paths found or an empty array if none could be found.

@example
```
import path from 'node:path';
import {findUpMultiple, pathExists} from 'find-up';

console.log(await findUpMultiple(async directory => {
	const hasUnicorns = await pathExists(path.join(directory, 'unicorn.png'));
	return hasUnicorns && directory;
}, {type: 'directory'}));
//=> ['/Users/sindresorhus/foo', '/Users/sindresorhus']
```
*/
export function findUpMultiple(matcher: (directory: string) => (Match | Promise<Match>), options?: Options): Promise<string[]>;

/**
Synchronously find files or directories by walking up parent directories.

@param name - The name of the file or directory to find. Can be multiple.
@returns All paths found (by respecting the order of `name`s) or an empty array if none could be found.

@example
```
// /
// └── Users
//     └── sindresorhus
//         ├── unicorn.png
//         └── foo
//             ├── unicorn.png
//             └── bar
//                 ├── baz
//                 └── example.js

// example.js
import {findUpMultipleSync} from 'find-up';

console.log(findUpMultipleSync('unicorn.png'));
//=> ['/Users/sindresorhus/foo/unicorn.png', '/Users/sindresorhus/unicorn.png']

console.log(findUpMultipleSync(['rainbow.png', 'unicorn.png']));
//=> ['/Users/sindresorhus/foo/unicorn.png', '/Users/sindresorhus/unicorn.png']
```
*/
export function findUpMultipleSync(name: string | readonly string[], options?: Options): string[];

/**
Synchronously find files or directories by walking up parent directories.

@param matcher - Called for each directory in the search. Return a path or `findUpStop` to stop the search.
@returns All paths found or an empty array if none could be found.

@example
```
import path from 'node:path';
import {findUpMultipleSync, pathExistsSync} from 'find-up';

console.log(findUpMultipleSync(directory => {
	const hasUnicorns = pathExistsSync(path.join(directory, 'unicorn.png'));
	return hasUnicorns && directory;
}, {type: 'directory'}));
//=> ['/Users/sindresorhus/foo', '/Users/sindresorhus']
```
*/
export function findUpMultipleSync(matcher: (directory: string) => Match, options?: Options): string[];

/**
Check if a path exists.

@param path - The path to a file or directory.
@returns Whether the path exists.

@example
```
import {pathExists} from 'find-up';

console.log(await pathExists('/Users/sindresorhus/unicorn.png'));
//=> true
```
*/
export function pathExists(path: string): Promise<boolean>;

/**
Synchronously check if a path exists.

@param path - Path to the file or directory.
@returns Whether the path exists.

@example
```
import {pathExistsSync} from 'find-up';

console.log(pathExistsSync('/Users/sindresorhus/unicorn.png'));
//=> true
```
*/
export function pathExistsSync(path: string): boolean;
