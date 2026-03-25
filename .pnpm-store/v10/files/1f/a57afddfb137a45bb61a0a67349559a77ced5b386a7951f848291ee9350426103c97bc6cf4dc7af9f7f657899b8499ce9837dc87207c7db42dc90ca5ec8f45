"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensibleFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class ExtensibleFilter extends Filter_1.Filter {
    constructor(options = {}) {
        super();
        this.type = SearchFilter_1.SearchFilter.extensibleMatch;
        this.matchType = options.matchType || '';
        this.rule = options.rule || '';
        this.dnAttributes = options.dnAttributes === true;
        this.value = options.value || '';
    }
    parseFilter(reader) {
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            const tag = reader.peek();
            switch (tag) {
                case 0x81:
                    this.rule = reader.readString(tag);
                    break;
                case 0x82:
                    this.matchType = reader.readString(tag);
                    break;
                case 0x83:
                    this.value = reader.readString(tag);
                    break;
                case 0x84:
                    this.dnAttributes = reader.readBoolean();
                    break;
                default: {
                    let type = '<null>';
                    if (tag) {
                        type = `0x${tag.toString(16)}`;
                    }
                    throw new Error(`Invalid ext_match filter type: ${type}`);
                }
            }
        }
    }
    writeFilter(writer) {
        if (this.rule) {
            writer.writeString(this.rule, 0x81);
        }
        if (this.matchType) {
            writer.writeString(this.matchType, 0x82);
        }
        writer.writeString(this.value, 0x83);
        if (this.dnAttributes) {
            writer.writeBoolean(this.dnAttributes, 0x84);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matches(_ = {}, __) {
        throw new Error('Approximate match implementation unknown');
    }
    toString() {
        let result = `(${this.escape(this.matchType)}:`;
        if (this.dnAttributes) {
            result += 'dn:';
        }
        if (this.rule) {
            result += `${this.escape(this.rule)}:`;
        }
        result += `=${this.escape(this.value)})`;
        return result;
    }
}
exports.ExtensibleFilter = ExtensibleFilter;
//# sourceMappingURL=ExtensibleFilter.js.map