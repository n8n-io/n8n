'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_index = require('../../utils/index.js');

//#region lib/rules/syntaxes/v-bind-same-name-shorthand.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_bind_same_name_shorthand = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		supported: ">=3.4.0",
		createTemplateBodyVisitor(context) {
			/**
			* Verify the directive node
			* @param {VDirective} node The directive node to check
			* @returns {void}
			*/
			function checkDirective(node) {
				if (utils.isVBindSameNameShorthand(node)) context.report({
					node,
					messageId: "forbiddenVBindSameNameShorthand",
					fix: (fixer) => fixer.insertTextAfter(node, `="${node.value.expression.name}"`)
				});
			}
			return { "VAttribute[directive=true][key.name.name='bind']": checkDirective };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_bind_same_name_shorthand();
  }
});