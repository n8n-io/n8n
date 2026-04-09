const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_plugin = require('../../plugin.js');

//#region lib/configs/flat/base.js
var require_base = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = [{
		name: "vue/base/setup",
		plugins: { get vue() {
			return (require_plugin.init_plugin(), require_rolldown_runtime.__toCommonJS(require_plugin.plugin_exports)).default;
		} },
		languageOptions: { sourceType: "module" }
	}, {
		name: "vue/base/setup-for-vue",
		files: ["*.vue", "**/*.vue"],
		plugins: { get vue() {
			return (require_plugin.init_plugin(), require_rolldown_runtime.__toCommonJS(require_plugin.plugin_exports)).default;
		} },
		languageOptions: {
			parser: require("vue-eslint-parser"),
			sourceType: "module"
		},
		rules: {
			"vue/comment-directive": "error",
			"vue/jsx-uses-vars": "error"
		},
		processor: "vue/vue"
	}];
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_base();
  }
});