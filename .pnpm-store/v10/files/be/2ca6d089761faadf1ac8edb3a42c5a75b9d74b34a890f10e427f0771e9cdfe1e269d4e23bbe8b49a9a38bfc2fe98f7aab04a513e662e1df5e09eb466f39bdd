# Installation
> `npm install --save @types/through`

# Summary
This package contains type definitions for through (https://github.com/dominictarr/through).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/through.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/through/index.d.ts)
````ts
/// <reference types="node" />

import stream = require("stream");

declare function through(
    write?: (data: any) => void,
    end?: () => void,
    opts?: {
        autoDestroy: boolean;
    },
): through.ThroughStream;

declare namespace through {
    export interface ThroughStream extends stream.Transform {
        autoDestroy: boolean;
        queue: (chunk: any) => any;
    }
}

export = through;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 15:11:36 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)

# Credits
These definitions were written by [Andrew Gaspar](https://github.com/AndrewGaspar).
