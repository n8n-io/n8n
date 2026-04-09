'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-restricted-html-elements.js
/**
* @author Doug Wade <douglas.b.wade@gmail.com>
*/
var require_no_restricted_html_elements = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow specific elements",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-html-elements.html"
			},
			fixable: null,
			schema: {
				type: "array",
				items: { oneOf: [{ type: "string" }, {
					type: "object",
					properties: {
						element: { oneOf: [{ type: "string" }, {
							type: "array",
							items: { type: "string" }
						}] },
						message: {
							type: "string",
							minLength: 1
						}
					},
					required: ["element"],
					additionalProperties: false
				}] },
				uniqueItems: true,
				minItems: 0
			},
			messages: {
				forbiddenElement: "Unexpected use of forbidden element {{name}}.",
				customMessage: "{{message}}"
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { VElement(node) {
				if (!utils.isHtmlElementNode(node) && !utils.isSvgElementNode(node) && !utils.isMathElementNode(node)) return;
				for (const option of context.options) {
					const restrictedItem = option.element || option;
					if ((Array.isArray(restrictedItem) ? restrictedItem : [restrictedItem]).includes(node.rawName)) {
						context.report({
							messageId: option.message ? "customMessage" : "forbiddenElement",
							data: {
								name: node.rawName,
								message: option.message
							},
							node: node.startTag
						});
						return;
					}
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_restricted_html_elements();
  }
});