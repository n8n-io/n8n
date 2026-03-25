import { __read, __spreadArray } from "tslib";
import { concat } from '../observable/concat';
import { of } from '../observable/of';
export function endWith() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    return function (source) { return concat(source, of.apply(void 0, __spreadArray([], __read(values)))); };
}
//# sourceMappingURL=endWith.js.map