"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alias = void 0;
const ObjectUtils_1 = require("../util/ObjectUtils");
const error_1 = require("../error");
/**
 */
class Alias {
    constructor(alias) {
        ObjectUtils_1.ObjectUtils.assign(this, alias || {});
    }
    get target() {
        return this.metadata.target;
    }
    get hasMetadata() {
        return !!this._metadata;
    }
    set metadata(metadata) {
        this._metadata = metadata;
    }
    get metadata() {
        if (!this._metadata)
            throw new error_1.TypeORMError(`Cannot get entity metadata for the given alias "${this.name}"`);
        return this._metadata;
    }
}
exports.Alias = Alias;

//# sourceMappingURL=Alias.js.map
