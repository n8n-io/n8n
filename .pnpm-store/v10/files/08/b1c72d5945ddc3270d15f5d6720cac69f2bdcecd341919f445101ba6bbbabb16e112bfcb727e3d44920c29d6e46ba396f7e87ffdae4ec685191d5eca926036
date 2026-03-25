"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "defaultExtractor", {
    enumerable: true,
    get: function() {
        return defaultExtractor;
    }
});
const _regex = /*#__PURE__*/ _interop_require_wildcard(require("./regex"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function defaultExtractor(context) {
    let patterns = Array.from(buildRegExps(context));
    /**
   * @param {string} content
   */ return (content)=>{
        /** @type {(string|string)[]} */ let results = [];
        for (let pattern of patterns){
            var _content_match;
            for (let result of (_content_match = content.match(pattern)) !== null && _content_match !== void 0 ? _content_match : []){
                results.push(clipAtBalancedParens(result));
            }
        }
        return results;
    };
}
function* buildRegExps(context) {
    let separator = context.tailwindConfig.separator;
    let prefix = context.tailwindConfig.prefix !== "" ? _regex.optional(_regex.pattern([
        /-?/,
        _regex.escape(context.tailwindConfig.prefix)
    ])) : "";
    let utility = _regex.any([
        // Arbitrary properties (without square brackets)
        /\[[^\s:'"`]+:[^\s\[\]]+\]/,
        // Arbitrary properties with balanced square brackets
        // This is a targeted fix to continue to allow theme()
        // with square brackets to work in arbitrary properties
        // while fixing a problem with the regex matching too much
        /\[[^\s:'"`\]]+:[^\s]+?\[[^\s]+\][^\s]+?\]/,
        // Utilities
        _regex.pattern([
            // Utility Name / Group Name
            _regex.any([
                /-?(?:\w+)/,
                // This is here to make sure @container supports everything that other utilities do
                /@(?:\w+)/
            ]),
            // Normal/Arbitrary values
            _regex.optional(_regex.any([
                _regex.pattern([
                    // Arbitrary values
                    _regex.any([
                        /-(?:\w+-)*\['[^\s]+'\]/,
                        /-(?:\w+-)*\["[^\s]+"\]/,
                        /-(?:\w+-)*\[`[^\s]+`\]/,
                        /-(?:\w+-)*\[(?:[^\s\[\]]+\[[^\s\[\]]+\])*[^\s:\[\]]+\]/
                    ]),
                    // Not immediately followed by an `{[(`
                    /(?![{([]])/,
                    // optionally followed by an opacity modifier
                    /(?:\/[^\s'"`\\><$]*)?/
                ]),
                _regex.pattern([
                    // Arbitrary values
                    _regex.any([
                        /-(?:\w+-)*\['[^\s]+'\]/,
                        /-(?:\w+-)*\["[^\s]+"\]/,
                        /-(?:\w+-)*\[`[^\s]+`\]/,
                        /-(?:\w+-)*\[(?:[^\s\[\]]+\[[^\s\[\]]+\])*[^\s\[\]]+\]/
                    ]),
                    // Not immediately followed by an `{[(`
                    /(?![{([]])/,
                    // optionally followed by an opacity modifier
                    /(?:\/[^\s'"`\\$]*)?/
                ]),
                // Normal values w/o quotes — may include an opacity modifier
                /[-\/][^\s'"`\\$={><]*/
            ]))
        ])
    ]);
    let variantPatterns = [
        // Without quotes
        _regex.any([
            // This is here to provide special support for the `@` variant
            _regex.pattern([
                /@\[[^\s"'`]+\](\/[^\s"'`]+)?/,
                separator
            ]),
            // With variant modifier (e.g.: group-[..]/modifier)
            _regex.pattern([
                /([^\s"'`\[\\]+-)?\[[^\s"'`]+\]\/[\w_-]+/,
                separator
            ]),
            _regex.pattern([
                /([^\s"'`\[\\]+-)?\[[^\s"'`]+\]/,
                separator
            ]),
            _regex.pattern([
                /[^\s"'`\[\\]+/,
                separator
            ])
        ]),
        // With quotes allowed
        _regex.any([
            // With variant modifier (e.g.: group-[..]/modifier)
            _regex.pattern([
                /([^\s"'`\[\\]+-)?\[[^\s`]+\]\/[\w_-]+/,
                separator
            ]),
            _regex.pattern([
                /([^\s"'`\[\\]+-)?\[[^\s`]+\]/,
                separator
            ]),
            _regex.pattern([
                /[^\s`\[\\]+/,
                separator
            ])
        ])
    ];
    for (const variantPattern of variantPatterns){
        yield _regex.pattern([
            // Variants
            "((?=((",
            variantPattern,
            ")+))\\2)?",
            // Important (optional)
            /!?/,
            prefix,
            utility
        ]);
    }
    // 5. Inner matches
    yield /[^<>"'`\s.(){}[\]#=%$]*[^<>"'`\s.(){}[\]#=%:$]/g;
}
// We want to capture any "special" characters
// AND the characters immediately following them (if there is one)
let SPECIALS = /([\[\]'"`])([^\[\]'"`])?/g;
let ALLOWED_CLASS_CHARACTERS = /[^"'`\s<>\]]+/;
/**
 * Clips a string ensuring that parentheses, quotes, etc… are balanced
 * Used for arbitrary values only
 *
 * We will go past the end of the balanced parens until we find a non-class character
 *
 * Depth matching behavior:
 * w-[calc(100%-theme('spacing[some_key][1.5]'))]']
 *   ┬    ┬          ┬┬       ┬        ┬┬   ┬┬┬┬┬┬┬
 *   1    2          3        4        34   3 210 END
 *   ╰────┴──────────┴────────┴────────┴┴───┴─┴┴┴
 *
 * @param {string} input
 */ function clipAtBalancedParens(input) {
    // We are care about this for arbitrary values
    if (!input.includes("-[")) {
        return input;
    }
    let depth = 0;
    let openStringTypes = [];
    // Find all parens, brackets, quotes, etc
    // Stop when we end at a balanced pair
    // This is naive and will treat mismatched parens as balanced
    // This shouldn't be a problem in practice though
    let matches = input.matchAll(SPECIALS);
    // We can't use lookbehind assertions because we have to support Safari
    // So, instead, we've emulated it using capture groups and we'll re-work the matches to accommodate
    matches = Array.from(matches).flatMap((match)=>{
        const [, ...groups] = match;
        return groups.map((group, idx)=>Object.assign([], match, {
                index: match.index + idx,
                0: group
            }));
    });
    for (let match of matches){
        let char = match[0];
        let inStringType = openStringTypes[openStringTypes.length - 1];
        if (char === inStringType) {
            openStringTypes.pop();
        } else if (char === "'" || char === '"' || char === "`") {
            openStringTypes.push(char);
        }
        if (inStringType) {
            continue;
        } else if (char === "[") {
            depth++;
            continue;
        } else if (char === "]") {
            depth--;
            continue;
        }
        // We've gone one character past the point where we should stop
        // This means that there was an extra closing `]`
        // We'll clip to just before it
        if (depth < 0) {
            return input.substring(0, match.index - 1);
        }
        // We've finished balancing the brackets but there still may be characters that can be included
        // For example in the class `text-[#336699]/[.35]`
        // The depth goes to `0` at the closing `]` but goes up again at the `[`
        // If we're at zero and encounter a non-class character then we clip the class there
        if (depth === 0 && !ALLOWED_CLASS_CHARACTERS.test(char)) {
            return input.substring(0, match.index);
        }
    }
    return input;
} // Regular utilities
 // {{modifier}:}*{namespace}{-{suffix}}*{/{opacityModifier}}?
 // Arbitrary values
 // {{modifier}:}*{namespace}-[{arbitraryValue}]{/{opacityModifier}}?
 // arbitraryValue: no whitespace, balanced quotes unless within quotes, balanced brackets unless within quotes
 // Arbitrary properties
 // {{modifier}:}*[{validCssPropertyName}:{arbitraryValue}]
