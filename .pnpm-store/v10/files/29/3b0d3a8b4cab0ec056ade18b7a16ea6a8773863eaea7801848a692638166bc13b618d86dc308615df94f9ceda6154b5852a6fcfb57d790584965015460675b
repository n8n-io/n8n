# Installation
> `npm install --save @types/caseless`

# Summary
This package contains type definitions for caseless (https://github.com/mikeal/caseless).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/caseless.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/caseless/index.d.ts)
````ts
type KeyType = string;
type ValueType = any;
type RawDict = object;

declare function caseless(dict?: RawDict): caseless.Caseless;

declare namespace caseless {
    function httpify(resp: object, headers: RawDict): Caseless;

    interface Caseless {
        set(name: KeyType, value: ValueType, clobber?: boolean): KeyType | false;
        set(dict: RawDict): void;
        has(name: KeyType): KeyType | false;
        get(name: KeyType): ValueType | undefined;
        swap(name: KeyType): void;
        del(name: KeyType): boolean;
    }

    interface Httpified {
        headers: RawDict;
        setHeader(name: KeyType, value: ValueType, clobber?: boolean): KeyType | false;
        setHeader(dict: RawDict): void;
        hasHeader(name: KeyType): KeyType | false;
        getHeader(name: KeyType): ValueType | undefined;
        removeHeader(name: KeyType): boolean;
    }
}

export = caseless;

````

### Additional Details
 * Last updated: Mon, 06 Nov 2023 22:41:05 GMT
 * Dependencies: none

# Credits
These definitions were written by [downace](https://github.com/downace), [Matt R. Wilson](https://github.com/mastermatt), and [Emily Klassen](https://github.com/forivall).
