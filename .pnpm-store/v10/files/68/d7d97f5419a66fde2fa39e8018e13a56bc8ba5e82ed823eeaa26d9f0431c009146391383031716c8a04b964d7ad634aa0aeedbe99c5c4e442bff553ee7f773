import { Observable } from '../Observable';
import { argsArgArrayOrObject } from '../util/argsArgArrayOrObject';
import { innerFrom } from './innerFrom';
import { popResultSelector } from '../util/args';
import { createOperatorSubscriber } from '../operators/OperatorSubscriber';
import { mapOneOrManyArgs } from '../util/mapOneOrManyArgs';
import { createObject } from '../util/createObject';
export function forkJoin() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = popResultSelector(args);
    var _a = argsArgArrayOrObject(args), sources = _a.args, keys = _a.keys;
    var result = new Observable(function (subscriber) {
        var length = sources.length;
        if (!length) {
            subscriber.complete();
            return;
        }
        var values = new Array(length);
        var remainingCompletions = length;
        var remainingEmissions = length;
        var _loop_1 = function (sourceIndex) {
            var hasValue = false;
            innerFrom(sources[sourceIndex]).subscribe(createOperatorSubscriber(subscriber, function (value) {
                if (!hasValue) {
                    hasValue = true;
                    remainingEmissions--;
                }
                values[sourceIndex] = value;
            }, function () { return remainingCompletions--; }, undefined, function () {
                if (!remainingCompletions || !hasValue) {
                    if (!remainingEmissions) {
                        subscriber.next(keys ? createObject(keys, values) : values);
                    }
                    subscriber.complete();
                }
            }));
        };
        for (var sourceIndex = 0; sourceIndex < length; sourceIndex++) {
            _loop_1(sourceIndex);
        }
    });
    return resultSelector ? result.pipe(mapOneOrManyArgs(resultSelector)) : result;
}
//# sourceMappingURL=forkJoin.js.map