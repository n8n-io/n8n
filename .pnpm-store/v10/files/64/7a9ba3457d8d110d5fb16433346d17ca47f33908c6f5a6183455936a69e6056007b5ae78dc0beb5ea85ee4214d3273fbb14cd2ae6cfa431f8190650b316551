'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/html-button-has-type.js
/**
* @fileoverview Disallow usage of button without an explicit type attribute
* @author Jonathan Santerre <jonathan@santerre.dev>
*/
var require_html_button_has_type = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	*
	* @param {string} type
	* @returns {type is 'button' | 'submit' | 'reset'}
	*/
	function isButtonType(type) {
		return type === "button" || type === "submit" || type === "reset";
	}
	const optionDefaults = {
		button: true,
		submit: true,
		reset: true
	};
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow usage of button without an explicit type attribute",
				categories: null,
				url: "https://eslint.vuejs.org/rules/html-button-has-type.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: {
					button: { type: "boolean" },
					submit: { type: "boolean" },
					reset: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: {
				missingTypeAttribute: "Missing an explicit type attribute for button.",
				invalidTypeAttribute: "{{value}} is an invalid value for button type attribute.",
				forbiddenTypeAttribute: "{{value}} is a forbidden value for button type attribute.",
				emptyTypeAttribute: "A value must be set for button type attribute."
			}
		},
		create(context) {
			/**
			* @typedef {object} Configuration
			* @property {boolean} button
			* @property {boolean} submit
			* @property {boolean} reset
			*/
			/** @type {Configuration} */
			const configuration = Object.assign({}, optionDefaults, context.options[0]);
			/**
			* @param {ASTNode} node
			* @param {string} messageId
			* @param {any} [data]
			*/
			function report(node, messageId, data) {
				context.report({
					node,
					messageId,
					data
				});
			}
			/**
			* @param {VAttribute} attribute
			*/
			function validateAttribute(attribute) {
				const value = attribute.value;
				if (!value || !value.value) {
					report(value || attribute, "emptyTypeAttribute");
					return;
				}
				const strValue = value.value;
				if (!isButtonType(strValue)) report(value, "invalidTypeAttribute", { value: strValue });
				else if (!configuration[strValue]) report(value, "forbiddenTypeAttribute", { value: strValue });
			}
			/**
			* @param {VDirective} directive
			*/
			function validateDirective(directive) {
				const value = directive.value;
				if (!value || !value.expression) report(value || directive, "emptyTypeAttribute");
			}
			return utils.defineTemplateBodyVisitor(context, { "VElement[rawName='button']"(node) {
				const typeAttr = utils.getAttribute(node, "type");
				if (typeAttr) {
					validateAttribute(typeAttr);
					return;
				}
				const typeDir = utils.getDirective(node, "bind", "type");
				if (typeDir) {
					validateDirective(typeDir);
					return;
				}
				report(node.startTag, "missingTypeAttribute");
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_html_button_has_type();
  }
});