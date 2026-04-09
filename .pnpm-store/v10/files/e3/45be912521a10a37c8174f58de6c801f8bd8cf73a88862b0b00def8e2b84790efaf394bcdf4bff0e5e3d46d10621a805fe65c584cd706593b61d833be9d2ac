# Installation
> `npm install --save @types/basic-auth`

# Summary
This package contains type definitions for basic-auth (https://github.com/jshttp/basic-auth).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/basic-auth.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/basic-auth/index.d.ts)
````ts
/// <reference types="node" />

interface Request {
    headers?: {
        authorization?: string | undefined;
    };
}

// See https://github.com/jshttp/basic-auth/blob/v1.1.0/index.js#L49
declare function auth(req: Request): auth.BasicAuthResult | undefined;

declare namespace auth {
    interface BasicAuthResult {
        name: string;
        pass: string;
    }

    /**
     * Parse basic auth to object.
     */
    function parse(authorizationHeader: string): BasicAuthResult | undefined;
}

export = auth;

````

### Additional Details
 * Last updated: Sat, 03 Feb 2024 04:35:43 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)

# Credits
These definitions were written by [Clément Bourgeois](https://github.com/moonpyk), [Vesa Poikajärvi](https://github.com/vesse), and [Ryo Ota](https://github.com/nwtgck).
