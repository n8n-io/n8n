"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEpub = void 0;
function isEpub(data, buf) {
    let txt = (typeof data == 'string' && !buf) ? data : data.toString("utf-8").toLowerCase().trim();
    if (txt === 'application/epub+zip') {
        return data;
    }
    return null;
}
exports.isEpub = isEpub;
//# sourceMappingURL=isEpub.js.map