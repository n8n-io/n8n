import { __read, __spreadArray } from "tslib";
import { raceInit } from '../observable/race';
import { operate } from '../util/lift';
import { identity } from '../util/identity';
export function raceWith() {
    var otherSources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherSources[_i] = arguments[_i];
    }
    return !otherSources.length
        ? identity
        : operate(function (source, subscriber) {
            raceInit(__spreadArray([source], __read(otherSources)))(subscriber);
        });
}
//# sourceMappingURL=raceWith.js.map