import { __read, __spreadArray } from "tslib";
import { combineLatestInit } from '../observable/combineLatest';
import { operate } from '../util/lift';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { mapOneOrManyArgs } from '../util/mapOneOrManyArgs';
import { pipe } from '../util/pipe';
import { popResultSelector } from '../util/args';
export function combineLatest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = popResultSelector(args);
    return resultSelector
        ? pipe(combineLatest.apply(void 0, __spreadArray([], __read(args))), mapOneOrManyArgs(resultSelector))
        : operate(function (source, subscriber) {
            combineLatestInit(__spreadArray([source], __read(argsOrArgArray(args))))(subscriber);
        });
}
//# sourceMappingURL=combineLatest.js.map