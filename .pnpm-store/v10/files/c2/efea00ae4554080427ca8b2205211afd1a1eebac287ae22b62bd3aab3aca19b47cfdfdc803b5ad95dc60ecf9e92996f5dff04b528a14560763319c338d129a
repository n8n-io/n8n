import { D as getFirstNodeInLine, V as isNodeFirstInLine, f as createRule, g as import_ast_utils, o as isJSX, s as isReturningJSX } from "../utils.js";
var jsx_indent_default = createRule({
	name: "jsx-indent",
	meta: {
		type: "layout",
		docs: { description: "Enforce JSX indentation. Deprecated, use `indent` rule instead." },
		fixable: "whitespace",
		deprecated: {
			message: "The rule was replaced with a more general rule.",
			deprecatedSince: "5.0.0",
			replacedBy: [{ rule: {
				name: "indent",
				url: "https://eslint.style/rules/indent"
			} }]
		},
		schema: [{ anyOf: [{
			type: "string",
			enum: ["tab"]
		}, { type: "integer" }] }, {
			type: "object",
			properties: {
				checkAttributes: { type: "boolean" },
				indentLogicalExpressions: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [4],
		messages: { wrongIndent: "Expected indentation of {{needed}} {{type}} {{characters}} but found {{gotten}}." }
	},
	create(context) {
		const extraColumnStart = 0;
		let indentType = "space";
		let indentSize = 4;
		if (context.options.length) {
			if (context.options[0] === "tab") {
				indentSize = 1;
				indentType = "tab";
			} else if (typeof context.options[0] === "number") {
				indentSize = context.options[0];
				indentType = "space";
			}
		}
		const indentChar = indentType === "space" ? " " : "	";
		const options = context.options[1] || {};
		const checkAttributes = options.checkAttributes || false;
		const indentLogicalExpressions = options.indentLogicalExpressions || false;
		function getFixerFunction(node, needed) {
			const indent = new Array(needed + 1).join(indentChar);
			if (node.type === "JSXText" || node.type === "Literal") return function fix(fixer) {
				const fixedText = node.raw.replace(/\n[\t ]*(\S)/g, (match, p1) => `\n${indent}${p1}`);
				return fixer.replaceText(node, fixedText);
			};
			if (node.type === "ReturnStatement") {
				const raw = context.sourceCode.getText(node);
				if (raw.split("\n").length > 1) return function fix(fixer) {
					const lastLineStart = raw.lastIndexOf("\n");
					const lastLine = raw.slice(lastLineStart).replace(/^\n[\t ]*(\S)/, (match, p1) => `\n${indent}${p1}`);
					return fixer.replaceTextRange([node.range[0] + lastLineStart, node.range[1]], lastLine);
				};
			}
			return function fix(fixer) {
				return fixer.replaceTextRange([node.range[0] - node.loc.start.column, node.range[0]], indent);
			};
		}
		function report(node, needed, gotten, loc) {
			const msgContext = {
				needed,
				type: indentType,
				characters: needed === 1 ? "character" : "characters",
				gotten
			};
			context.report({
				node,
				messageId: "wrongIndent",
				data: msgContext,
				fix: getFixerFunction(node, needed),
				...loc ? { loc } : {}
			});
		}
		function getNodeIndent(node, byLastLine = false, excludeCommas = false) {
			let src = context.sourceCode.getText(node, node.loc.start.column + extraColumnStart);
			const lines = src.split("\n");
			if (byLastLine) src = lines[lines.length - 1];
			else src = lines[0];
			const skip = excludeCommas ? "," : "";
			let regExp;
			if (indentType === "space") regExp = new RegExp(`^[ ${skip}]+`);
			else regExp = new RegExp(`^[\t${skip}]+`);
			const indent = regExp.exec(src);
			return indent ? indent[0].length : 0;
		}
		function isRightInLogicalExp(node) {
			return node.parent && node.parent.parent && node.parent.parent.type === "LogicalExpression" && node.parent.parent.right === node.parent && !indentLogicalExpressions;
		}
		function isAlternateInConditionalExp(node) {
			return node.parent && node.parent.parent && node.parent.parent.type === "ConditionalExpression" && node.parent.parent.alternate === node.parent && context.sourceCode.getTokenBefore(node).value !== "(";
		}
		function isSecondOrSubsequentExpWithinDoExp(node) {
			if (!node.parent || !node.parent.parent || node.parent.parent.type !== "ExpressionStatement") return false;
			const expStmt = node.parent.parent;
			if (!(expStmt.parent && expStmt.parent.type === "BlockStatement" && expStmt.parent.parent && expStmt.parent.parent.type === "DoExpression")) return false;
			return !(expStmt.parent.body[0] === expStmt);
		}
		function checkNodesIndent(node, indent, excludeCommas = false) {
			const nodeIndent = getNodeIndent(node, false, excludeCommas);
			const isCorrectRightInLogicalExp = isRightInLogicalExp(node) && nodeIndent - indent === indentSize;
			const isCorrectAlternateInCondExp = isAlternateInConditionalExp(node) && nodeIndent - indent === 0;
			if (nodeIndent !== indent && isNodeFirstInLine(context, node) && !isCorrectRightInLogicalExp && !isCorrectAlternateInCondExp) report(node, indent, nodeIndent);
		}
		function checkLiteralNodeIndent(node, indent) {
			const value = node.value;
			const regExp = indentType === "space" ? /\n( *)[\t ]*\S/g : /\n(\t*)[\t ]*\S/g;
			const nodeIndentsPerLine = Array.from(String(value).matchAll(regExp), (match) => match[1] ? match[1].length : 0);
			if (nodeIndentsPerLine.length > 0 && !nodeIndentsPerLine.every((actualIndent) => actualIndent === indent)) nodeIndentsPerLine.forEach((nodeIndent) => {
				report(node, indent, nodeIndent);
			});
		}
		function handleOpeningElement(node) {
			const sourceCode = context.sourceCode;
			let prevToken = sourceCode.getTokenBefore(node);
			if (!prevToken) return;
			if (prevToken.type === "JSXText" || (0, import_ast_utils.isCommaToken)(prevToken)) {
				prevToken = sourceCode.getNodeByRangeIndex(prevToken.range[0]);
				prevToken = prevToken.type === "Literal" || prevToken.type === "JSXText" ? prevToken.parent : prevToken;
			} else if ((0, import_ast_utils.isColonToken)(prevToken)) {
				do
					prevToken = sourceCode.getTokenBefore(prevToken);
				while (prevToken.type === "Punctuator" && prevToken.value !== "/");
				prevToken = sourceCode.getNodeByRangeIndex(prevToken.range[0]);
				while (prevToken.parent && prevToken.parent.type !== "ConditionalExpression") prevToken = prevToken.parent;
			}
			prevToken = prevToken.type === "JSXExpressionContainer" ? prevToken.expression : prevToken;
			checkNodesIndent(node, getNodeIndent(prevToken) + (prevToken.loc.start.line === node.loc.start.line || isRightInLogicalExp(node) || isAlternateInConditionalExp(node) || isSecondOrSubsequentExpWithinDoExp(node) ? 0 : indentSize));
		}
		function handleClosingElement(node) {
			if (!node.parent) return;
			checkNodesIndent(node, getNodeIndent(node.parent.openingElement || node.parent.openingFragment));
		}
		function handleAttribute(node) {
			if (!checkAttributes || !node.value || node.value.type !== "JSXExpressionContainer") return;
			const nameIndent = getNodeIndent(node.name);
			const lastToken = context.sourceCode.getLastToken(node.value);
			const firstInLine = getFirstNodeInLine(context, lastToken);
			if (firstInLine.loc.start.line !== lastToken.loc.start.line) return;
			checkNodesIndent(firstInLine, node.name.loc.start.line === firstInLine.loc.start.line ? 0 : nameIndent);
		}
		function handleLiteral(node) {
			if (!node.parent) return;
			if (node.parent.type !== "JSXElement" && node.parent.type !== "JSXFragment") return;
			checkLiteralNodeIndent(node, getNodeIndent(node.parent) + indentSize);
		}
		return {
			JSXOpeningElement: handleOpeningElement,
			JSXOpeningFragment: handleOpeningElement,
			JSXClosingElement: handleClosingElement,
			JSXClosingFragment: handleClosingElement,
			JSXAttribute: handleAttribute,
			JSXExpressionContainer(node) {
				if (!node.parent) return;
				checkNodesIndent(node, getNodeIndent(node.parent) + indentSize);
			},
			Literal: handleLiteral,
			JSXText: handleLiteral,
			ReturnStatement(node) {
				if (!node.parent || !node.argument || !isJSX(node.argument)) return;
				let fn = node.parent;
				while (fn && fn.type !== "FunctionDeclaration" && fn.type !== "FunctionExpression") fn = fn.parent;
				if (!fn || !isReturningJSX(node, context, true)) return;
				const openingIndent = getNodeIndent(node);
				const closingIndent = getNodeIndent(node, true);
				if (openingIndent !== closingIndent) report(node, openingIndent, closingIndent);
			}
		};
	}
});
export { jsx_indent_default as t };
