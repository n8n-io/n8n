"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class AndFilter extends Filter_1.Filter {
    constructor(options) {
        super();
        this.type = SearchFilter_1.SearchFilter.and;
        this.filters = options.filters;
    }
    writeFilter(writer) {
        for (const filter of this.filters) {
            filter.write(writer);
        }
    }
    matches(objectToCheck = {}, strictAttributeCase) {
        if (!this.filters.length) {
            // per RFC4526
            return true;
        }
        for (const filter of this.filters) {
            if (!filter.matches(objectToCheck, strictAttributeCase)) {
                return false;
            }
        }
        return true;
    }
    toString() {
        let result = '(&';
        for (const filter of this.filters) {
            result += filter.toString();
        }
        result += ')';
        return result;
    }
}
exports.AndFilter = AndFilter;
//# sourceMappingURL=AndFilter.js.map