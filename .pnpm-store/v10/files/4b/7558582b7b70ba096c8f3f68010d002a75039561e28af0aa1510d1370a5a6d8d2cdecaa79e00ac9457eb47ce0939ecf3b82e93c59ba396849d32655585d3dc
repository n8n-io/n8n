'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-name-property.js
/**
* @fileoverview Require a name property in Vue components
* @author LukeeeeBennett
*/
var require_require_name_property = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const path = require("node:path");
	const utils = require_index.default;
	const { getVueComponentDefinitionType } = require_index.default;
	/**
	* Get the text of the empty indentation part of the line which the given token is on.
	* @param {SourceCode} sourceCode the source code object
	* @param {Token} token the token to get the indentation text of the line which the token is on
	* @returns {string} The text of indentation part.
	*/
	function getLineEmptyIndent(sourceCode, token) {
		const LT_CHAR = /[\n\r\u2028\u2029]/;
		const EMPTY_CHAR = /\s/;
		const text = sourceCode.text;
		let i = token.range[0] - 1;
		while (i >= 0 && !LT_CHAR.test(text[i])) i -= 1;
		let j = i;
		while (EMPTY_CHAR.test(text[j])) j += 1;
		return text.slice(i + 1, j);
	}
	/**
	* @param {Property | SpreadElement} node
	* @returns {node is ObjectExpressionProperty}
	*/
	function isNameProperty(node) {
		return node.type === "Property" && utils.getStaticPropertyName(node) === "name" && !node.computed;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require a name property in Vue components",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/require-name-property.html"
			},
			fixable: null,
			hasSuggestions: true,
			schema: [],
			messages: {
				missingName: "Required name property is not set.",
				addName: "Add name property to component."
			}
		},
		create(context) {
			if (utils.isScriptSetup(context)) return {};
			return utils.executeOnVue(context, (component, type) => {
				if (type === "definition") {
					if (getVueComponentDefinitionType(component) === "mixin") return;
				}
				if (component.properties.some(isNameProperty)) return;
				context.report({
					node: component,
					messageId: "missingName",
					suggest: [{
						messageId: "addName",
						fix(fixer) {
							const extension = path.extname(context.filename);
							const filename = path.basename(context.filename, extension);
							const sourceCode = context.sourceCode;
							if (component.properties.length > 0) {
								const indentText = getLineEmptyIndent(sourceCode, sourceCode.getFirstToken(component.properties[0]));
								return fixer.insertTextBefore(component.properties[0], `name: '${filename}',\n${indentText}`);
							}
							const firstToken = sourceCode.getFirstToken(component);
							const lastToken = sourceCode.getLastToken(component);
							if (firstToken.value === "{" && lastToken.value === "}") {
								const indentText = getLineEmptyIndent(sourceCode, firstToken);
								return fixer.replaceTextRange([firstToken.range[1], lastToken.range[0]], `\n${indentText}  name: '${filename}'\n${indentText}`);
							}
							return null;
						}
					}]
				});
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_name_property();
  }
});