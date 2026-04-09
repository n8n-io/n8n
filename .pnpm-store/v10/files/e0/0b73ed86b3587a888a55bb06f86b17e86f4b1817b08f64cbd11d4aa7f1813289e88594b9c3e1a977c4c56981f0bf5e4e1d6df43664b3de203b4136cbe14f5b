'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-is.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_is = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		deprecated: "3.1.0",
		supported: ">=3.0.0",
		createTemplateBodyVisitor(context) {
			/**
			* Reports `v-is` node
			* @param {VDirective} vIsAttr node of `v-is`
			* @returns {void}
			*/
			function reportVIs(vIsAttr) {
				context.report({
					node: vIsAttr.key,
					messageId: "forbiddenVIs"
				});
			}
			return { "VAttribute[directive=true][key.name.name='is']": reportVIs };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_is();
  }
});