'use strict';

const booleanSelector = (obj, key, type) => {
    if (!(key in obj))
        return undefined;
    if (obj[key] === "true")
        return true;
    if (obj[key] === "false")
        return false;
    throw new Error(`Cannot load ${type} "${key}". Expected "true" or "false", got ${obj[key]}.`);
};

const numberSelector = (obj, key, type) => {
    if (!(key in obj))
        return undefined;
    const numberValue = parseInt(obj[key], 10);
    if (Number.isNaN(numberValue)) {
        throw new TypeError(`Cannot load ${type} '${key}'. Expected number, got '${obj[key]}'.`);
    }
    return numberValue;
};

exports.SelectorType = void 0;
(function (SelectorType) {
    SelectorType["ENV"] = "env";
    SelectorType["CONFIG"] = "shared config entry";
})(exports.SelectorType || (exports.SelectorType = {}));

exports.booleanSelector = booleanSelector;
exports.numberSelector = numberSelector;
