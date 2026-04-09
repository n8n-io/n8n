'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-use-v-else-with-v-for.js
var require_no_use_v_else_with_v_for = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { defineTemplateBodyVisitor, hasDirective } = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow using `v-else-if`/`v-else` on the same element as `v-for`",
				categories: null,
				url: "https://eslint.vuejs.org/rules/no-use-v-else-with-v-for.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpectedDirectiveWithVFor: "Unexpected `{{ directiveName }}` and `v-for` on the same element. Move `{{ directiveName }}` to a wrapper element instead." }
		},
		create(context) {
			return defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='for']"(node) {
				const element = node.parent.parent;
				if (hasDirective(element, "else-if")) context.report({
					node: element,
					messageId: "unexpectedDirectiveWithVFor",
					data: { directiveName: "v-else-if" }
				});
				else if (hasDirective(element, "else")) context.report({
					node: element,
					messageId: "unexpectedDirectiveWithVFor",
					data: { directiveName: "v-else" }
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_use_v_else_with_v_for();
  }
});