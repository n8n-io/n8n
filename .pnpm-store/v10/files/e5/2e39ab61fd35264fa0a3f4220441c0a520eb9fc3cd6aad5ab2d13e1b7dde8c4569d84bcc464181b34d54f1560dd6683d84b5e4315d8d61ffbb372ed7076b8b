"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectUtils = void 0;
class ObjectUtils {
    /**
     * Checks if given value is an object.
     * We cannot use instanceof because it has problems when running on different contexts.
     * And we don't simply use typeof because typeof null === "object".
     */
    static isObject(val) {
        return val !== null && typeof val === "object";
    }
    /**
     * Checks if given value is an object.
     * We cannot use instanceof because it has problems when running on different contexts.
     * And we don't simply use typeof because typeof null === "object".
     */
    static isObjectWithName(val) {
        return (val !== null && typeof val === "object" && val["name"] !== undefined);
    }
    /**
     * Copy the values of all of the enumerable own properties from one or more source objects to a
     * target object.
     * @param target The target object to copy to.
     * @param sources One or more source objects from which to copy properties
     */
    static assign(target, ...sources) {
        for (const source of sources) {
            for (const prop of Object.getOwnPropertyNames(source)) {
                ;
                target[prop] = source[prop];
            }
        }
    }
    /**
     * Converts MixedList<T> to strictly an array of its T items.
     */
    static mixedListToArray(list) {
        if (list !== null && typeof list === "object") {
            return Object.keys(list).map((key) => list[key]);
        }
        else {
            return list;
        }
    }
}
exports.ObjectUtils = ObjectUtils;

//# sourceMappingURL=ObjectUtils.js.map
