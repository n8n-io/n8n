"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessThanEqualsFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class LessThanEqualsFilter extends Filter_1.Filter {
    constructor(options = {}) {
        super();
        this.type = SearchFilter_1.SearchFilter.lessOrEqual;
        this.attribute = options.attribute || '';
        this.value = options.value || '';
    }
    parseFilter(reader) {
        this.attribute = reader.readString().toLowerCase();
        this.value = reader.readString();
    }
    writeFilter(writer) {
        writer.writeString(this.attribute);
        writer.writeString(this.value);
    }
    matches(objectToCheck = {}, strictAttributeCase) {
        const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
        if (typeof objectToCheckValue !== 'undefined') {
            if (strictAttributeCase) {
                return objectToCheckValue <= this.value;
            }
            return objectToCheckValue.toLowerCase() <= this.value.toLowerCase();
        }
        return false;
    }
    toString() {
        return `(${this.escape(this.attribute)}<=${this.escape(this.value)})`;
    }
}
exports.LessThanEqualsFilter = LessThanEqualsFilter;
//# sourceMappingURL=LessThanEqualsFilter.js.map