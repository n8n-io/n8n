import { f as createRule, g as import_ast_utils } from "../utils.js";
const SELECTOR = [
	"BreakStatement",
	"ContinueStatement",
	"DebuggerStatement",
	"DoWhileStatement",
	"ExportAllDeclaration",
	"ExportDefaultDeclaration",
	"ExportNamedDeclaration",
	"ExpressionStatement",
	"ImportDeclaration",
	"ReturnStatement",
	"ThrowStatement",
	"VariableDeclaration",
	"PropertyDefinition",
	"AccessorProperty"
].join(",");
function getChildren(node) {
	const t = node.type;
	if (t === "BlockStatement" || t === "StaticBlock" || t === "Program" || t === "ClassBody") return node.body;
	if (t === "SwitchCase") return node.consequent;
	return null;
}
function isLastChild(node) {
	if (!node.parent) return true;
	const t = node.parent.type;
	if (t === "IfStatement" && node.parent.consequent === node && node.parent.alternate) return true;
	if (t === "DoWhileStatement") return true;
	const nodeList = getChildren(node.parent);
	return nodeList !== null && nodeList[nodeList.length - 1] === node;
}
var semi_style_default = createRule({
	name: "semi-style",
	meta: {
		type: "layout",
		docs: { description: "Enforce location of semicolons" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["last", "first"]
		}],
		defaultOptions: ["last"],
		messages: { expectedSemiColon: "Expected this semicolon to be at {{pos}}." }
	},
	create(context, [option]) {
		const sourceCode = context.sourceCode;
		function check(semiToken, expected) {
			const prevToken = sourceCode.getTokenBefore(semiToken);
			const nextToken = sourceCode.getTokenAfter(semiToken);
			const prevIsSameLine = !prevToken || (0, import_ast_utils.isTokenOnSameLine)(prevToken, semiToken);
			const nextIsSameLine = !nextToken || (0, import_ast_utils.isTokenOnSameLine)(semiToken, nextToken);
			if (expected === "last" && !prevIsSameLine || expected === "first" && !nextIsSameLine) context.report({
				loc: semiToken.loc,
				messageId: "expectedSemiColon",
				data: { pos: expected === "last" ? "the end of the previous line" : "the beginning of the next line" },
				fix(fixer) {
					if (prevToken && nextToken && sourceCode.commentsExistBetween(prevToken, nextToken)) return null;
					const start = prevToken ? prevToken.range[1] : semiToken.range[0];
					const end = nextToken ? nextToken.range[0] : semiToken.range[1];
					const text = expected === "last" ? ";\n" : "\n;";
					return fixer.replaceTextRange([start, end], text);
				}
			});
		}
		return {
			[SELECTOR](node) {
				if (option === "first" && isLastChild(node)) return;
				const lastToken = sourceCode.getLastToken(node);
				if ((0, import_ast_utils.isSemicolonToken)(lastToken)) check(lastToken, option);
			},
			ForStatement(node) {
				const firstSemi = node.init && sourceCode.getTokenAfter(node.init, import_ast_utils.isSemicolonToken);
				const secondSemi = node.test && sourceCode.getTokenAfter(node.test, import_ast_utils.isSemicolonToken);
				if (firstSemi) check(firstSemi, "last");
				if (secondSemi) check(secondSemi, "last");
			}
		};
	}
});
export { semi_style_default as t };
