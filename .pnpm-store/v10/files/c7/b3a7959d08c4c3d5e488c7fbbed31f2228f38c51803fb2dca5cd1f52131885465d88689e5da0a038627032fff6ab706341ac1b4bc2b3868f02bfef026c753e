'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-filter.js
/**
* @author Przemyslaw Falowski (@przemkow)
* @fileoverview disallow using deprecated filters syntax
*/
var require_no_deprecated_filter = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated filters syntax (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-filter.html"
			},
			fixable: null,
			schema: [],
			messages: { noDeprecatedFilter: "Filters are deprecated." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { VFilterSequenceExpression(node) {
				context.report({
					node,
					loc: node.loc,
					messageId: "noDeprecatedFilter"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_filter();
  }
});