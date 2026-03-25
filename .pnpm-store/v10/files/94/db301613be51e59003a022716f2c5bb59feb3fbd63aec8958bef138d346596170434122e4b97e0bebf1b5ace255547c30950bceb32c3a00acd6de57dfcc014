"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }var _pirates = require('pirates'); var pirates = _interopRequireWildcard(_pirates);

var _index = require('./index');








 function addHook(
  extension,
  sucraseOptions,
  hookOptions,
) {
  let mergedSucraseOptions = sucraseOptions;
  const sucraseOptionsEnvJSON = process.env.SUCRASE_OPTIONS;
  if (sucraseOptionsEnvJSON) {
    mergedSucraseOptions = {...mergedSucraseOptions, ...JSON.parse(sucraseOptionsEnvJSON)};
  }
  return pirates.addHook(
    (code, filePath) => {
      const {code: transformedCode, sourceMap} = _index.transform.call(void 0, code, {
        ...mergedSucraseOptions,
        sourceMapOptions: {compiledFilename: filePath},
        filePath,
      });
      const mapBase64 = Buffer.from(JSON.stringify(sourceMap)).toString("base64");
      const suffix = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${mapBase64}`;
      return `${transformedCode}\n${suffix}`;
    },
    {...hookOptions, exts: [extension]},
  );
} exports.addHook = addHook;

 function registerJS(hookOptions) {
  return addHook(".js", {transforms: ["imports", "flow", "jsx"]}, hookOptions);
} exports.registerJS = registerJS;

 function registerJSX(hookOptions) {
  return addHook(".jsx", {transforms: ["imports", "flow", "jsx"]}, hookOptions);
} exports.registerJSX = registerJSX;

 function registerTS(hookOptions) {
  return addHook(".ts", {transforms: ["imports", "typescript"]}, hookOptions);
} exports.registerTS = registerTS;

 function registerTSX(hookOptions) {
  return addHook(".tsx", {transforms: ["imports", "typescript", "jsx"]}, hookOptions);
} exports.registerTSX = registerTSX;

 function registerTSLegacyModuleInterop(hookOptions) {
  return addHook(
    ".ts",
    {
      transforms: ["imports", "typescript"],
      enableLegacyTypeScriptModuleInterop: true,
    },
    hookOptions,
  );
} exports.registerTSLegacyModuleInterop = registerTSLegacyModuleInterop;

 function registerTSXLegacyModuleInterop(hookOptions) {
  return addHook(
    ".tsx",
    {
      transforms: ["imports", "typescript", "jsx"],
      enableLegacyTypeScriptModuleInterop: true,
    },
    hookOptions,
  );
} exports.registerTSXLegacyModuleInterop = registerTSXLegacyModuleInterop;

 function registerAll(hookOptions) {
  const reverts = [
    registerJS(hookOptions),
    registerJSX(hookOptions),
    registerTS(hookOptions),
    registerTSX(hookOptions),
  ];

  return () => {
    for (const fn of reverts) {
      fn();
    }
  };
} exports.registerAll = registerAll;
