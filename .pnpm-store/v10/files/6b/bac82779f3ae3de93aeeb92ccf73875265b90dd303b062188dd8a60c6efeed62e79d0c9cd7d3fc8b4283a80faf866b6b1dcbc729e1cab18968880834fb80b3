export const lazy = (cb) => {
    let isCalled = false;
    let result;
    return (() => {
        if (!isCalled) {
            isCalled = true;
            result = cb();
        }
        return result;
    });
};
export function defineLazyProperty(object, propertyName, valueGetter) {
    const define = (value) => Object.defineProperty(object, propertyName, {
        value,
        enumerable: true,
        writable: true,
    });
    Object.defineProperty(object, propertyName, {
        configurable: true,
        enumerable: true,
        get() {
            const result = valueGetter();
            define(result);
            return result;
        },
        set(value) {
            define(value);
        },
    });
    return object;
}
//# sourceMappingURL=lazy-value.js.map