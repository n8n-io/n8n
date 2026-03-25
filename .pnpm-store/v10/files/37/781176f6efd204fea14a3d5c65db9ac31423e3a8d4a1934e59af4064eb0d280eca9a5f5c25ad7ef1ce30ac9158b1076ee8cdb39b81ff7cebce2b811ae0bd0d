"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedArray = computedArray;
const index_js_1 = require("../index.js");
function computedArray(arr, getGetter) {
    const length = (0, index_js_1.computed)(() => arr.get().length);
    const keys = (0, index_js_1.computed)(() => {
        const keys = [];
        for (let i = 0; i < length.get(); i++) {
            keys.push(String(i));
        }
        return keys;
    });
    const items = (0, index_js_1.computed)((array) => {
        array ??= [];
        while (array.length < length.get()) {
            const index = array.length;
            const item = (0, index_js_1.computed)(() => arr.get()[index]);
            array.push((0, index_js_1.computed)(getGetter(item, index)));
        }
        if (array.length > length.get()) {
            array.length = length.get();
        }
        return array;
    });
    return new Proxy({}, {
        get(_, p, receiver) {
            if (p === 'length') {
                return length.get();
            }
            if (typeof p === 'string' && !isNaN(Number(p))) {
                return items.get()[Number(p)]?.get();
            }
            return Reflect.get(items.get(), p, receiver);
        },
        has(_, p) {
            return Reflect.has(items.get(), p);
        },
        ownKeys() {
            return keys.get();
        },
    });
}
