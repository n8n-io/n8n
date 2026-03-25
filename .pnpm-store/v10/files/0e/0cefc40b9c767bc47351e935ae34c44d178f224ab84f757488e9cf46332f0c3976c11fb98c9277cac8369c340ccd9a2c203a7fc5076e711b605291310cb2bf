# Installation
> `npm install --save @types/ms`

# Summary
This package contains type definitions for ms (https://github.com/vercel/ms).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ms.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ms/index.d.ts)
````ts
/**
 * Short/Long format for `value`.
 *
 * @param {Number} value
 * @param {{long: boolean}} options
 * @return {String}
 */
declare function ms(value: number, options?: { long: boolean }): string;

/**
 * Parse the given `value` and return milliseconds.
 *
 * @param {ms.StringValue} value
 * @return {Number}
 */
declare function ms(value: ms.StringValue): number;

declare namespace ms {
    // Unit, UnitAnyCase, and StringValue are backported from ms@3
    // https://github.com/vercel/ms/blob/8b5923d1d86c84a9f6aba8022d416dcf2361aa8d/src/index.ts

    type Unit =
        | "Years"
        | "Year"
        | "Yrs"
        | "Yr"
        | "Y"
        | "Weeks"
        | "Week"
        | "W"
        | "Days"
        | "Day"
        | "D"
        | "Hours"
        | "Hour"
        | "Hrs"
        | "Hr"
        | "H"
        | "Minutes"
        | "Minute"
        | "Mins"
        | "Min"
        | "M"
        | "Seconds"
        | "Second"
        | "Secs"
        | "Sec"
        | "s"
        | "Milliseconds"
        | "Millisecond"
        | "Msecs"
        | "Msec"
        | "Ms";

    type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;

    type StringValue =
        | `${number}`
        | `${number}${UnitAnyCase}`
        | `${number} ${UnitAnyCase}`;
}

export = ms;

````

### Additional Details
 * Last updated: Thu, 16 Jan 2025 21:02:45 GMT
 * Dependencies: none

# Credits
These definitions were written by [Zhiyuan Wang](https://github.com/danny8002).
