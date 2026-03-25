"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return transformThemeValue;
    }
});
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _isPlainObject = /*#__PURE__*/ _interop_require_default(require("./isPlainObject"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function transformThemeValue(themeSection) {
    if ([
        "fontSize",
        "outline"
    ].includes(themeSection)) {
        return (value)=>{
            if (typeof value === "function") value = value({});
            if (Array.isArray(value)) value = value[0];
            return value;
        };
    }
    if (themeSection === "fontFamily") {
        return (value)=>{
            if (typeof value === "function") value = value({});
            let families = Array.isArray(value) && (0, _isPlainObject.default)(value[1]) ? value[0] : value;
            return Array.isArray(families) ? families.join(", ") : families;
        };
    }
    if ([
        "boxShadow",
        "transitionProperty",
        "transitionDuration",
        "transitionDelay",
        "transitionTimingFunction",
        "backgroundImage",
        "backgroundSize",
        "backgroundColor",
        "cursor",
        "animation"
    ].includes(themeSection)) {
        return (value)=>{
            if (typeof value === "function") value = value({});
            if (Array.isArray(value)) value = value.join(", ");
            return value;
        };
    }
    // For backwards compatibility reasons, before we switched to underscores
    // instead of commas for arbitrary values.
    if ([
        "gridTemplateColumns",
        "gridTemplateRows",
        "objectPosition"
    ].includes(themeSection)) {
        return (value)=>{
            if (typeof value === "function") value = value({});
            if (typeof value === "string") value = _postcss.default.list.comma(value).join(" ");
            return value;
        };
    }
    return (value, opts = {})=>{
        if (typeof value === "function") {
            value = value(opts);
        }
        return value;
    };
}
