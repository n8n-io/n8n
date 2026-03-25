"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    parseBoxShadowValue: function() {
        return parseBoxShadowValue;
    },
    formatBoxShadowValue: function() {
        return formatBoxShadowValue;
    }
});
const _splitAtTopLevelOnly = require("./splitAtTopLevelOnly");
let KEYWORDS = new Set([
    "inset",
    "inherit",
    "initial",
    "revert",
    "unset"
]);
let SPACE = /\ +(?![^(]*\))/g // Similar to the one above, but with spaces instead.
;
let LENGTH = /^-?(\d+|\.\d+)(.*?)$/g;
function parseBoxShadowValue(input) {
    let shadows = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(input, ",");
    return shadows.map((shadow)=>{
        let value = shadow.trim();
        let result = {
            raw: value
        };
        let parts = value.split(SPACE);
        let seen = new Set();
        for (let part of parts){
            // Reset index, since the regex is stateful.
            LENGTH.lastIndex = 0;
            // Keyword
            if (!seen.has("KEYWORD") && KEYWORDS.has(part)) {
                result.keyword = part;
                seen.add("KEYWORD");
            } else if (LENGTH.test(part)) {
                if (!seen.has("X")) {
                    result.x = part;
                    seen.add("X");
                } else if (!seen.has("Y")) {
                    result.y = part;
                    seen.add("Y");
                } else if (!seen.has("BLUR")) {
                    result.blur = part;
                    seen.add("BLUR");
                } else if (!seen.has("SPREAD")) {
                    result.spread = part;
                    seen.add("SPREAD");
                }
            } else {
                if (!result.color) {
                    result.color = part;
                } else {
                    if (!result.unknown) result.unknown = [];
                    result.unknown.push(part);
                }
            }
        }
        // Check if valid
        result.valid = result.x !== undefined && result.y !== undefined;
        return result;
    });
}
function formatBoxShadowValue(shadows) {
    return shadows.map((shadow)=>{
        if (!shadow.valid) {
            return shadow.raw;
        }
        return [
            shadow.keyword,
            shadow.x,
            shadow.y,
            shadow.blur,
            shadow.spread,
            shadow.color
        ].filter(Boolean).join(" ");
    }).join(", ");
}
