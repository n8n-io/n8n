"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproximateFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class ApproximateFilter extends Filter_1.Filter {
    constructor(options = {}) {
        super();
        this.type = SearchFilter_1.SearchFilter.approxMatch;
        this.attribute = options.attribute || '';
        this.value = options.value || '';
    }
    parseFilter(reader) {
        this.attribute = (reader.readString() || '').toLowerCase();
        this.value = reader.readString();
    }
    writeFilter(writer) {
        writer.writeString(this.attribute);
        writer.writeString(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matches(_ = {}, __) {
        throw new Error('Approximate match implementation unknown');
    }
    toString() {
        return `(${this.escape(this.attribute)}~=${this.escape(this.value)})`;
    }
}
exports.ApproximateFilter = ApproximateFilter;
//# sourceMappingURL=ApproximateFilter.js.map