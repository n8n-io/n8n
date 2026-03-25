'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var constants = require('../constants.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');
var index$2 = require('../../../../hooks/use-z-index/index.js');
var error = require('../../../../utils/error.js');
var index$3 = require('../../../../hooks/use-size/index.js');
var objects = require('../../../../utils/objects.js');

const globalConfig = vue.ref();
function useGlobalConfig(key, defaultValue = void 0) {
  const config = vue.getCurrentInstance() ? vue.inject(constants.configProviderContextKey, globalConfig) : globalConfig;
  if (key) {
    return vue.computed(() => {
      var _a, _b;
      return (_b = (_a = config.value) == null ? void 0 : _a[key]) != null ? _b : defaultValue;
    });
  } else {
    return config;
  }
}
function useGlobalComponentSettings(block, sizeFallback) {
  const config = useGlobalConfig();
  const ns = index.useNamespace(block, vue.computed(() => {
    var _a;
    return ((_a = config.value) == null ? void 0 : _a.namespace) || index.defaultNamespace;
  }));
  const locale = index$1.useLocale(vue.computed(() => {
    var _a;
    return (_a = config.value) == null ? void 0 : _a.locale;
  }));
  const zIndex = index$2.useZIndex(vue.computed(() => {
    var _a;
    return ((_a = config.value) == null ? void 0 : _a.zIndex) || index$2.defaultInitialZIndex;
  }));
  const size = vue.computed(() => {
    var _a;
    return vue.unref(sizeFallback) || ((_a = config.value) == null ? void 0 : _a.size) || "";
  });
  provideGlobalConfig(vue.computed(() => vue.unref(config) || {}));
  return {
    ns,
    locale,
    zIndex,
    size
  };
}
const provideGlobalConfig = (config, app, global = false) => {
  var _a;
  const inSetup = !!vue.getCurrentInstance();
  const oldConfig = inSetup ? useGlobalConfig() : void 0;
  const provideFn = (_a = app == null ? void 0 : app.provide) != null ? _a : inSetup ? vue.provide : void 0;
  if (!provideFn) {
    error.debugWarn("provideGlobalConfig", "provideGlobalConfig() can only be used inside setup().");
    return;
  }
  const context = vue.computed(() => {
    const cfg = vue.unref(config);
    if (!(oldConfig == null ? void 0 : oldConfig.value))
      return cfg;
    return mergeConfig(oldConfig.value, cfg);
  });
  provideFn(constants.configProviderContextKey, context);
  provideFn(index$1.localeContextKey, vue.computed(() => context.value.locale));
  provideFn(index.namespaceContextKey, vue.computed(() => context.value.namespace));
  provideFn(index$2.zIndexContextKey, vue.computed(() => context.value.zIndex));
  provideFn(index$3.SIZE_INJECTION_KEY, {
    size: vue.computed(() => context.value.size || "")
  });
  if (global || !globalConfig.value) {
    globalConfig.value = context.value;
  }
  return context;
};
const mergeConfig = (a, b) => {
  var _a;
  const keys = [.../* @__PURE__ */ new Set([...objects.keysOf(a), ...objects.keysOf(b)])];
  const obj = {};
  for (const key of keys) {
    obj[key] = (_a = b[key]) != null ? _a : a[key];
  }
  return obj;
};

exports.provideGlobalConfig = provideGlobalConfig;
exports.useGlobalComponentSettings = useGlobalComponentSettings;
exports.useGlobalConfig = useGlobalConfig;
//# sourceMappingURL=use-global-config.js.map
