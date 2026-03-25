import defineProvider from '@babel/helper-define-polyfill-provider';

const runtimeCompat = "#__secret_key__@babel/runtime__compatibility";
var index = defineProvider(({
  debug,
  targets,
  babel
}, options) => {
  if (!shallowEqual(targets, babel.targets())) {
    throw new Error("This plugin does not use the targets option. Only preset-env's targets" + " or top-level targets need to be configured for this plugin to work." + " See https://github.com/babel/babel-polyfills/issues/36 for more" + " details.");
  }
  const {
    [runtimeCompat]: {
      moduleName = null,
      useBabelRuntime = false
    } = {}
  } = options;
  return {
    name: "regenerator",
    polyfills: ["regenerator-runtime"],
    usageGlobal(meta, utils) {
      if (isRegenerator(meta)) {
        debug("regenerator-runtime");
        utils.injectGlobalImport("regenerator-runtime/runtime.js");
      }
    },
    usagePure(meta, utils, path) {
      if (isRegenerator(meta)) {
        let pureName = "regenerator-runtime";
        if (useBabelRuntime) {
          var _ref;
          const runtimeName = (_ref = moduleName != null ? moduleName : path.hub.file.get("runtimeHelpersModuleName")) != null ? _ref : "@babel/runtime";
          pureName = `${runtimeName}/regenerator`;
        }
        path.replaceWith(utils.injectDefaultImport(pureName, "regenerator-runtime"));
      }
    }
  };
});
const isRegenerator = meta => meta.kind === "global" && meta.name === "regeneratorRuntime";
function shallowEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export { index as default };
//# sourceMappingURL=index.mjs.map
