'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/quote-props.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_quote_props = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { wrapStylisticOrCoreRule, flatten } = require_index.default;
	module.exports = wrapStylisticOrCoreRule("quote-props", {
		skipDynamicArguments: true,
		preprocess(context, { wrapContextToOverrideProperties, defineVisitor }) {
			const sourceCode = context.sourceCode;
			/**
			* @type {'"' | "'" | null}
			*/
			let htmlQuote = null;
			defineVisitor({
				"VAttribute > VExpressionContainer.value"(node) {
					const firstChar = sourceCode.getText(node)[0];
					htmlQuote = firstChar === "'" || firstChar === "\"" ? firstChar : null;
				},
				"VAttribute > VExpressionContainer.value:exit"() {
					htmlQuote = null;
				}
			});
			wrapContextToOverrideProperties({ report(descriptor) {
				if (htmlQuote) {
					const expectedQuote = htmlQuote === "\"" ? "'" : "\"";
					context.report({
						...descriptor,
						*fix(fixer) {
							for (const fix of flatten(descriptor.fix && descriptor.fix(fixer))) yield fixer.replaceTextRange(fix.range, fix.text.replaceAll(/["']/gu, expectedQuote));
						}
					});
				} else context.report(descriptor);
			} });
		}
	});
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_quote_props();
  }
});