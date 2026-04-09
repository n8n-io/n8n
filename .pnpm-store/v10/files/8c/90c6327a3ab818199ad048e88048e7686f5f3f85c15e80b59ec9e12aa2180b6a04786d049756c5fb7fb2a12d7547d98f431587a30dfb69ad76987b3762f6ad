const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');

//#region lib/configs/base.js
var require_base = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		parserOptions: {
			ecmaVersion: "latest",
			sourceType: "module"
		},
		plugins: ["vue"],
		rules: {
			"vue/comment-directive": "error",
			"vue/jsx-uses-vars": "error"
		},
		overrides: [{
			files: "*.vue",
			parser: require.resolve("vue-eslint-parser")
		}]
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_base();
  }
});