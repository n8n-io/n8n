const require_rolldown_runtime = require('./_virtual/rolldown_runtime.js');
const require_plugin = require('./plugin.js');
const require_index = require('./configs/index.js');

//#region lib/index.ts
var import_configs = /* @__PURE__ */ require_rolldown_runtime.__toESM(require_index.default);
require_plugin.init_plugin();
var lib_default = Object.assign(require_plugin.default, { configs: import_configs.default });

//#endregion
module.exports = lib_default;