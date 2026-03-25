"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FilterBy = exports.IS_READ_ONLY = void 0;
exports.IS_READ_ONLY = true;
var FilterBy;
(function (FilterBy) {
    FilterBy["MODULE"] = "MODULE";
    FilterBy["ACLCAT"] = "ACLCAT";
    FilterBy["PATTERN"] = "PATTERN";
})(FilterBy || (exports.FilterBy = FilterBy = {}));
function transformArguments(filter) {
    const args = ['COMMAND', 'LIST'];
    if (filter) {
        args.push('FILTERBY', filter.filterBy, filter.value);
    }
    return args;
}
exports.transformArguments = transformArguments;
