"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _plugin = require("./plugin");
const _default = Object.assign(function(opts) {
    return {
        postcssPlugin: "tailwindcss/nesting",
        Once (root, { result  }) {
            return (0, _plugin.nesting)(opts)(root, result);
        }
    };
}, {
    postcss: true
});
