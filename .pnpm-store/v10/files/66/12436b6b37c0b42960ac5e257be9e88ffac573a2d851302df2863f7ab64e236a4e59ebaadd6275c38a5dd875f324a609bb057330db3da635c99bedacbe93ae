const require_rolldown_runtime = require('./_virtual/rolldown_runtime.js');
const require_package = require('./package.js');

//#region lib/meta.ts
var meta_default;
var init_meta = require_rolldown_runtime.__esmMin((() => {
	meta_default = {
		name: require_package.name,
		version: require_package.version
	};
}));

//#endregion
init_meta();
exports.default = meta_default;
Object.defineProperty(exports, 'init_meta', {
  enumerable: true,
  get: function () {
    return init_meta;
  }
});