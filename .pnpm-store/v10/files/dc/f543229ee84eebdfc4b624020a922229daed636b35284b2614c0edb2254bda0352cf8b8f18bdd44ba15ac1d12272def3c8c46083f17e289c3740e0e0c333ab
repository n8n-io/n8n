"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isURL = isURL;
const throws = (fn) => {
    try {
        fn();
    }
    catch {
        return true;
    }
    return false;
};
function isURL(url) {
    return !throws(() => new URL(url));
}
//# sourceMappingURL=is-url.js.map