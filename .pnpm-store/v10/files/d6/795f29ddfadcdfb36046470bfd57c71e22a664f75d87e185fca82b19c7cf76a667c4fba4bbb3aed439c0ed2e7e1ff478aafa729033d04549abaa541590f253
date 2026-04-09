'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');

//#region lib/rules/max-template-depth.js
/**
* @author kevsommer Kevin Sommer
* See LICENSE file in root directory for full license.
*/
var require_max_template_depth = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce maximum depth of template",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/max-template-depth.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { maxDepth: {
					type: "integer",
					minimum: 1
				} },
				additionalProperties: false,
				minProperties: 1
			}],
			messages: { templateTooDeep: "Element is nested too deeply (depth of {{depth}}, maximum allowed is {{limit}})." }
		},
		create(context) {
			const option = context.options[0] || {};
			/**
			* @param {VElement} element
			* @param {number} curDepth
			*/
			function checkMaxDepth(element, curDepth) {
				if (curDepth > option.maxDepth) context.report({
					node: element,
					messageId: "templateTooDeep",
					data: {
						depth: curDepth,
						limit: option.maxDepth
					}
				});
				if (!element.children) return;
				for (const child of element.children) if (child.type === "VElement") checkMaxDepth(child, curDepth + 1);
			}
			return { Program(program) {
				const element = program.templateBody;
				if (element == null) return;
				if (element.type !== "VElement") return;
				checkMaxDepth(element, 0);
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_max_template_depth();
  }
});