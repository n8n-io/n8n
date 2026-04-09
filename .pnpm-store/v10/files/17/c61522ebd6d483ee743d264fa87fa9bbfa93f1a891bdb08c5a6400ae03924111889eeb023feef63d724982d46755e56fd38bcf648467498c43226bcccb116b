'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_indent_common$1 = require('../utils/indent-common.js');

//#region lib/rules/script-indent.js
/**
* @author Toru Nagashima
* See LICENSE file in root directory for full license.
*/
var require_script_indent = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const indentCommon = require_indent_common$1.default;
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce consistent indentation in `<script>`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/script-indent.html"
			},
			fixable: "whitespace",
			schema: [{ oneOf: [{
				type: "integer",
				minimum: 1
			}, { enum: ["tab"] }] }, {
				type: "object",
				properties: {
					baseIndent: {
						type: "integer",
						minimum: 0
					},
					switchCase: {
						type: "integer",
						minimum: 0
					},
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
		},
		create(context) {
			return indentCommon.defineVisitor(context, context.sourceCode, {});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_script_indent();
  }
});