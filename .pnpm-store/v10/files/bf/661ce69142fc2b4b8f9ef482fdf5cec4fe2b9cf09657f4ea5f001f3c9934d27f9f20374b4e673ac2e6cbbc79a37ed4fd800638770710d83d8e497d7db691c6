/*
@types/readable-stream has *many* problems:
https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71923
https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71307
https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71083
https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/66049
... and many more

This allows us to bypass those problems.

Warning: Do not install @types/readable-stream alongside this package!
*/

/// <reference types="node" preserve="true" />
declare module 'readable-stream' {
	import { Readable, Writable } from 'node:stream';
	export { Readable, Writable };
}
