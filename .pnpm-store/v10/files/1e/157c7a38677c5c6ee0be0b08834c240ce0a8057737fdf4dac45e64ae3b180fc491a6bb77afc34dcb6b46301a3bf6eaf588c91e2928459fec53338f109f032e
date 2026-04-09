'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-events-api.js
/**
* @fileoverview disallow using deprecated events api
* @author yoyo930021
*/
var require_no_deprecated_events_api = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated events api (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-events-api.html"
			},
			fixable: null,
			schema: [],
			messages: { noDeprecatedEventsApi: "The Events api `$on`, `$off` `$once` is deprecated. Using external library instead, for example mitt." }
		},
		create(context) {
			return utils.defineVueVisitor(context, { "CallExpression > MemberExpression, CallExpression > ChainExpression > MemberExpression"(node) {
				const call = node.parent.type === "ChainExpression" ? node.parent.parent : node.parent;
				if (call.optional) return;
				if (utils.skipChainExpression(call.callee) !== node || ![
					"$on",
					"$off",
					"$once"
				].includes(utils.getStaticPropertyName(node) || "")) return;
				if (!utils.isThis(node.object, context)) return;
				context.report({
					node: node.property,
					messageId: "noDeprecatedEventsApi"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_events_api();
  }
});