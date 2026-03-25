/**
 * Continues with the callback on the next tick.
 * @function
 * @param {function(...[*])} callback Callback to execute
 * @inner
 */
var nextTick = typeof process !== 'undefined' && process && typeof process.nextTick === 'function'
    ? (typeof setImmediate === 'function' ? setImmediate : process.nextTick)
    : setTimeout;

/**
 * Converts a JavaScript string to UTF8 bytes.
 * @param {string} str String
 * @returns {!Array.<number>} UTF8 bytes
 * @inner
 */
function stringToBytes(str) {
    var out = [],
        i = 0;
    utfx.encodeUTF16toUTF8(function() {
        if (i >= str.length) return null;
        return str.charCodeAt(i++);
    }, function(b) {
        out.push(b);
    });
    return out;
}

//? include("util/base64.js");

//? include("../../node_modules/utfx/dist/utfx-embeddable.js");

Date.now = Date.now || function() { return +new Date; }; 
