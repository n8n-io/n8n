"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedArray = computedArray;
exports.computedSet = computedSet;
const alien_signals_1 = require("alien-signals");
function computedArray(arr, getGetter) {
    const length = (0, alien_signals_1.computed)(() => arr().length);
    const keys = (0, alien_signals_1.computed)(() => {
        const keys = [];
        for (let i = 0; i < length(); i++) {
            keys.push(String(i));
        }
        return keys;
    });
    const items = (0, alien_signals_1.computed)(array => {
        array ??= [];
        while (array.length < length()) {
            const index = array.length;
            const item = (0, alien_signals_1.computed)(() => arr()[index]);
            array.push((0, alien_signals_1.computed)(getGetter(item, index)));
        }
        if (array.length > length()) {
            array.length = length();
        }
        return array;
    });
    return new Proxy({}, {
        get(_, p, receiver) {
            if (p === 'length') {
                return length();
            }
            if (typeof p === 'string' && !isNaN(Number(p))) {
                return items()[Number(p)]?.();
            }
            return Reflect.get(items(), p, receiver);
        },
        has(_, p) {
            return Reflect.has(items(), p);
        },
        ownKeys() {
            return keys();
        },
    });
}
function computedSet(source) {
    return (0, alien_signals_1.computed)(oldValue => {
        const newValue = source();
        if (oldValue?.size === newValue.size && [...oldValue].every(c => newValue.has(c))) {
            return oldValue;
        }
        return newValue;
    });
}
//# sourceMappingURL=signals.js.map