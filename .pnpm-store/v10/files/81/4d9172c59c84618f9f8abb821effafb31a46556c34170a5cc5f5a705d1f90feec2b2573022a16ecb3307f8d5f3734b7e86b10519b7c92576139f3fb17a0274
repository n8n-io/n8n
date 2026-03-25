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
    flagEnabled: function() {
        return flagEnabled;
    },
    issueFlagNotices: function() {
        return issueFlagNotices;
    },
    default: function() {
        return _default;
    }
});
const _picocolors = /*#__PURE__*/ _interop_require_default(require("picocolors"));
const _log = /*#__PURE__*/ _interop_require_default(require("./util/log"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let defaults = {
    optimizeUniversalDefaults: false,
    generalizedModifiers: true,
    disableColorOpacityUtilitiesByDefault: false,
    relativeContentPathsByDefault: false
};
let featureFlags = {
    future: [
        "hoverOnlyWhenSupported",
        "respectDefaultRingColorOpacity",
        "disableColorOpacityUtilitiesByDefault",
        "relativeContentPathsByDefault"
    ],
    experimental: [
        "optimizeUniversalDefaults",
        "generalizedModifiers"
    ]
};
function flagEnabled(config, flag) {
    if (featureFlags.future.includes(flag)) {
        var _config_future;
        var _config_future_flag, _ref;
        return config.future === "all" || ((_ref = (_config_future_flag = config === null || config === void 0 ? void 0 : (_config_future = config.future) === null || _config_future === void 0 ? void 0 : _config_future[flag]) !== null && _config_future_flag !== void 0 ? _config_future_flag : defaults[flag]) !== null && _ref !== void 0 ? _ref : false);
    }
    if (featureFlags.experimental.includes(flag)) {
        var _config_experimental;
        var _config_experimental_flag, _ref1;
        return config.experimental === "all" || ((_ref1 = (_config_experimental_flag = config === null || config === void 0 ? void 0 : (_config_experimental = config.experimental) === null || _config_experimental === void 0 ? void 0 : _config_experimental[flag]) !== null && _config_experimental_flag !== void 0 ? _config_experimental_flag : defaults[flag]) !== null && _ref1 !== void 0 ? _ref1 : false);
    }
    return false;
}
function experimentalFlagsEnabled(config) {
    if (config.experimental === "all") {
        return featureFlags.experimental;
    }
    var _config_experimental;
    return Object.keys((_config_experimental = config === null || config === void 0 ? void 0 : config.experimental) !== null && _config_experimental !== void 0 ? _config_experimental : {}).filter((flag)=>featureFlags.experimental.includes(flag) && config.experimental[flag]);
}
function issueFlagNotices(config) {
    if (process.env.JEST_WORKER_ID !== undefined) {
        return;
    }
    if (experimentalFlagsEnabled(config).length > 0) {
        let changes = experimentalFlagsEnabled(config).map((s)=>_picocolors.default.yellow(s)).join(", ");
        _log.default.warn("experimental-flags-enabled", [
            `You have enabled experimental features: ${changes}`,
            "Experimental features in Tailwind CSS are not covered by semver, may introduce breaking changes, and can change at any time."
        ]);
    }
}
const _default = featureFlags;
