import { isFunction } from './isFunction';
export function hasLift(source) {
    return isFunction(source === null || source === void 0 ? void 0 : source.lift);
}
export function operate(init) {
    return function (source) {
        if (hasLift(source)) {
            return source.lift(function (liftedSource) {
                try {
                    return init(liftedSource, this);
                }
                catch (err) {
                    this.error(err);
                }
            });
        }
        throw new TypeError('Unable to lift unknown Observable type');
    };
}
//# sourceMappingURL=lift.js.map