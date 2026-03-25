"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupeDocumentSpans = dedupeDocumentSpans;
function dedupeDocumentSpans(items) {
    return dedupe(items, item => [
        item.fileName,
        item.textSpan.start,
        item.textSpan.length,
    ].join(':'));
}
function dedupe(items, getKey) {
    const map = new Map();
    for (const item of items.reverse()) {
        map.set(getKey(item), item);
    }
    return [...map.values()];
}
//# sourceMappingURL=dedupe.js.map