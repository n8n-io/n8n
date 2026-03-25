"use strict";

/**
 * Returns a display name for a function
 *
 * @param  {Function} func
 * @returns {string}
 */
module.exports = function functionName(func) {
    if (!func) {
        return "";
    }

    try {
        return (
            func.displayName ||
            func.name ||
            // Use function decomposition as a last resort to get function
            // name. Does not rely on function decomposition to work - if it
            // doesn't debugging will be slightly less informative
            // (i.e. toString will say 'spy' rather than 'myFunc').
            (String(func).match(/function ([^\s(]+)/) || [])[1]
        );
    } catch (e) {
        // Stringify may fail and we might get an exception, as a last-last
        // resort fall back to empty string.
        return "";
    }
};
