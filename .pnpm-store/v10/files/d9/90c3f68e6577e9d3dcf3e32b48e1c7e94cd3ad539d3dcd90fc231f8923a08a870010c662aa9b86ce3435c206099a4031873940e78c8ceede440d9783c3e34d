export interface Options {
	/**
	The current working directory.

	@default process.cwd()
	*/
	readonly cwd?: URL | string;

	/**
	The type of path to match.

	@default 'file'
	*/
	readonly type?: 'file' | 'directory';

	/**
	Allow symbolic links to match if they point to the requested path type.

	@default true
	*/
	readonly allowSymlinks?: boolean;
}

export interface AsyncOptions extends Options {
	/**
	The number of concurrently pending promises.

	Minimum: `1`

	@default Infinity
	*/
	readonly concurrency?: number;

	/**
	Preserve `paths` order when searching.

	Disable this to improve performance if you don't care about the order.

	@default true
	*/
	readonly preserveOrder?: boolean;
}

/**
Get the first path that exists on disk of multiple paths.

@param paths - The paths to check.
@returns The first path that exists or `undefined` if none exists.

@example
```
import {locatePath} from 'locate-path';

const files = [
	'unicorn.png',
	'rainbow.png', // Only this one actually exists on disk
	'pony.png'
];

console(await locatePath(files));
//=> 'rainbow'
```
*/
export function locatePath(
	paths: Iterable<string>,
	options?: AsyncOptions
): Promise<string | undefined>;

/**
Synchronously get the first path that exists on disk of multiple paths.

@param paths - The paths to check.
@returns The first path that exists or `undefined` if none exists.

@example
```
import {locatePathSync} from 'locate-path';

const files = [
	'unicorn.png',
	'rainbow.png', // Only this one actually exists on disk
	'pony.png'
];

console(locatePathSync(files));
//=> 'rainbow'
```
*/
export function locatePathSync(
	paths: Iterable<string>,
	options?: Options
): string | undefined;
