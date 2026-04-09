'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_index = require('../../utils/index.js');

//#region lib/rules/syntaxes/script-setup.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_script_setup = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		supported: ">=2.7.0",
		createScriptVisitor(context) {
			const scriptSetup = utils.getScriptSetupElement(context);
			if (!scriptSetup) return {};
			const reportNode = utils.getAttribute(scriptSetup, "setup") || scriptSetup.startTag;
			return { Program() {
				context.report({
					node: reportNode,
					messageId: "forbiddenScriptSetup"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_script_setup();
  }
});