"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    asClass: function() {
        return asClass;
    },
    default: function() {
        return nameClass;
    },
    formatClass: function() {
        return formatClass;
    }
});
const _escapeClassName = /*#__PURE__*/ _interop_require_default(require("./escapeClassName"));
const _escapeCommas = /*#__PURE__*/ _interop_require_default(require("./escapeCommas"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function asClass(name) {
    return (0, _escapeCommas.default)(`.${(0, _escapeClassName.default)(name)}`);
}
function nameClass(classPrefix, key) {
    return asClass(formatClass(classPrefix, key));
}
function formatClass(classPrefix, key) {
    if (key === "DEFAULT") {
        return classPrefix;
    }
    if (key === "-" || key === "-DEFAULT") {
        return `-${classPrefix}`;
    }
    if (key.startsWith("-")) {
        return `-${classPrefix}${key}`;
    }
    if (key.startsWith("/")) {
        return `${classPrefix}${key}`;
    }
    return `${classPrefix}-${key}`;
}
