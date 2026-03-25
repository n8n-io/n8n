"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class PresenceFilter extends Filter_1.Filter {
    constructor(options = {}) {
        super();
        this.type = SearchFilter_1.SearchFilter.present;
        this.attribute = options.attribute || '';
    }
    parseFilter(reader) {
        this.attribute = reader.buffer.slice(0, reader.length).toString('utf8').toLowerCase();
        reader._offset += reader.length;
    }
    writeFilter(writer) {
        for (let i = 0; i < this.attribute.length; i += 1) {
            writer.writeByte(this.attribute.charCodeAt(i));
        }
    }
    matches(objectToCheck = {}, strictAttributeCase) {
        const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
        return typeof objectToCheckValue !== 'undefined';
    }
    toString() {
        return `(${this.escape(this.attribute)}=*)`;
    }
}
exports.PresenceFilter = PresenceFilter;
//# sourceMappingURL=PresenceFilter.js.map