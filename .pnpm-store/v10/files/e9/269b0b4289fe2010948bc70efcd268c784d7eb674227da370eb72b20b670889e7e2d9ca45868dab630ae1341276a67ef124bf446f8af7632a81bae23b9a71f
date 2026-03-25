"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.every = every;
exports.findIndex = findIndex;
exports.indexOfAnyCharCode = indexOfAnyCharCode;
exports.map = map;
exports.flatten = flatten;
exports.flatMap = flatMap;
exports.some = some;
exports.sort = sort;
exports.lastOrUndefined = lastOrUndefined;
exports.last = last;
exports.equateStringsCaseInsensitive = equateStringsCaseInsensitive;
exports.equateStringsCaseSensitive = equateStringsCaseSensitive;
exports.compareStringsCaseSensitive = compareStringsCaseSensitive;
exports.getStringComparer = getStringComparer;
exports.endsWith = endsWith;
exports.stringContains = stringContains;
exports.createGetCanonicalFileName = createGetCanonicalFileName;
exports.startsWith = startsWith;
const emptyArray = [];
/**
 * Iterates through `array` by index and performs the callback on each element of array until the callback
 * returns a falsey value, then returns false.
 * If no such value is found, the callback is applied to each element of array and `true` is returned.
 */
function every(array, callback) {
    if (array) {
        for (let i = 0; i < array.length; i++) {
            if (!callback(array[i], i)) {
                return false;
            }
        }
    }
    return true;
}
/** Works like Array.prototype.findIndex, returning `-1` if no element satisfying the predicate is found. */
function findIndex(array, predicate, startIndex) {
    if (array === undefined) {
        return -1;
    }
    for (let i = startIndex ?? 0; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}
function contains(array, value, equalityComparer = equateValues) {
    if (array) {
        for (const v of array) {
            if (equalityComparer(v, value)) {
                return true;
            }
        }
    }
    return false;
}
function indexOfAnyCharCode(text, charCodes, start) {
    for (let i = start || 0; i < text.length; i++) {
        if (contains(charCodes, text.charCodeAt(i))) {
            return i;
        }
    }
    return -1;
}
function map(array, f) {
    let result;
    if (array) {
        result = [];
        for (let i = 0; i < array.length; i++) {
            result.push(f(array[i], i));
        }
    }
    return result;
}
/**
 * Flattens an array containing a mix of array or non-array elements.
 *
 * @param array The array to flatten.
 */
function flatten(array) {
    const result = [];
    for (const v of array) {
        if (v) {
            if (isArray(v)) {
                addRange(result, v);
            }
            else {
                result.push(v);
            }
        }
    }
    return result;
}
/**
 * Maps an array. If the mapped value is an array, it is spread into the result.
 *
 * @param array The array to map.
 * @param mapfn The callback used to map the result into one or more values.
 */
function flatMap(array, mapfn) {
    let result;
    if (array) {
        for (let i = 0; i < array.length; i++) {
            const v = mapfn(array[i], i);
            if (v) {
                if (isArray(v)) {
                    result = addRange(result, v);
                }
                else {
                    result = append(result, v);
                }
            }
        }
    }
    return result || emptyArray;
}
function some(array, predicate) {
    if (array) {
        if (predicate) {
            for (const v of array) {
                if (predicate(v)) {
                    return true;
                }
            }
        }
        else {
            return array.length > 0;
        }
    }
    return false;
}
// function append<T>(to: T[] | undefined, value: T): T[];
// function append<T>(to: T[] | undefined, value: T | undefined): T[] | undefined;
// function append<T>(to: Push<T>, value: T | undefined): void;
function append(to, value) {
    if (value === undefined) {
        return to;
    }
    if (to === undefined) {
        return [value];
    }
    to.push(value);
    return to;
}
/**
 * Gets the actual offset into an array for a relative offset. Negative offsets indicate a
 * position offset from the end of the array.
 */
function toOffset(array, offset) {
    return offset < 0 ? array.length + offset : offset;
}
function addRange(to, from, start, end) {
    if (from === undefined || from.length === 0) {
        return to;
    }
    if (to === undefined) {
        return from.slice(start, end);
    }
    start = start === undefined ? 0 : toOffset(from, start);
    end = end === undefined ? from.length : toOffset(from, end);
    for (let i = start; i < end && i < from.length; i++) {
        if (from[i] !== undefined) {
            to.push(from[i]);
        }
    }
    return to;
}
/**
 * Returns a new sorted array.
 */
function sort(array, comparer) {
    return (array.length === 0 ? array : array.slice().sort(comparer));
}
/**
 * Returns the last element of an array if non-empty, `undefined` otherwise.
 */
function lastOrUndefined(array) {
    return array === undefined || array.length === 0 ? undefined : array[array.length - 1];
}
function last(array) {
    // Debug.assert(array.length !== 0);
    return array[array.length - 1];
}
/**
 * Tests whether a value is an array.
 */
function isArray(value) {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}
/** Returns its argument. */
function identity(x) {
    return x;
}
/** Returns lower case string */
function toLowerCase(x) {
    return x.toLowerCase();
}
// We convert the file names to lower case as key for file name on case insensitive file system
// While doing so we need to handle special characters (eg \u0130) to ensure that we dont convert
// it to lower case, fileName with its lowercase form can exist along side it.
// Handle special characters and make those case sensitive instead
//
// |-#--|-Unicode--|-Char code-|-Desc-------------------------------------------------------------------|
// | 1. | i        | 105       | Ascii i                                                                |
// | 2. | I        | 73        | Ascii I                                                                |
// |-------- Special characters ------------------------------------------------------------------------|
// | 3. | \u0130   | 304       | Upper case I with dot above                                            |
// | 4. | i,\u0307 | 105,775   | i, followed by 775: Lower case of (3rd item)                           |
// | 5. | I,\u0307 | 73,775    | I, followed by 775: Upper case of (4th item), lower case is (4th item) |
// | 6. | \u0131   | 305       | Lower case i without dot, upper case is I (2nd item)                   |
// | 7. | \u00DF   | 223       | Lower case sharp s                                                     |
//
// Because item 3 is special where in its lowercase character has its own
// upper case form we cant convert its case.
// Rest special characters are either already in lower case format or
// they have corresponding upper case character so they dont need special handling
//
// But to avoid having to do string building for most common cases, also ignore
// a-z, 0-9, \u0131, \u00DF, \, /, ., : and space
const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g;
/**
 * Case insensitive file systems have descripencies in how they handle some characters (eg. turkish Upper case I with dot on top - \u0130)
 * This function is used in places where we want to make file name as a key on these systems
 * It is possible on mac to be able to refer to file name with I with dot on top as a fileName with its lower case form
 * But on windows we cannot. Windows can have fileName with I with dot on top next to its lower case and they can not each be referred with the lowercase forms
 * Technically we would want this function to be platform sepcific as well but
 * our api has till now only taken caseSensitive as the only input and just for some characters we dont want to update API and ensure all customers use those api
 * We could use upper case and we would still need to deal with the descripencies but
 * we want to continue using lower case since in most cases filenames are lowercasewe and wont need any case changes and avoid having to store another string for the key
 * So for this function purpose, we go ahead and assume character I with dot on top it as case sensitive since its very unlikely to use lower case form of that special character
 */
function toFileNameLowerCase(x) {
    return fileNameLowerCaseRegExp.test(x) ?
        x.replace(fileNameLowerCaseRegExp, toLowerCase) :
        x;
}
function equateValues(a, b) {
    return a === b;
}
/**
 * Compare the equality of two strings using a case-sensitive ordinal comparison.
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point after applying `toUpperCase` to each string. We always map both
 * strings to their upper-case form as some unicode characters do not properly round-trip to
 * lowercase (such as `ẞ` (German sharp capital s)).
 */
function equateStringsCaseInsensitive(a, b) {
    return a === b
        || a !== undefined
            && b !== undefined
            && a.toUpperCase() === b.toUpperCase();
}
/**
 * Compare the equality of two strings using a case-sensitive ordinal comparison.
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the
 * integer value of each code-point.
 */
function equateStringsCaseSensitive(a, b) {
    return equateValues(a, b);
}
function compareComparableValues(a, b) {
    return a === b ? 0 /* Comparison.EqualTo */ :
        a === undefined ? -1 /* Comparison.LessThan */ :
            b === undefined ? 1 /* Comparison.GreaterThan */ :
                a < b ? -1 /* Comparison.LessThan */ :
                    1 /* Comparison.GreaterThan */;
}
/**
 * Compare two strings using a case-insensitive ordinal comparison.
 *
 * Ordinal comparisons are based on the difference between the unicode code points of both
 * strings. Characters with multiple unicode representations are considered unequal. Ordinal
 * comparisons provide predictable ordering, but place "a" after "B".
 *
 * Case-insensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point after applying `toUpperCase` to each string. We always map both
 * strings to their upper-case form as some unicode characters do not properly round-trip to
 * lowercase (such as `ẞ` (German sharp capital s)).
 */
function compareStringsCaseInsensitive(a, b) {
    if (a === b) {
        return 0 /* Comparison.EqualTo */;
    }
    if (a === undefined) {
        return -1 /* Comparison.LessThan */;
    }
    if (b === undefined) {
        return 1 /* Comparison.GreaterThan */;
    }
    a = a.toUpperCase();
    b = b.toUpperCase();
    return a < b ? -1 /* Comparison.LessThan */ : a > b ? 1 /* Comparison.GreaterThan */ : 0 /* Comparison.EqualTo */;
}
/**
 * Compare two strings using a case-sensitive ordinal comparison.
 *
 * Ordinal comparisons are based on the difference between the unicode code points of both
 * strings. Characters with multiple unicode representations are considered unequal. Ordinal
 * comparisons provide predictable ordering, but place "a" after "B".
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point.
 */
function compareStringsCaseSensitive(a, b) {
    return compareComparableValues(a, b);
}
function getStringComparer(ignoreCase) {
    return ignoreCase ? compareStringsCaseInsensitive : compareStringsCaseSensitive;
}
function endsWith(str, suffix) {
    const expectedPos = str.length - suffix.length;
    return expectedPos >= 0 && str.indexOf(suffix, expectedPos) === expectedPos;
}
function stringContains(str, substring) {
    return str.indexOf(substring) !== -1;
}
function createGetCanonicalFileName(useCaseSensitiveFileNames) {
    return useCaseSensitiveFileNames ? identity : toFileNameLowerCase;
}
function startsWith(str, prefix) {
    return str.lastIndexOf(prefix, 0) === 0;
}
//# sourceMappingURL=core.js.map