"use strict";

var _object_without_properties_loose = require("./_object_without_properties_loose.cjs");

function _object_without_properties(source, excluded) {
    if (source == null) return {};

    var target = _object_without_properties_loose._(source, excluded);
    var key, i;

    if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
        for (i = 0; i < sourceSymbolKeys.length; i++) {
            key = sourceSymbolKeys[i];
            if (excluded.indexOf(key) >= 0) continue;
            if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
            target[key] = source[key];
        }
    }

    return target;
}
exports._ = _object_without_properties;
