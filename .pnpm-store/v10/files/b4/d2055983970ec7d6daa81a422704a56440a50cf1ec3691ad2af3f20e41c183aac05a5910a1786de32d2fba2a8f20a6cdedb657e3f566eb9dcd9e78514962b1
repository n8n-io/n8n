"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTime = verifyTime;
function verifyTime(utcNotBefore, utcNotOnOrAfter, drift) {
    if (drift === void 0) { drift = [0, 0]; }
    var now = new Date();
    if (!utcNotBefore && !utcNotOnOrAfter) {
        // show warning because user intends to have time check but the document doesn't include corresponding information
        console.warn('You intend to have time validation however the document doesn\'t include the valid range.');
        return true;
    }
    var notBeforeLocal = null;
    var notOnOrAfterLocal = null;
    var _a = __read(drift, 2), notBeforeDrift = _a[0], notOnOrAfterDrift = _a[1];
    if (utcNotBefore && !utcNotOnOrAfter) {
        notBeforeLocal = new Date(utcNotBefore);
        return +notBeforeLocal + notBeforeDrift <= +now;
    }
    if (!utcNotBefore && utcNotOnOrAfter) {
        notOnOrAfterLocal = new Date(utcNotOnOrAfter);
        return +now < +notOnOrAfterLocal + notOnOrAfterDrift;
    }
    notBeforeLocal = new Date(utcNotBefore);
    notOnOrAfterLocal = new Date(utcNotOnOrAfter);
    return (+notBeforeLocal + notBeforeDrift <= +now &&
        +now < +notOnOrAfterLocal + notOnOrAfterDrift);
}
//# sourceMappingURL=validator.js.map