import { X as isWhiteSpaces, f as createRule, g as import_ast_utils, o as isJSX } from "../utils.js";
const OPTION_VALUES = [
	"always",
	"never",
	"ignore"
];
var jsx_curly_brace_presence_default = createRule({
	name: "jsx-curly-brace-presence",
	meta: {
		type: "layout",
		docs: { description: "Disallow unnecessary JSX expressions when literals alone are sufficient or enforce JSX expressions on literals in JSX children or attributes" },
		fixable: "code",
		schema: [{ anyOf: [{
			type: "object",
			properties: {
				props: {
					type: "string",
					enum: OPTION_VALUES
				},
				children: {
					type: "string",
					enum: OPTION_VALUES
				},
				propElementValues: {
					type: "string",
					enum: OPTION_VALUES
				}
			},
			additionalProperties: false
		}, {
			type: "string",
			enum: OPTION_VALUES
		}] }],
		defaultOptions: [{
			props: "never",
			children: "never",
			propElementValues: "ignore"
		}],
		messages: {
			unnecessaryCurly: "Curly braces are unnecessary here.",
			missingCurly: "Need to wrap this literal in a JSX expression."
		}
	},
	create(context, [options]) {
		const HTML_ENTITY_REGEX = () => /&[A-Z\d#]+;/gi;
		const { props, children, propElementValues } = typeof options === "string" ? {
			props: options,
			children: options,
			propElementValues: "ignore"
		} : options;
		function containsLineTerminators(rawStringValue) {
			return import_ast_utils.LINEBREAK_MATCHER.test(rawStringValue);
		}
		function containsBackslash(rawStringValue) {
			return rawStringValue.includes("\\");
		}
		function containsHTMLEntity(rawStringValue) {
			return HTML_ENTITY_REGEX().test(rawStringValue);
		}
		function containsOnlyHtmlEntities(rawStringValue) {
			return rawStringValue.replace(HTML_ENTITY_REGEX(), "").trim() === "";
		}
		function containsDisallowedJSXTextChars(rawStringValue) {
			return /[{<>}]/.test(rawStringValue);
		}
		function containsQuoteCharacters(value) {
			return /['"]/.test(value);
		}
		function containsMultilineComment(value) {
			return /\/\*/.test(value);
		}
		function escapeDoubleQuotes(rawStringValue) {
			return rawStringValue.replace(/\\"/g, "\"").replace(/"/g, "\\\"");
		}
		function escapeBackslashes(rawStringValue) {
			return rawStringValue.replace(/\\/g, "\\\\");
		}
		function needToEscapeCharacterForJSX(raw, node) {
			return containsBackslash(raw) || containsHTMLEntity(raw) || node.parent.type !== "JSXAttribute" && containsDisallowedJSXTextChars(raw);
		}
		function containsWhitespaceExpression(child) {
			if (child.type === "JSXExpressionContainer") {
				const value = child.expression.value;
				return value ? isWhiteSpaces(value) : false;
			}
			return false;
		}
		function isLineBreak(text) {
			return containsLineTerminators(text) && text.trim() === "";
		}
		function wrapNonHTMLEntities(text) {
			const HTML_ENTITY = "<HTML_ENTITY>";
			const withCurlyBraces = text.split(HTML_ENTITY_REGEX()).map((word) => word === "" ? "" : `{${JSON.stringify(word)}}`).join(HTML_ENTITY);
			return text.match(HTML_ENTITY_REGEX()).reduce((acc, htmlEntity) => acc.replace(HTML_ENTITY, htmlEntity), withCurlyBraces);
		}
		function wrapWithCurlyBraces(rawText) {
			if (!containsLineTerminators(rawText)) return `{${JSON.stringify(rawText)}}`;
			return rawText.split("\n").map((line) => {
				if (line.trim() === "") return line;
				const firstCharIndex = line.search(/\S/);
				const leftWhitespace = line.slice(0, firstCharIndex);
				const text = line.slice(firstCharIndex);
				if (containsHTMLEntity(line)) return `${leftWhitespace}${wrapNonHTMLEntities(text)}`;
				return `${leftWhitespace}{${JSON.stringify(text)}}`;
			}).join("\n");
		}
		function reportUnnecessaryCurly(JSXExpressionNode) {
			context.report({
				messageId: "unnecessaryCurly",
				node: JSXExpressionNode,
				fix(fixer) {
					const expression = JSXExpressionNode.expression;
					let textToReplace;
					if (isJSX(expression)) textToReplace = context.sourceCode.getText(expression);
					else if (JSXExpressionNode.parent.type === "JSXAttribute") textToReplace = `"${expression.type === "TemplateLiteral" ? expression.quasis[0].value.raw : expression.raw.slice(1, -1)}"`;
					else if (isJSX(expression)) textToReplace = context.sourceCode.getText(expression);
					else textToReplace = expression.type === "TemplateLiteral" ? expression.quasis[0].value.cooked : expression.value;
					return fixer.replaceText(JSXExpressionNode, textToReplace);
				}
			});
		}
		function reportMissingCurly(literalNode) {
			context.report({
				messageId: "missingCurly",
				node: literalNode,
				fix(fixer) {
					if (isJSX(literalNode)) return fixer.replaceText(literalNode, `{${context.sourceCode.getText(literalNode)}}`);
					if (containsOnlyHtmlEntities(literalNode.raw) || literalNode.parent.type === "JSXAttribute" && containsLineTerminators(literalNode.raw) || isLineBreak(literalNode.raw)) return null;
					const expression = literalNode.parent.type === "JSXAttribute" ? `{"${escapeDoubleQuotes(escapeBackslashes(literalNode.raw.slice(1, -1)))}"}` : wrapWithCurlyBraces(literalNode.raw);
					return fixer.replaceText(literalNode, expression);
				}
			});
		}
		function isWhiteSpaceLiteral(node) {
			return node.type && node.type === "Literal" && node.value && isWhiteSpaces(node.value);
		}
		function isStringWithTrailingWhiteSpaces(value) {
			return /^\s|\s$/.test(value);
		}
		function isLiteralWithTrailingWhiteSpaces(node) {
			return node.type && node.type === "Literal" && node.value && isStringWithTrailingWhiteSpaces(node.value);
		}
		function lintUnnecessaryCurly(JSXExpressionNode) {
			const expression = JSXExpressionNode.expression;
			const expressionType = expression.type;
			const sourceCode = context.sourceCode;
			if (sourceCode.getCommentsInside && sourceCode.getCommentsInside(JSXExpressionNode).length > 0) return;
			if ((expressionType === "Literal" || expressionType === "JSXText") && typeof expression.value === "string" && (JSXExpressionNode.parent.type === "JSXAttribute" && !isWhiteSpaceLiteral(expression) || !isLiteralWithTrailingWhiteSpaces(expression)) && !containsMultilineComment(expression.value) && !needToEscapeCharacterForJSX(expression.raw, JSXExpressionNode) && (isJSX(JSXExpressionNode.parent) || !containsQuoteCharacters(expression.value))) reportUnnecessaryCurly(JSXExpressionNode);
			else if (expressionType === "TemplateLiteral" && expression.expressions.length === 0 && !expression.quasis[0].value.raw.includes("\n") && !isStringWithTrailingWhiteSpaces(expression.quasis[0].value.raw) && !needToEscapeCharacterForJSX(expression.quasis[0].value.raw, JSXExpressionNode) && !containsQuoteCharacters(expression.quasis[0].value.cooked)) reportUnnecessaryCurly(JSXExpressionNode);
			else if (isJSX(expression)) reportUnnecessaryCurly(JSXExpressionNode);
		}
		function areRuleConditionsSatisfied(parent, ruleCondition) {
			return parent.type === "JSXAttribute" && props === ruleCondition || isJSX(parent) && children === ruleCondition;
		}
		function getAdjacentSiblings(node, children) {
			for (let i = 1; i < children.length - 1; i++) if (node === children[i]) return [children[i - 1], children[i + 1]];
			if (node === children[0] && children[1]) return [children[1]];
			if (node === children[children.length - 1] && children[children.length - 2]) return [children[children.length - 2]];
			return [];
		}
		function hasAdjacentJsxExpressionContainers(node, children) {
			if (!children) return false;
			return getAdjacentSiblings(node, children.filter((child) => !isWhiteSpaceLiteral(child))).some((x) => x.type && x.type === "JSXExpressionContainer");
		}
		function hasAdjacentJsx(node, children) {
			if (!children) return false;
			return getAdjacentSiblings(node, children.filter((child) => !isWhiteSpaceLiteral(child))).some((x) => x.type && ["JSXExpressionContainer", "JSXElement"].includes(x.type));
		}
		function shouldCheckForUnnecessaryCurly(node) {
			const parent = node.parent;
			if (parent.type && parent.type === "JSXAttribute" && node.expression && node.expression.type && node.expression.type !== "Literal" && node.expression.type !== "StringLiteral" && node.expression.type !== "TemplateLiteral") return false;
			if (isJSX(parent) && hasAdjacentJsxExpressionContainers(node, parent.children)) return false;
			if (containsWhitespaceExpression(node) && hasAdjacentJsx(node, parent.children)) return false;
			if (parent.children && parent.children.length === 1 && containsWhitespaceExpression(node)) return false;
			return areRuleConditionsSatisfied(parent, "never");
		}
		function shouldCheckForMissingCurly(node) {
			if (isJSX(node)) return propElementValues !== "ignore";
			if (isLineBreak(node.raw) || containsOnlyHtmlEntities(node.raw)) return false;
			const parent = node.parent;
			if (parent.children && parent.children.length === 1 && containsWhitespaceExpression(parent.children[0])) return false;
			return areRuleConditionsSatisfied(parent, "always");
		}
		return {
			"JSXAttribute > JSXExpressionContainer > JSXElement": function(node) {
				if (propElementValues === "never") reportUnnecessaryCurly(node.parent);
			},
			JSXExpressionContainer(node) {
				if (shouldCheckForUnnecessaryCurly(node)) lintUnnecessaryCurly(node);
			},
			"JSXAttribute > JSXElement, Literal, JSXText": function(node) {
				if (shouldCheckForMissingCurly(node)) reportMissingCurly(node);
			}
		};
	}
});
export { jsx_curly_brace_presence_default as t };
