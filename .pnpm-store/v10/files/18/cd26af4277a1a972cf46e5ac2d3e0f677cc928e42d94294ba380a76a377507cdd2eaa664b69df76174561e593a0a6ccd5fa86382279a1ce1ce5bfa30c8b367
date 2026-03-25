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
    default: function() {
        return resolveConfigPath;
    },
    resolveDefaultConfigPath: function() {
        return resolveDefaultConfigPath;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const defaultConfigFiles = [
    "./tailwind.config.js",
    "./tailwind.config.cjs",
    "./tailwind.config.mjs",
    "./tailwind.config.ts"
];
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
function isString(value) {
    return typeof value === "string" || value instanceof String;
}
function resolveConfigPath(pathOrConfig) {
    // require('tailwindcss')({ theme: ..., variants: ... })
    if (isObject(pathOrConfig) && pathOrConfig.config === undefined && !isEmpty(pathOrConfig)) {
        return null;
    }
    // require('tailwindcss')({ config: 'custom-config.js' })
    if (isObject(pathOrConfig) && pathOrConfig.config !== undefined && isString(pathOrConfig.config)) {
        return _path.default.resolve(pathOrConfig.config);
    }
    // require('tailwindcss')({ config: { theme: ..., variants: ... } })
    if (isObject(pathOrConfig) && pathOrConfig.config !== undefined && isObject(pathOrConfig.config)) {
        return null;
    }
    // require('tailwindcss')('custom-config.js')
    if (isString(pathOrConfig)) {
        return _path.default.resolve(pathOrConfig);
    }
    // require('tailwindcss')
    return resolveDefaultConfigPath();
}
function resolveDefaultConfigPath() {
    for (const configFile of defaultConfigFiles){
        try {
            const configPath = _path.default.resolve(configFile);
            _fs.default.accessSync(configPath);
            return configPath;
        } catch (err) {}
    }
    return null;
}
