"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterParser = void 0;
const filters_1 = require("./filters");
const SearchFilter_1 = require("./SearchFilter");
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class FilterParser {
    static parseString(filterString) {
        if (!filterString) {
            throw new Error('Filter cannot be empty');
        }
        // Wrap input in parens if it wasn't already
        if (!filterString.startsWith('(')) {
            filterString = `(${filterString})`;
        }
        const parseResult = FilterParser._parseString(filterString, 0, filterString);
        const end = filterString.length - 1;
        if (parseResult.end < end) {
            throw new Error(`Unbalanced parens in filter string: ${filterString}`);
        }
        return parseResult.filter;
    }
    /*
     * A filter looks like this coming in:
     *      Filter ::= CHOICE {
     *              and             [0]     SET OF Filter,
     *              or              [1]     SET OF Filter,
     *              not             [2]     Filter,
     *              equalityMatch   [3]     AttributeValueAssertion,
     *              substrings      [4]     SubstringFilter,
     *              greaterOrEqual  [5]     AttributeValueAssertion,
     *              lessOrEqual     [6]     AttributeValueAssertion,
     *              present         [7]     AttributeType,
     *              approxMatch     [8]     AttributeValueAssertion,
     *              extensibleMatch [9]     MatchingRuleAssertion --v3 only
     *      }
     *
     *      SubstringFilter ::= SEQUENCE {
     *              type               AttributeType,
     *              SEQUENCE OF CHOICE {
     *                      initial          [0] IA5String,
     *                      any              [1] IA5String,
     *                      final            [2] IA5String
     *              }
     *      }
     *
     * The extensibleMatch was added in LDAPv3:
     *
     *      MatchingRuleAssertion ::= SEQUENCE {
     *              matchingRule    [1] MatchingRuleID OPTIONAL,
     *              type            [2] AttributeDescription OPTIONAL,
     *              matchValue      [3] AssertionValue,
     *              dnAttributes    [4] BOOLEAN DEFAULT FALSE
     *      }
     */
    static parse(reader) {
        const type = reader.readSequence();
        let filter;
        switch (type) {
            case SearchFilter_1.SearchFilter.and: {
                const andFilters = FilterParser._parseSet(reader);
                filter = new filters_1.AndFilter({
                    filters: andFilters,
                });
                break;
            }
            case SearchFilter_1.SearchFilter.approxMatch:
                filter = new filters_1.ApproximateFilter();
                filter.parse(reader);
                break;
            case SearchFilter_1.SearchFilter.equalityMatch:
                filter = new filters_1.EqualityFilter();
                filter.parse(reader);
                break;
            case SearchFilter_1.SearchFilter.extensibleMatch:
                filter = new filters_1.ExtensibleFilter();
                filter.parse(reader);
                break;
            case SearchFilter_1.SearchFilter.greaterOrEqual:
                filter = new filters_1.GreaterThanEqualsFilter();
                filter.parse(reader);
                break;
            case SearchFilter_1.SearchFilter.lessOrEqual:
                filter = new filters_1.LessThanEqualsFilter();
                filter.parse(reader);
                break;
            case SearchFilter_1.SearchFilter.not: {
                const innerFilter = FilterParser.parse(reader);
                filter = new filters_1.NotFilter({
                    filter: innerFilter,
                });
                break;
            }
            case SearchFilter_1.SearchFilter.or: {
                const orFilters = FilterParser._parseSet(reader);
                filter = new filters_1.OrFilter({
                    filters: orFilters,
                });
                break;
            }
            case SearchFilter_1.SearchFilter.present:
                filter = new filters_1.PresenceFilter();
                filter.parse(reader);
                break;
            case SearchFilter_1.SearchFilter.substrings:
                filter = new filters_1.SubstringFilter();
                filter.parse(reader);
                break;
            default:
                throw new Error(`Invalid search filter type: 0x${type || '<null>'}`);
        }
        return filter;
    }
    static _parseString(filterString, start, fullString) {
        let cursor = start;
        const { length } = filterString;
        let filter;
        if (filterString[cursor] !== '(') {
            throw new Error(`Missing paren: ${filterString}. Full string: ${fullString}`);
        }
        cursor += 1;
        switch (filterString[cursor]) {
            case '&': {
                cursor += 1;
                const children = [];
                do {
                    const childResult = FilterParser._parseString(filterString, cursor, fullString);
                    children.push(childResult.filter);
                    cursor = childResult.end + 1;
                } while (cursor < length && filterString[cursor] !== ')');
                filter = new filters_1.AndFilter({
                    filters: children,
                });
                break;
            }
            case '|': {
                cursor += 1;
                const children = [];
                do {
                    const childResult = FilterParser._parseString(filterString, cursor, fullString);
                    children.push(childResult.filter);
                    cursor = childResult.end + 1;
                } while (cursor < length && filterString[cursor] !== ')');
                filter = new filters_1.OrFilter({
                    filters: children,
                });
                break;
            }
            case '!': {
                const childResult = FilterParser._parseString(filterString, cursor + 1, fullString);
                filter = new filters_1.NotFilter({
                    filter: childResult.filter,
                });
                cursor = childResult.end + 1;
                break;
            }
            default: {
                const end = filterString.indexOf(')', cursor);
                if (end === -1) {
                    throw new Error(`Unbalanced parens: ${filterString}. Full string: ${fullString}`);
                }
                filter = FilterParser._parseExpressionFilterFromString(filterString.substr(cursor, end - cursor));
                cursor = end;
            }
        }
        return {
            end: cursor,
            filter,
        };
    }
    static _parseExpressionFilterFromString(filterString) {
        let attribute;
        let remainingExpression;
        if (filterString.startsWith(':')) {
            // An extensible filter can have no attribute name (Only valid when using dn and * matching-rule evaluation)
            attribute = '';
            remainingExpression = filterString;
        }
        else {
            const matches = /^[-\w]+/.exec(filterString);
            if (matches && matches.length) {
                [attribute] = matches;
                remainingExpression = filterString.substr(attribute.length);
            }
            else {
                throw new Error(`Invalid attribute name: ${filterString}`);
            }
        }
        if (remainingExpression === '=*') {
            return new filters_1.PresenceFilter({
                attribute,
            });
        }
        if (remainingExpression.startsWith('=')) {
            remainingExpression = remainingExpression.substr(1);
            if (remainingExpression.includes('*')) {
                const escapedExpression = FilterParser._unescapeSubstring(remainingExpression);
                return new filters_1.SubstringFilter({
                    attribute,
                    initial: escapedExpression.initial,
                    any: escapedExpression.any,
                    final: escapedExpression.final,
                });
            }
            return new filters_1.EqualityFilter({
                attribute,
                value: FilterParser._unescapeHexValues(remainingExpression),
            });
        }
        if (remainingExpression.startsWith('>') && remainingExpression[1] === '=') {
            return new filters_1.GreaterThanEqualsFilter({
                attribute,
                value: FilterParser._unescapeHexValues(remainingExpression.substr(2)),
            });
        }
        if (remainingExpression.startsWith('<') && remainingExpression[1] === '=') {
            return new filters_1.LessThanEqualsFilter({
                attribute,
                value: FilterParser._unescapeHexValues(remainingExpression.substr(2)),
            });
        }
        if (remainingExpression.startsWith('~') && remainingExpression[1] === '=') {
            return new filters_1.ApproximateFilter({
                attribute,
                value: FilterParser._unescapeHexValues(remainingExpression.substr(2)),
            });
        }
        if (remainingExpression.startsWith(':')) {
            return FilterParser._parseExtensibleFilterFromString(attribute, remainingExpression);
        }
        throw new Error(`Invalid expression: ${filterString}`);
    }
    static _parseExtensibleFilterFromString(attribute, filterString) {
        let dnAttributes = false;
        let rule;
        const fields = filterString.split(':');
        if (fields.length <= 1) {
            throw new Error(`Invalid extensible filter: ${filterString}`);
        }
        // Remove first entry, since it should be empty
        fields.shift();
        if (fields[0]?.toLowerCase() === 'dn') {
            dnAttributes = true;
            fields.shift();
        }
        if (fields.length && !fields[0]?.startsWith('=')) {
            rule = fields.shift();
        }
        if (fields.length && !fields[0]?.startsWith('=')) {
            throw new Error(`Missing := in extensible filter: ${filterString}`);
        }
        // Trim the leading = (from the :=) and reinsert any extra ':' characters
        const remainingExpression = fields.join(':').substr(1);
        const options = {
            matchType: attribute,
            dnAttributes,
            rule,
            value: FilterParser._unescapeHexValues(remainingExpression),
        };
        // TODO: Enable this if it's useful
        // if (remainingExpression.indexOf('*') !== -1) {
        //   const substring = FilterParser._escapeSubstring(remainingExpression);
        //   options.initial = substring.initial;
        //   options.any = substring.any;
        //   options.final = substring.final;
        // }
        return new filters_1.ExtensibleFilter(options);
    }
    static _unescapeHexValues(input) {
        let index = 0;
        const end = input.length;
        let result = '';
        while (index < end) {
            const char = input[index];
            switch (char) {
                case '(':
                    throw new Error(`Illegal unescaped character: ${char} in value: ${input}`);
                case '\\': {
                    const value = input.substr(index + 1, 2);
                    if (/^[a-fA-F0-9]{2}$/.exec(value) === null) {
                        throw new Error(`Invalid escaped hex character: ${value} in value: ${input}`);
                    }
                    result += String.fromCharCode(Number.parseInt(value, 16));
                    index += 3;
                    break;
                }
                default:
                    result += char;
                    index += 1;
                    break;
            }
        }
        return result;
    }
    static _unescapeSubstring(input) {
        const fields = input.split('*');
        if (fields.length < 2) {
            throw new Error(`Wildcard missing: ${input}`);
        }
        return {
            initial: FilterParser._unescapeHexValues(fields.shift() || ''),
            final: FilterParser._unescapeHexValues(fields.pop() || ''),
            any: fields.map((field) => FilterParser._unescapeHexValues(field)),
        };
    }
    static _parseSet(reader) {
        const filters = [];
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            filters.push(FilterParser.parse(reader));
        }
        return filters;
    }
}
exports.FilterParser = FilterParser;
//# sourceMappingURL=FilterParser.js.map