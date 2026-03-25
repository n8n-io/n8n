export type Options = {
	/**
	The directory to start from.

	@default process.cwd()
	*/
	readonly cwd?: URL | string;

	/**
	The type of path to match.

	@default 'file'
	*/
	readonly type?: 'file' | 'directory';

	/**
	A directory path where the search halts if no matches are found before reaching this point.

	Default: Root directory
	*/
	readonly stopAt?: URL | string;
};

/**
Find a file or directory by walking up parent directories.

@param name - The name of the file or directory to find.
@returns The found path or `undefined` if it could not be found.

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
import {findUp} from 'find-up-simple';

console.log(await findUp('unicorn.png'));
//=> '/Users/sindresorhus/unicorn.png'
```
*/
export function findUp(name: string, options?: Options): Promise<string | undefined>;

/**
Find a file or directory by walking up parent directories.

@param name - The name of the file or directory to find.
@returns The found path or `undefined` if it could not be found.

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
import {findUpSync} from 'find-up-simple';

console.log(findUpSync('unicorn.png'));
//=> '/Users/sindresorhus/unicorn.png'
```
*/
export function findUpSync(name: string, options?: Options): string | undefined;
