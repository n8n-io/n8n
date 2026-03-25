"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EqualityFilter = void 0;
const asn1_1 = require("asn1");
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class EqualityFilter extends Filter_1.Filter {
    constructor(options = {}) {
        super();
        this.type = SearchFilter_1.SearchFilter.equalityMatch;
        this.attribute = options.attribute || '';
        this.value = options.value || '';
    }
    parseFilter(reader) {
        this.attribute = (reader.readString() || '').toLowerCase();
        this.value = reader.readString();
        if (this.attribute === 'objectclass') {
            this.value = this.value.toLowerCase();
        }
    }
    writeFilter(writer) {
        writer.writeString(this.attribute);
        if (Buffer.isBuffer(this.value)) {
            writer.writeBuffer(this.value, asn1_1.Ber.OctetString);
        }
        else {
            writer.writeString(this.value);
        }
    }
    matches(objectToCheck = {}, strictAttributeCase) {
        const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
        if (typeof objectToCheckValue !== 'undefined') {
            if (Buffer.isBuffer(this.value) && Buffer.isBuffer(objectToCheckValue)) {
                return this.value === objectToCheckValue;
            }
            const stringValue = Buffer.isBuffer(this.value) ? this.value.toString('utf8') : this.value;
            if (strictAttributeCase) {
                return stringValue === objectToCheckValue;
            }
            return stringValue.toLowerCase() === objectToCheckValue.toLowerCase();
        }
        return false;
    }
    toString() {
        return `(${this.escape(this.attribute)}=${this.escape(this.value)})`;
    }
}
exports.EqualityFilter = EqualityFilter;
//# sourceMappingURL=EqualityFilter.js.map