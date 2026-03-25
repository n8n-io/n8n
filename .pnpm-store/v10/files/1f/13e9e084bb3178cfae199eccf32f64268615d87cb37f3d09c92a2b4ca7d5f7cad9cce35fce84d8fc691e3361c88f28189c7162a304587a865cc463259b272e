"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildConnectionString = void 0;
function isQuoted(val) {
    if (val[0] !== '{') {
        return false;
    }
    for (let i = 1; i < val.length; i++) {
        if (val[i] === '}') {
            if (i + 1 === val.length) {
                // if last char, then it's quoted properly
                return true;
            }
            else if (val[i + 1] !== '}') {
                // the next char is no a `}` so there is no valid escaping here
                return false;
            }
            else {
                // we are seeing an escaped `}`, so skip ahead
                i++;
            }
        }
    }
    return false;
}
function needsQuotes(val) {
    var _a;
    return !isQuoted(val) && !!((_a = val.match(/\[|]|{|}|\|\(|\)|,|;|\?|\*|=|!|@/)) === null || _a === void 0 ? void 0 : _a.length);
}
function encodeTuple(key, value) {
    if (value === null || value === undefined) {
        return [key, ''];
    }
    switch (typeof value) {
        case 'boolean':
            return [key, value ? 'Yes' : 'No'];
        default: {
            const strVal = value.toString();
            if (needsQuotes(strVal)) {
                return [key, `{${strVal.replace(/}/g, '}}')}}`];
            }
            return [key, strVal];
        }
    }
}
function buildConnectionString(data) {
    return Object.entries(data).map(([key, value]) => {
        return encodeTuple(key.trim(), value).join('=');
    }).join(';');
}
exports.buildConnectionString = buildConnectionString;
//# sourceMappingURL=index.js.map