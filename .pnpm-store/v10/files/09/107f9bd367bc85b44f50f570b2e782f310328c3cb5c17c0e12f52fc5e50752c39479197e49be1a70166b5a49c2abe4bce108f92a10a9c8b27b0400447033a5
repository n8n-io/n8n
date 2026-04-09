"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperCreateRegexpFeaturesPlugin = require("@babel/helper-create-regexp-features-plugin");
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)((api, options) => {
  api.assertVersion("^7.19.0 || ^8.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  const {
    runtime
  } = options;
  if (runtime !== undefined && typeof runtime !== "boolean") {
    throw new Error("The 'runtime' option must be boolean");
  }
  return (0, _helperCreateRegexpFeaturesPlugin.createRegExpFeaturePlugin)({
    name: "transform-duplicate-named-capturing-groups-regex",
    feature: "duplicateNamedCaptureGroups",
    options: {
      runtime
    }
  });
});

//# sourceMappingURL=index.js.map
