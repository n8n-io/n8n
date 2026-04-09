'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_index = require('../../utils/style-variables/index.js');

//#region lib/rules/syntaxes/style-css-vars-injection.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_style_css_vars_injection = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { getStyleVariablesContext } = require_index.default;
	module.exports = {
		supported: ">=3.0.3 || >=2.7.0 <3.0.0",
		createScriptVisitor(context) {
			const styleVars = getStyleVariablesContext(context);
			if (!styleVars) return {};
			return { Program() {
				for (const vBind of styleVars.vBinds) context.report({
					node: vBind,
					messageId: "forbiddenStyleCssVarsInjection"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_style_css_vars_injection();
  }
});