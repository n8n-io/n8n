import { __read, __spreadArray } from "tslib";
import { operate } from '../util/lift';
import { concatAll } from './concatAll';
import { popScheduler } from '../util/args';
import { from } from '../observable/from';
export function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    return operate(function (source, subscriber) {
        concatAll()(from(__spreadArray([source], __read(args)), scheduler)).subscribe(subscriber);
    });
}
//# sourceMappingURL=concat.js.map