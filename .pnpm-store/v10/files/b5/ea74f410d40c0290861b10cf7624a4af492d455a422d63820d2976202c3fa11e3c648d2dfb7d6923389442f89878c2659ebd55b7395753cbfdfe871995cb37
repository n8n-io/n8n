# Installation
> `npm install --save @types/cookie-parser`

# Summary
This package contains type definitions for cookie-parser (https://github.com/expressjs/cookie-parser).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/cookie-parser.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/cookie-parser/index.d.ts)
````ts
import * as express from "express";

declare module "express" {
    // Inject additional properties on express.Request
    interface Request {
        /**
         * This request's secret.
         * Optionally set by cookie-parser if secret(s) are provided.  Can be used by other middleware.
         * [Declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) can be used to add your own properties.
         */
        secret?: string | undefined;
        /** Parsed cookies that have not been signed */
        cookies: Record<string, any>;
        /** Parsed cookies that have been signed */
        signedCookies: Record<string, any>;
    }
}

declare function cookieParser(
    secret?: string | string[],
    options?: cookieParser.CookieParseOptions,
): express.RequestHandler;

declare namespace cookieParser {
    interface CookieParseOptions {
        decode?(val: string): string;
    }

    function JSONCookie(jsonCookie: string): object | undefined;

    function JSONCookies<T extends { [key: string]: string }>(jsonCookies: T): { [P in keyof T]: object | undefined };

    function signedCookie(cookie: string, secret: string | string[]): string | false;

    function signedCookies<T extends { [key: string]: string }>(
        cookies: T,
        secret: string | string[],
    ): { [P in keyof T]?: string | false };
}

export = cookieParser;

````

### Additional Details
 * Last updated: Mon, 25 Nov 2024 21:02:24 GMT
 * Dependencies: none

 * Peer dependencies: [@types/express](https://npmjs.com/package/@types/express)

# Credits
These definitions were written by [Santi Albo](https://github.com/santialbo), and [BendingBender](https://github.com/BendingBender).
