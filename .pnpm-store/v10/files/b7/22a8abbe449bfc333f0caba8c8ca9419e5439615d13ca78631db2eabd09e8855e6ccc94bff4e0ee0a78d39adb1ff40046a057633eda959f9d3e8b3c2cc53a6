# Installation
> `npm install --save @types/graceful-fs`

# Summary
This package contains type definitions for graceful-fs (https://github.com/isaacs/node-graceful-fs).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/graceful-fs.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/graceful-fs/index.d.ts)
````ts
/// <reference types="node" />

export * from "fs";

/**
 * Use this method to patch the global fs module (or any other fs-like module).
 * NOTE: This should only ever be done at the top-level application layer, in order to delay on
 * EMFILE errors from any fs-using dependencies. You should **not** do this in a library, because
 * it can cause unexpected delays in other parts of the program.
 * @param fsModule The reference to the fs module or an fs-like module.
 */
export function gracefulify<T>(fsModule: T): T;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 03:09:37 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)

# Credits
These definitions were written by [Bart van der Schoor](https://github.com/Bartvds), and [BendingBender](https://github.com/BendingBender).
