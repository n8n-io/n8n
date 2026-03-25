"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubstringFilter = void 0;
const SearchFilter_1 = require("../SearchFilter");
const Filter_1 = require("./Filter");
class SubstringFilter extends Filter_1.Filter {
    constructor(options = {}) {
        super();
        this.type = SearchFilter_1.SearchFilter.substrings;
        this.attribute = options.attribute || '';
        this.initial = options.initial || '';
        this.any = options.any || [];
        this.final = options.final || '';
    }
    parseFilter(reader) {
        this.attribute = reader.readString().toLowerCase();
        reader.readSequence();
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            const tag = reader.peek();
            switch (tag) {
                case 0x80:
                    this.initial = reader.readString(tag);
                    if (this.attribute === 'objectclass') {
                        this.initial = this.initial.toLowerCase();
                    }
                    break;
                case 0x81: {
                    let anyValue = reader.readString(tag);
                    if (this.attribute === 'objectclass') {
                        anyValue = anyValue.toLowerCase();
                    }
                    this.any.push(anyValue);
                    break;
                }
                case 0x82:
                    this.final = reader.readString(tag);
                    if (this.attribute === 'objectclass') {
                        this.final = this.final.toLowerCase();
                    }
                    break;
                default: {
                    let type = '<null>';
                    if (tag) {
                        type = `0x${tag.toString(16)}`;
                    }
                    throw new Error(`Invalid substring filter type: ${type}`);
                }
            }
        }
    }
    writeFilter(writer) {
        writer.writeString(this.attribute);
        writer.startSequence();
        if (this.initial) {
            writer.writeString(this.initial, 0x80);
        }
        if (this.any && this.any.length) {
            for (const anyItem of this.any) {
                writer.writeString(anyItem, 0x81);
            }
        }
        if (this.final) {
            writer.writeString(this.final, 0x82);
        }
        writer.endSequence();
    }
    matches(objectToCheck = {}, strictAttributeCase) {
        const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
        if (typeof objectToCheckValue !== 'undefined') {
            let regexp = '';
            if (this.initial) {
                regexp += `^${SubstringFilter._escapeRegExp(this.initial)}.*`;
            }
            for (const anyItem of this.any) {
                regexp += `${SubstringFilter._escapeRegExp(anyItem)}.*`;
            }
            if (this.final) {
                regexp += `${SubstringFilter._escapeRegExp(this.final)}$`;
            }
            // eslint-disable-next-line security/detect-non-literal-regexp
            const matcher = new RegExp(regexp, strictAttributeCase ? 'gmu' : 'igmu');
            return matcher.test(objectToCheckValue);
        }
        return false;
    }
    toString() {
        let result = `(${this.escape(this.attribute)}=${this.escape(this.initial)}*`;
        for (const anyItem of this.any) {
            result += `${this.escape(anyItem)}*`;
        }
        result += `${this.escape(this.final)})`;
        return result;
    }
    static _escapeRegExp(str) {
        return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    }
}
exports.SubstringFilter = SubstringFilter;
//# sourceMappingURL=SubstringFilter.js.map