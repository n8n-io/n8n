import {
    isES6Map,
    isObservableArray,
    isObservableMap,
    isES6Set,
    isObservableSet,
    hasProp,
    isFunction,
    objectPrototype
} from "../internal"

declare const Symbol
const toString = objectPrototype.toString

export function deepEqual(a: any, b: any, depth: number = -1): boolean {
    return eq(a, b, depth)
}

// Copied from https://github.com/jashkenas/underscore/blob/5c237a7c682fb68fd5378203f0bf22dce1624854/underscore.js#L1186-L1289
// Internal recursive comparison function for `isEqual`.
function eq(a: any, b: any, depth: number, aStack?: any[], bStack?: any[]) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) {
        return a !== 0 || 1 / a === 1 / b
    }
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null) {
        return false
    }
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) {
        return b !== b
    }
    // Exhaust primitive checks
    const type = typeof a
    if (type !== "function" && type !== "object" && typeof b != "object") {
        return false
    }

    // Compare `[[Class]]` names.
    const className = toString.call(a)
    if (className !== toString.call(b)) {
        return false
    }
    switch (className) {
        // Strings, numbers, regular expressions, dates, and booleans are compared by value.
        case "[object RegExp]":
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
        case "[object String]":
            // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
            // equivalent to `new String("5")`.
            return "" + a === "" + b
        case "[object Number]":
            // `NaN`s are equivalent, but non-reflexive.
            // Object(NaN) is equivalent to NaN.
            if (+a !== +a) {
                return +b !== +b
            }
            // An `egal` comparison is performed for other numeric values.
            return +a === 0 ? 1 / +a === 1 / b : +a === +b
        case "[object Date]":
        case "[object Boolean]":
            // Coerce dates and booleans to numeric primitive values. Dates are compared by their
            // millisecond representations. Note that invalid dates with millisecond representations
            // of `NaN` are not equivalent.
            return +a === +b
        case "[object Symbol]":
            return (
                typeof Symbol !== "undefined" && Symbol.valueOf.call(a) === Symbol.valueOf.call(b)
            )
        case "[object Map]":
        case "[object Set]":
            // Maps and Sets are unwrapped to arrays of entry-pairs, adding an incidental level.
            // Hide this extra level by increasing the depth.
            if (depth >= 0) {
                depth++
            }
            break
    }
    // Unwrap any wrapped objects.
    a = unwrap(a)
    b = unwrap(b)

    const areArrays = className === "[object Array]"
    if (!areArrays) {
        if (typeof a != "object" || typeof b != "object") {
            return false
        }

        // Objects with different constructors are not equivalent, but `Object`s or `Array`s
        // from different frames are.
        const aCtor = a.constructor,
            bCtor = b.constructor
        if (
            aCtor !== bCtor &&
            !(
                isFunction(aCtor) &&
                aCtor instanceof aCtor &&
                isFunction(bCtor) &&
                bCtor instanceof bCtor
            ) &&
            "constructor" in a &&
            "constructor" in b
        ) {
            return false
        }
    }

    if (depth === 0) {
        return false
    } else if (depth < 0) {
        depth = -1
    }

    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || []
    bStack = bStack || []
    let length = aStack.length
    while (length--) {
        // Linear search. Performance is inversely proportional to the number of
        // unique nested structures.
        if (aStack[length] === a) {
            return bStack[length] === b
        }
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a)
    bStack.push(b)

    // Recursively compare objects and arrays.
    if (areArrays) {
        // Compare array lengths to determine if a deep comparison is necessary.
        length = a.length
        if (length !== b.length) {
            return false
        }
        // Deep compare the contents, ignoring non-numeric properties.
        while (length--) {
            if (!eq(a[length], b[length], depth - 1, aStack, bStack)) {
                return false
            }
        }
    } else {
        // Deep compare objects.
        const keys = Object.keys(a)
        let key
        length = keys.length
        // Ensure that both objects contain the same number of properties before comparing deep equality.
        if (Object.keys(b).length !== length) {
            return false
        }
        while (length--) {
            // Deep compare each member
            key = keys[length]
            if (!(hasProp(b, key) && eq(a[key], b[key], depth - 1, aStack, bStack))) {
                return false
            }
        }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop()
    bStack.pop()
    return true
}

function unwrap(a: any) {
    if (isObservableArray(a)) {
        return a.slice()
    }
    if (isES6Map(a) || isObservableMap(a)) {
        return Array.from(a.entries())
    }
    if (isES6Set(a) || isObservableSet(a)) {
        return Array.from(a.entries())
    }
    return a
}
