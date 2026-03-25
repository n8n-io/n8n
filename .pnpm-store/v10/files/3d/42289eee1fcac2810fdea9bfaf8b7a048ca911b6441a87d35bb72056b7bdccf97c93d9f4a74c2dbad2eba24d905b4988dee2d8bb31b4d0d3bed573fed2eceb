"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class NotFilter extends Filter_1.Filter {
    constructor(options) {
        super();
        this.type = SearchFilter_1.SearchFilter.not;
        this.filter = options.filter;
    }
    writeFilter(writer) {
        this.filter.write(writer);
    }
    matches(objectToCheck = {}, strictAttributeCase) {
        return !this.filter.matches(objectToCheck, strictAttributeCase);
    }
    toString() {
        return `(!${this.filter.toString()})`;
    }
}
exports.NotFilter = NotFilter;
//# sourceMappingURL=NotFilter.js.map