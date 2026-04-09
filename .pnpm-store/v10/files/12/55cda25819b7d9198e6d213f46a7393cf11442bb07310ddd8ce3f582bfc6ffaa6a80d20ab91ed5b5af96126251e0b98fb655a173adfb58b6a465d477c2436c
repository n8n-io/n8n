'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/static-class-names-order.js
/**
* @fileoverview Alphabetizes static class names.
* @author Maciej Chmurski
*/
var require_static_class_names_order = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { defineTemplateBodyVisitor } = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				url: "https://eslint.vuejs.org/rules/static-class-names-order.html",
				description: "enforce static class names order",
				categories: void 0
			},
			fixable: "code",
			schema: [],
			messages: { shouldBeOrdered: "Classes should be ordered alphabetically." }
		},
		create: (context) => defineTemplateBodyVisitor(context, { "VAttribute[directive=false][key.name='class']"(node) {
			const value = node.value;
			if (!value) return;
			const classList = value.value;
			const classListWithWhitespace = classList.split(/(\s+)/);
			let divider = "";
			if (classListWithWhitespace.length > 1) divider = classListWithWhitespace[1];
			const classListSorted = classListWithWhitespace.filter((className) => className.trim() !== "").sort().join(divider);
			if (classList !== classListSorted) context.report({
				node,
				loc: node.loc,
				messageId: "shouldBeOrdered",
				fix: (fixer) => fixer.replaceText(value, `"${classListSorted}"`)
			});
		} })
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_static_class_names_order();
  }
});