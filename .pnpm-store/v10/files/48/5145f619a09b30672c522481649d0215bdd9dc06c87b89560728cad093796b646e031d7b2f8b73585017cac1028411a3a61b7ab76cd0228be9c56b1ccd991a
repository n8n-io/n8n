"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMap = void 0;
class FileMap extends Map {
    constructor(caseSensitive) {
        super();
        this.caseSensitive = caseSensitive;
        this.originalFileNames = new Map();
    }
    keys() {
        return this.originalFileNames.values();
    }
    get(key) {
        return super.get(this.normalizeId(key));
    }
    has(key) {
        return super.has(this.normalizeId(key));
    }
    set(key, value) {
        this.originalFileNames.set(this.normalizeId(key), key);
        return super.set(this.normalizeId(key), value);
    }
    delete(key) {
        this.originalFileNames.delete(this.normalizeId(key));
        return super.delete(this.normalizeId(key));
    }
    clear() {
        this.originalFileNames.clear();
        return super.clear();
    }
    normalizeId(id) {
        return this.caseSensitive ? id : id.toLowerCase();
    }
}
exports.FileMap = FileMap;
//# sourceMappingURL=utils.js.map