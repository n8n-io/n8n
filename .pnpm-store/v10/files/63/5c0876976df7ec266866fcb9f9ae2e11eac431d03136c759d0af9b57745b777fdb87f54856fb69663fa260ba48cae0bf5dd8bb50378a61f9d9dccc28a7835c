import { f as createRule, g as import_ast_utils } from "../utils.js";
const listeningNodes = [
	"BreakStatement",
	"ClassDeclaration",
	"ContinueStatement",
	"DebuggerStatement",
	"DoWhileStatement",
	"ExpressionStatement",
	"ForInStatement",
	"ForOfStatement",
	"ForStatement",
	"FunctionDeclaration",
	"IfStatement",
	"ImportDeclaration",
	"LabeledStatement",
	"ReturnStatement",
	"SwitchStatement",
	"ThrowStatement",
	"TryStatement",
	"VariableDeclaration",
	"WhileStatement",
	"WithStatement",
	"ExportNamedDeclaration",
	"ExportDefaultDeclaration",
	"ExportAllDeclaration"
];
var max_statements_per_line_default = createRule({
	name: "max-statements-per-line",
	meta: {
		type: "layout",
		docs: { description: "Enforce a maximum number of statements allowed per line" },
		schema: [{
			type: "object",
			properties: {
				max: {
					type: "integer",
					minimum: 1
				},
				ignoredNodes: {
					type: "array",
					items: {
						type: "string",
						enum: listeningNodes
					}
				}
			},
			additionalProperties: false
		}],
		defaultOptions: [{ max: 1 }],
		messages: { exceed: "This line has {{numberOfStatementsOnThisLine}} {{statements}}. Maximum allowed is {{maxStatementsPerLine}}." }
	},
	create(context, [options]) {
		const { max: maxStatementsPerLine = 1, ignoredNodes = [] } = options;
		const sourceCode = context.sourceCode;
		let lastStatementLine = 0;
		let numberOfStatementsOnThisLine = 0;
		let firstExtraStatement = null;
		const SINGLE_CHILD_ALLOWED = /^(?:(?:DoWhile|For|ForIn|ForOf|If|Labeled|While)Statement|Export(?:Default|Named)Declaration)$/u;
		function reportFirstExtraStatementAndClear() {
			if (firstExtraStatement) context.report({
				node: firstExtraStatement,
				messageId: "exceed",
				data: {
					numberOfStatementsOnThisLine,
					maxStatementsPerLine,
					statements: numberOfStatementsOnThisLine === 1 ? "statement" : "statements"
				}
			});
			firstExtraStatement = null;
		}
		function getActualLastToken(node) {
			return sourceCode.getLastToken(node, import_ast_utils.isNotSemicolonToken);
		}
		function enterStatement(node) {
			const line = node.loc.start.line;
			if (node.parent && SINGLE_CHILD_ALLOWED.test(node.parent.type) && (!("alternate" in node.parent) || node.parent.alternate !== node)) return;
			if (line === lastStatementLine) numberOfStatementsOnThisLine += 1;
			else {
				reportFirstExtraStatementAndClear();
				numberOfStatementsOnThisLine = 1;
				lastStatementLine = line;
			}
			if (numberOfStatementsOnThisLine === maxStatementsPerLine + 1) firstExtraStatement = firstExtraStatement || node;
		}
		function leaveStatement(node) {
			const line = getActualLastToken(node).loc.end.line;
			if (line !== lastStatementLine) {
				reportFirstExtraStatementAndClear();
				numberOfStatementsOnThisLine = 1;
				lastStatementLine = line;
			}
		}
		const listeners = { "Program:exit": reportFirstExtraStatementAndClear };
		for (const node of listeningNodes) {
			if (ignoredNodes.includes(node)) continue;
			listeners[node] = enterStatement;
			listeners[`${node}:exit`] = leaveStatement;
		}
		return listeners;
	}
});
export { max_statements_per_line_default as t };
