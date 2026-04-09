// In the absence of a WeakSet or WeakMap implementation, don't break, but don't cache either.
function noop() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
}
function createWeakMap() {
    if (typeof WeakMap !== "undefined") {
        return new WeakMap();
    }
    else {
        return fakeSetOrMap();
    }
}
/**
 * Creates and returns a no-op implementation of a WeakMap / WeakSet that never stores anything.
 */
function fakeSetOrMap() {
    return {
        add: noop,
        delete: noop,
        get: noop,
        set: noop,
        has: function (k) {
            return false;
        },
    };
}
// Safe hasOwnProperty
var hop = Object.prototype.hasOwnProperty;
var has = function (obj, prop) {
    return hop.call(obj, prop);
};
// Copy all own enumerable properties from source to target
function extend(target, source) {
    for (var prop in source) {
        if (has(source, prop)) {
            target[prop] = source[prop];
        }
    }
    return target;
}
var reLeadingNewline = /^[ \t]*(?:\r\n|\r|\n)/;
var reTrailingNewline = /(?:\r\n|\r|\n)[ \t]*$/;
var reStartsWithNewlineOrIsEmpty = /^(?:[\r\n]|$)/;
var reDetectIndentation = /(?:\r\n|\r|\n)([ \t]*)(?:[^ \t\r\n]|$)/;
var reOnlyWhitespaceWithAtLeastOneNewline = /^[ \t]*[\r\n][ \t\r\n]*$/;
function _outdentArray(strings, firstInterpolatedValueSetsIndentationLevel, options) {
    // If first interpolated value is a reference to outdent,
    // determine indentation level from the indentation of the interpolated value.
    var indentationLevel = 0;
    var match = strings[0].match(reDetectIndentation);
    if (match) {
        indentationLevel = match[1].length;
    }
    var reSource = "(\\r\\n|\\r|\\n).{0," + indentationLevel + "}";
    var reMatchIndent = new RegExp(reSource, "g");
    if (firstInterpolatedValueSetsIndentationLevel) {
        strings = strings.slice(1);
    }
    var newline = options.newline, trimLeadingNewline = options.trimLeadingNewline, trimTrailingNewline = options.trimTrailingNewline;
    var normalizeNewlines = typeof newline === "string";
    var l = strings.length;
    var outdentedStrings = strings.map(function (v, i) {
        // Remove leading indentation from all lines
        v = v.replace(reMatchIndent, "$1");
        // Trim a leading newline from the first string
        if (i === 0 && trimLeadingNewline) {
            v = v.replace(reLeadingNewline, "");
        }
        // Trim a trailing newline from the last string
        if (i === l - 1 && trimTrailingNewline) {
            v = v.replace(reTrailingNewline, "");
        }
        // Normalize newlines
        if (normalizeNewlines) {
            v = v.replace(/\r\n|\n|\r/g, function (_) { return newline; });
        }
        return v;
    });
    return outdentedStrings;
}
function concatStringsAndValues(strings, values) {
    var ret = "";
    for (var i = 0, l = strings.length; i < l; i++) {
        ret += strings[i];
        if (i < l - 1) {
            ret += values[i];
        }
    }
    return ret;
}
function isTemplateStringsArray(v) {
    return has(v, "raw") && has(v, "length");
}
/**
 * It is assumed that opts will not change.  If this is a problem, clone your options object and pass the clone to
 * makeInstance
 * @param options
 * @return {outdent}
 */
function createInstance(options) {
    /** Cache of pre-processed template literal arrays */
    var arrayAutoIndentCache = createWeakMap();
    /**
       * Cache of pre-processed template literal arrays, where first interpolated value is a reference to outdent,
       * before interpolated values are injected.
       */
    var arrayFirstInterpSetsIndentCache = createWeakMap();
    function outdent(stringsOrOptions) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        /* tslint:enable:no-shadowed-variable */
        if (isTemplateStringsArray(stringsOrOptions)) {
            var strings = stringsOrOptions;
            // Is first interpolated value a reference to outdent, alone on its own line, without any preceding non-whitespace?
            var firstInterpolatedValueSetsIndentationLevel = (values[0] === outdent || values[0] === defaultOutdent) &&
                reOnlyWhitespaceWithAtLeastOneNewline.test(strings[0]) &&
                reStartsWithNewlineOrIsEmpty.test(strings[1]);
            // Perform outdentation
            var cache = firstInterpolatedValueSetsIndentationLevel
                ? arrayFirstInterpSetsIndentCache
                : arrayAutoIndentCache;
            var renderedArray = cache.get(strings);
            if (!renderedArray) {
                renderedArray = _outdentArray(strings, firstInterpolatedValueSetsIndentationLevel, options);
                cache.set(strings, renderedArray);
            }
            /** If no interpolated values, skip concatenation step */
            if (values.length === 0) {
                return renderedArray[0];
            }
            /** Concatenate string literals with interpolated values */
            var rendered = concatStringsAndValues(renderedArray, firstInterpolatedValueSetsIndentationLevel ? values.slice(1) : values);
            return rendered;
        }
        else {
            // Create and return a new instance of outdent with the given options
            return createInstance(extend(extend({}, options), stringsOrOptions || {}));
        }
    }
    var fullOutdent = extend(outdent, {
        string: function (str) {
            return _outdentArray([str], false, options)[0];
        },
    });
    return fullOutdent;
}
var defaultOutdent = createInstance({
    trimLeadingNewline: true,
    trimTrailingNewline: true,
});
// Named exports.  Simple and preferred.
// import outdent from 'outdent';
export default defaultOutdent;
// import {outdent} from 'outdent';
export { defaultOutdent as outdent };
if (typeof module !== "undefined") {
    // In webpack harmony-modules environments, module.exports is read-only,
    // so we fail gracefully.
    try {
        module.exports = defaultOutdent;
        Object.defineProperty(defaultOutdent, "__esModule", { value: true });
        defaultOutdent.default = defaultOutdent;
        defaultOutdent.outdent = defaultOutdent;
    }
    catch (e) { }
}
//# sourceMappingURL=index.js.map