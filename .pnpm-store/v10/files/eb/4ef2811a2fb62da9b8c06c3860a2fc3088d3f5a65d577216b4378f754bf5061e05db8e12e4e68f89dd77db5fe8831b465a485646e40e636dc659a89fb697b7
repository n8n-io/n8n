'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-console.js
/**
* @author ItMaga <https://github.com/ItMaga>
* See LICENSE file in root directory for full license.
*/
var require_no_console = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = utils.wrapCoreRule("no-console", {
		skipBaseHandlers: true,
		create(context) {
			const allowed = (context.options[0] || {}).allow || [];
			/**
			* Copied from the core rule `no-console`.
			* Checks whether the property name of the given MemberExpression node
			* is allowed by options or not.
			* @param {MemberExpression} node The MemberExpression node to check.
			* @returns {boolean} `true` if the property name of the node is allowed.
			*/
			function isAllowed(node) {
				const propertyName = utils.getStaticPropertyName(node);
				return propertyName && allowed.includes(propertyName);
			}
			return { MemberExpression(node) {
				if (node.object.type === "Identifier" && node.object.name === "console" && !isAllowed(node)) context.report({
					node: node.object,
					loc: node.object.loc,
					messageId: "unexpected"
				});
			} };
		}
	});
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_console();
  }
});