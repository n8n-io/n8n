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
    withAlphaValue: function() {
        return withAlphaValue;
    },
    default: function() {
        return withAlphaVariable;
    }
});
const _color = require("./color");
function withAlphaValue(color, alphaValue, defaultValue) {
    if (typeof color === "function") {
        return color({
            opacityValue: alphaValue
        });
    }
    let parsed = (0, _color.parseColor)(color, {
        loose: true
    });
    if (parsed === null) {
        return defaultValue;
    }
    return (0, _color.formatColor)({
        ...parsed,
        alpha: alphaValue
    });
}
function withAlphaVariable({ color , property , variable  }) {
    let properties = [].concat(property);
    if (typeof color === "function") {
        return {
            [variable]: "1",
            ...Object.fromEntries(properties.map((p)=>{
                return [
                    p,
                    color({
                        opacityVariable: variable,
                        opacityValue: `var(${variable}, 1)`
                    })
                ];
            }))
        };
    }
    const parsed = (0, _color.parseColor)(color);
    if (parsed === null) {
        return Object.fromEntries(properties.map((p)=>[
                p,
                color
            ]));
    }
    if (parsed.alpha !== undefined) {
        // Has an alpha value, return color as-is
        return Object.fromEntries(properties.map((p)=>[
                p,
                color
            ]));
    }
    return {
        [variable]: "1",
        ...Object.fromEntries(properties.map((p)=>{
            return [
                p,
                (0, _color.formatColor)({
                    ...parsed,
                    alpha: `var(${variable}, 1)`
                })
            ];
        }))
    };
}
