"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "validateConfig", {
    enumerable: true,
    get: function() {
        return validateConfig;
    }
});
const _log = /*#__PURE__*/ _interop_require_default(require("./log"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function validateConfig(config) {
    if (config.content.files.length === 0) {
        _log.default.warn("content-problems", [
            "The `content` option in your Tailwind CSS configuration is missing or empty.",
            "Configure your content sources or your generated CSS will be missing styles.",
            "https://tailwindcss.com/docs/content-configuration"
        ]);
    }
    // Warn if the line-clamp plugin is installed
    try {
        let plugin = require("@tailwindcss/line-clamp");
        if (config.plugins.includes(plugin)) {
            _log.default.warn("line-clamp-in-core", [
                "As of Tailwind CSS v3.3, the `@tailwindcss/line-clamp` plugin is now included by default.",
                "Remove it from the `plugins` array in your configuration to eliminate this warning."
            ]);
            config.plugins = config.plugins.filter((p)=>p !== plugin);
        }
    } catch  {}
    return config;
}
