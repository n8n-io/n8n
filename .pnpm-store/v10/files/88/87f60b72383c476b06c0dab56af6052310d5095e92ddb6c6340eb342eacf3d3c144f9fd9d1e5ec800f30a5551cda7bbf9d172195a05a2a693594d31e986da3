"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return getAllConfigs;
    }
});
const _configfull = /*#__PURE__*/ _interop_require_default(require("../../stubs/config.full.js"));
const _featureFlags = require("../featureFlags");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function getAllConfigs(config) {
    var _config_presets;
    const configs = ((_config_presets = config === null || config === void 0 ? void 0 : config.presets) !== null && _config_presets !== void 0 ? _config_presets : [
        _configfull.default
    ]).slice().reverse().flatMap((preset)=>getAllConfigs(preset instanceof Function ? preset() : preset));
    const features = {
        // Add experimental configs here...
        respectDefaultRingColorOpacity: {
            theme: {
                ringColor: ({ theme  })=>({
                        DEFAULT: "#3b82f67f",
                        ...theme("colors")
                    })
            }
        },
        disableColorOpacityUtilitiesByDefault: {
            corePlugins: {
                backgroundOpacity: false,
                borderOpacity: false,
                divideOpacity: false,
                placeholderOpacity: false,
                ringOpacity: false,
                textOpacity: false
            }
        }
    };
    const experimentals = Object.keys(features).filter((feature)=>(0, _featureFlags.flagEnabled)(config, feature)).map((feature)=>features[feature]);
    return [
        config,
        ...experimentals,
        ...configs
    ];
}
