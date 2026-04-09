'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-v-html.js
/**
* @fileoverview Restrict or warn use of v-html to prevent XSS attack
* @author Nathan Zeplowitz
*/
var require_no_v_html = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow use of v-html to prevent XSS attack",
				categories: ["vue3-recommended", "vue2-recommended"],
				url: "https://eslint.vuejs.org/rules/no-v-html.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { ignorePattern: { type: "string" } },
				additionalProperties: false
			}],
			messages: { unexpected: "'v-html' directive can lead to XSS attack." }
		},
		create(context) {
			const options = context.options[0];
			const ignoreRegEx = options?.ignorePattern ? new RegExp(options.ignorePattern, "u") : void 0;
			/**
			* Check if the expression matches the ignore pattern
			* @param {VExpressionContainer['expression']} expression
			* @param {SourceCode} sourceCode
			* @returns {boolean}
			*/
			function shouldIgnore(expression, sourceCode) {
				if (!ignoreRegEx || !expression) return false;
				if (expression.type === "Identifier") return ignoreRegEx.test(expression.name);
				const expressionText = sourceCode.getText(expression);
				return ignoreRegEx.test(expressionText);
			}
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='html']"(node) {
				const sourceCode = context.sourceCode;
				if (node.value && node.value.expression && sourceCode && shouldIgnore(node.value.expression, sourceCode)) return;
				context.report({
					node,
					loc: node.loc,
					messageId: "unexpected"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_v_html();
  }
});