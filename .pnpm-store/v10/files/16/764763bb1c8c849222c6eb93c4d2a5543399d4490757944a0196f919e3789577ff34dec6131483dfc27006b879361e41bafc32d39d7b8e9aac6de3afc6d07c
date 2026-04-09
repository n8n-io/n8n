"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pluginsBugfixes = exports.plugins = exports.overlappingPlugins = void 0;
var _availablePlugins = require("./available-plugins.js");
const originalPlugins = require("@babel/compat-data/plugins"),
  originalPluginsBugfixes = require("@babel/compat-data/plugin-bugfixes"),
  originalOverlappingPlugins = require("@babel/compat-data/overlapping-plugins");
const keys = Object.keys;
const plugins = exports.plugins = filterAvailable(originalPlugins);
const pluginsBugfixes = exports.pluginsBugfixes = filterAvailable(originalPluginsBugfixes);
const overlappingPlugins = exports.overlappingPlugins = filterAvailable(originalOverlappingPlugins);
overlappingPlugins["syntax-import-attributes"] = ["syntax-import-assertions"];
function filterAvailable(data) {
  const result = {};
  for (const plugin of keys(data)) {
    if (hasOwnProperty.call(_availablePlugins.default, plugin)) {
      result[plugin] = data[plugin];
    }
  }
  return result;
}

//# sourceMappingURL=plugins-compat-data.js.map
