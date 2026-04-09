'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_indent_common$1 = require('../utils/indent-common.js');

//#region lib/rules/html-indent.js
/**
* @author Toru Nagashima
* @copyright 2016 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_html_indent = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const indentCommon = require_indent_common$1.default;
	const utils = require_index.default;
	module.exports = {
		create(context) {
			const sourceCode = context.sourceCode;
			const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
			const visitor = indentCommon.defineVisitor(context, tokenStore, { baseIndent: 1 });
			return utils.defineTemplateBodyVisitor(context, visitor);
		},
		meta: {
			type: "layout",
			docs: {
				description: "enforce consistent indentation in `<template>`",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/html-indent.html"
			},
			fixable: "whitespace",
			schema: [{ oneOf: [{
				type: "integer",
				minimum: 1
			}, { enum: ["tab"] }] }, {
				type: "object",
				properties: {
					attribute: {
						type: "integer",
						minimum: 0
					},
					baseIndent: {
						type: "integer",
						minimum: 0
					},
					closeBracket: { oneOf: [{
						type: "integer",
						minimum: 0
					}, {
						type: "object",
						properties: {
							startTag: {
								type: "integer",
								minimum: 0
							},
							endTag: {
								type: "integer",
								minimum: 0
							},
							selfClosingTag: {
								type: "integer",
								minimum: 0
							}
						},
						additionalProperties: false
					}] },
					switchCase: {
						type: "integer",
						minimum: 0
					},
					alignAttributesVertically: { type: "boolean" },
					ignores: {
						type: "array",
						items: { allOf: [
							{ type: "string" },
							{ not: {
								type: "string",
								pattern: ":exit$"
							} },
							{ not: {
								type: "string",
								pattern: String.raw`^\s*$`
							} }
						] },
						uniqueItems: true,
						additionalItems: false
					}
				},
				additionalProperties: false
			}]
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_html_indent();
  }
});