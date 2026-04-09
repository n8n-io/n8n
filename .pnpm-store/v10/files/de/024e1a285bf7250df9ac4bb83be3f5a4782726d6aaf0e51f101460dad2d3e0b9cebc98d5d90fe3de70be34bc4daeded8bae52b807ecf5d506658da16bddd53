import { J as isSurroundedBy, f as createRule, q as isStringLiteral } from "../utils.js";
const QUOTE_SETTINGS = {
	"prefer-double": {
		quote: "\"",
		description: "singlequote",
		convert(str) {
			return str.replace(/'/gu, "\"");
		}
	},
	"prefer-single": {
		quote: "'",
		description: "doublequote",
		convert(str) {
			return str.replace(/"/gu, "'");
		}
	}
};
var jsx_quotes_default = createRule({
	name: "jsx-quotes",
	meta: {
		type: "layout",
		docs: { description: "Enforce the consistent use of either double or single quotes in JSX attributes" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["prefer-single", "prefer-double"]
		}],
		defaultOptions: ["prefer-double"],
		messages: { unexpected: "Unexpected usage of {{description}}." }
	},
	create(context, [quoteOption]) {
		const setting = QUOTE_SETTINGS[quoteOption];
		function usesExpectedQuotes(node) {
			return node.value.includes(setting.quote) || isSurroundedBy(node.raw, setting.quote);
		}
		return { JSXAttribute(node) {
			const attributeValue = node.value;
			if (attributeValue && isStringLiteral(attributeValue) && !usesExpectedQuotes(attributeValue)) context.report({
				node: attributeValue,
				messageId: "unexpected",
				data: { description: setting.description },
				fix(fixer) {
					return fixer.replaceText(attributeValue, setting.convert(attributeValue.raw));
				}
			});
		} };
	}
});
export { jsx_quotes_default as t };
