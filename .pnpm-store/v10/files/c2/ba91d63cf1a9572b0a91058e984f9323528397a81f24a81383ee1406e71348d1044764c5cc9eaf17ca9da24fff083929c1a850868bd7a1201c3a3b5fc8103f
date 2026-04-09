import { K as isSingleLine, Y as isTopLevelExpressionStatement, Z as skipChainExpression, f as createRule, g as import_ast_utils, m as AST_NODE_TYPES, x as LINEBREAKS } from "../utils.js";
const CJS_EXPORT = /^(?:module\s*\.\s*)?exports(?:\s*\.|\s*\[|$)/u;
const CJS_IMPORT = /^require\(/u;
const LT = `[${Array.from(LINEBREAKS).join("")}]`;
const PADDING_LINE_SEQUENCE = new RegExp(String.raw`^(\s*?${LT})\s*${LT}(\s*;?)$`, "u");
function isSelectorOption(option) {
	return typeof option === "object" && !Array.isArray(option);
}
function newKeywordTester(type, keyword) {
	return { test(node, sourceCode) {
		const isSameKeyword = sourceCode.getFirstToken(node)?.value === keyword;
		const isSameType = Array.isArray(type) ? type.includes(node.type) : type === node.type;
		return isSameKeyword && isSameType;
	} };
}
function newNodeTypeTester(type) {
	return { test: (node) => node.type === type };
}
function isIIFEStatement(node) {
	if (node.type === AST_NODE_TYPES.ExpressionStatement) {
		let expression = skipChainExpression(node.expression);
		if (expression.type === AST_NODE_TYPES.UnaryExpression) expression = skipChainExpression(expression.argument);
		if (expression.type === AST_NODE_TYPES.CallExpression) {
			let node = expression.callee;
			while (node.type === AST_NODE_TYPES.SequenceExpression) node = node.expressions[node.expressions.length - 1];
			return (0, import_ast_utils.isFunction)(node);
		}
	}
	return false;
}
function isCJSRequire(node) {
	if (node.type === AST_NODE_TYPES.VariableDeclaration) {
		const declaration = node.declarations[0];
		if (declaration?.init) {
			let call = declaration?.init;
			while (call.type === AST_NODE_TYPES.MemberExpression) call = call.object;
			if (call.type === AST_NODE_TYPES.CallExpression && call.callee.type === AST_NODE_TYPES.Identifier) return call.callee.name === "require";
		}
	}
	return false;
}
function isBlockLikeStatement(node, sourceCode) {
	if (node.type === AST_NODE_TYPES.DoWhileStatement && node.body.type === AST_NODE_TYPES.BlockStatement) return true;
	if (isIIFEStatement(node)) return true;
	const lastToken = sourceCode.getLastToken(node, import_ast_utils.isNotSemicolonToken);
	const belongingNode = lastToken && (0, import_ast_utils.isClosingBraceToken)(lastToken) ? sourceCode.getNodeByRangeIndex(lastToken.range[0]) : null;
	return !!belongingNode && (belongingNode.type === AST_NODE_TYPES.BlockStatement || belongingNode.type === AST_NODE_TYPES.SwitchStatement);
}
function isDirective(node, sourceCode) {
	return isTopLevelExpressionStatement(node) && node.expression.type === AST_NODE_TYPES.Literal && typeof node.expression.value === "string" && !(0, import_ast_utils.isParenthesized)(node.expression, sourceCode);
}
function isDirectivePrologue(node, sourceCode) {
	if (isDirective(node, sourceCode) && node.parent && "body" in node.parent && Array.isArray(node.parent.body)) {
		for (const sibling of node.parent.body) {
			if (sibling === node) break;
			if (!isDirective(sibling, sourceCode)) return false;
		}
		return true;
	}
	return false;
}
function isCJSExport(node) {
	if (node.type === AST_NODE_TYPES.ExpressionStatement) {
		const expression = node.expression;
		if (expression.type === AST_NODE_TYPES.AssignmentExpression) {
			let left = expression.left;
			if (left.type === AST_NODE_TYPES.MemberExpression) {
				while (left.object.type === AST_NODE_TYPES.MemberExpression) left = left.object;
				return left.object.type === AST_NODE_TYPES.Identifier && (left.object.name === "exports" || left.object.name === "module" && left.property.type === AST_NODE_TYPES.Identifier && left.property.name === "exports");
			}
		}
	}
	return false;
}
function isExpression(node, sourceCode) {
	return node.type === AST_NODE_TYPES.ExpressionStatement && !isDirectivePrologue(node, sourceCode);
}
function getActualLastToken(node, sourceCode) {
	const semiToken = sourceCode.getLastToken(node);
	const prevToken = sourceCode.getTokenBefore(semiToken);
	const nextToken = sourceCode.getTokenAfter(semiToken);
	return prevToken && nextToken && prevToken.range[0] >= node.range[0] && (0, import_ast_utils.isSemicolonToken)(semiToken) && !(0, import_ast_utils.isTokenOnSameLine)(prevToken, semiToken) && (0, import_ast_utils.isTokenOnSameLine)(semiToken, nextToken) ? prevToken : semiToken;
}
function replacerToRemovePaddingLines(_, trailingSpaces, indentSpaces) {
	return trailingSpaces + indentSpaces;
}
function getReportLoc(node, sourceCode) {
	if (isSingleLine(node)) return node.loc;
	const line = node.loc.start.line;
	return {
		start: node.loc.start,
		end: {
			line,
			column: sourceCode.lines[line - 1].length
		}
	};
}
function verifyForAny() {}
function verifyForNever(context, _, nextNode, paddingLines) {
	if (paddingLines.length === 0) return;
	context.report({
		node: nextNode,
		messageId: "unexpectedBlankLine",
		loc: getReportLoc(nextNode, context.sourceCode),
		fix(fixer) {
			if (paddingLines.length >= 2) return null;
			const prevToken = paddingLines[0][0];
			const nextToken = paddingLines[0][1];
			const start = prevToken.range[1];
			const end = nextToken.range[0];
			const text = context.sourceCode.text.slice(start, end).replace(PADDING_LINE_SEQUENCE, replacerToRemovePaddingLines);
			return fixer.replaceTextRange([start, end], text);
		}
	});
}
function verifyForAlways(context, prevNode, nextNode, paddingLines) {
	if (paddingLines.length > 0) return;
	context.report({
		node: nextNode,
		messageId: "expectedBlankLine",
		loc: getReportLoc(nextNode, context.sourceCode),
		fix(fixer) {
			const sourceCode = context.sourceCode;
			let prevToken = getActualLastToken(prevNode, sourceCode);
			const nextToken = sourceCode.getFirstTokenBetween(prevToken, nextNode, {
				includeComments: true,
				filter(token) {
					if ((0, import_ast_utils.isTokenOnSameLine)(prevToken, token)) {
						prevToken = token;
						return false;
					}
					return true;
				}
			}) || nextNode;
			const insertText = (0, import_ast_utils.isTokenOnSameLine)(prevToken, nextToken) ? "\n\n" : "\n";
			return fixer.insertTextAfter(prevToken, insertText);
		}
	});
}
const PaddingTypes = {
	any: { verify: verifyForAny },
	never: { verify: verifyForNever },
	always: { verify: verifyForAlways }
};
const MaybeMultilineStatementType = {
	"block-like": { test: isBlockLikeStatement },
	"expression": { test: isExpression },
	"return": newKeywordTester(AST_NODE_TYPES.ReturnStatement, "return"),
	"export": newKeywordTester([
		AST_NODE_TYPES.ExportAllDeclaration,
		AST_NODE_TYPES.ExportDefaultDeclaration,
		AST_NODE_TYPES.ExportNamedDeclaration
	], "export"),
	"var": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "var"),
	"let": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "let"),
	"const": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "const"),
	"using": { test: (node) => node.type === "VariableDeclaration" && (node.kind === "using" || node.kind === "await using") },
	"type": newKeywordTester(AST_NODE_TYPES.TSTypeAliasDeclaration, "type")
};
const StatementTypes = {
	"*": { test: () => true },
	"exports": { test: isCJSExport },
	"require": { test: isCJSRequire },
	"directive": { test: isDirectivePrologue },
	"iife": { test: isIIFEStatement },
	"block": newNodeTypeTester(AST_NODE_TYPES.BlockStatement),
	"empty": newNodeTypeTester(AST_NODE_TYPES.EmptyStatement),
	"function": newNodeTypeTester(AST_NODE_TYPES.FunctionDeclaration),
	"ts-method": newNodeTypeTester(AST_NODE_TYPES.TSMethodSignature),
	"break": newKeywordTester(AST_NODE_TYPES.BreakStatement, "break"),
	"case": newKeywordTester(AST_NODE_TYPES.SwitchCase, "case"),
	"class": newKeywordTester(AST_NODE_TYPES.ClassDeclaration, "class"),
	"continue": newKeywordTester(AST_NODE_TYPES.ContinueStatement, "continue"),
	"debugger": newKeywordTester(AST_NODE_TYPES.DebuggerStatement, "debugger"),
	"default": newKeywordTester([AST_NODE_TYPES.SwitchCase, AST_NODE_TYPES.ExportDefaultDeclaration], "default"),
	"do": newKeywordTester(AST_NODE_TYPES.DoWhileStatement, "do"),
	"for": newKeywordTester([
		AST_NODE_TYPES.ForStatement,
		AST_NODE_TYPES.ForInStatement,
		AST_NODE_TYPES.ForOfStatement
	], "for"),
	"if": newKeywordTester(AST_NODE_TYPES.IfStatement, "if"),
	"import": newKeywordTester(AST_NODE_TYPES.ImportDeclaration, "import"),
	"switch": newKeywordTester(AST_NODE_TYPES.SwitchStatement, "switch"),
	"throw": newKeywordTester(AST_NODE_TYPES.ThrowStatement, "throw"),
	"try": newKeywordTester(AST_NODE_TYPES.TryStatement, "try"),
	"while": newKeywordTester([AST_NODE_TYPES.WhileStatement, AST_NODE_TYPES.DoWhileStatement], "while"),
	"with": newKeywordTester(AST_NODE_TYPES.WithStatement, "with"),
	"cjs-export": { test: (node, sourceCode) => node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && CJS_EXPORT.test(sourceCode.getText(node.expression.left)) },
	"cjs-import": { test: (node, sourceCode) => node.type === "VariableDeclaration" && node.declarations.length > 0 && Boolean(node.declarations[0].init) && CJS_IMPORT.test(sourceCode.getText(node.declarations[0].init)) },
	"enum": newKeywordTester(AST_NODE_TYPES.TSEnumDeclaration, "enum"),
	"interface": newKeywordTester(AST_NODE_TYPES.TSInterfaceDeclaration, "interface"),
	"function-overload": newNodeTypeTester(AST_NODE_TYPES.TSDeclareFunction),
	...Object.fromEntries(Object.entries(MaybeMultilineStatementType).flatMap(([key, value]) => [
		[key, value],
		[`singleline-${key}`, {
			...value,
			test: (node, sourceCode) => value.test(node, sourceCode) && isSingleLine(node)
		}],
		[`multiline-${key}`, {
			...value,
			test: (node, sourceCode) => value.test(node, sourceCode) && !isSingleLine(node)
		}]
	]))
};
var padding_line_between_statements_default = createRule({
	name: "padding-line-between-statements",
	meta: {
		type: "layout",
		docs: { description: "Require or disallow padding lines between statements" },
		fixable: "whitespace",
		hasSuggestions: false,
		schema: {
			$defs: {
				paddingType: {
					type: "string",
					enum: Object.keys(PaddingTypes)
				},
				statementType: {
					type: "string",
					enum: Object.keys(StatementTypes)
				},
				selectorOption: {
					type: "object",
					properties: {
						selector: { type: "string" },
						lineMode: {
							type: "string",
							enum: [
								"any",
								"singleline",
								"multiline"
							]
						}
					},
					required: ["selector"],
					additionalProperties: false
				},
				statementMatcher: { anyOf: [{ $ref: "#/$defs/statementType" }, { $ref: "#/$defs/selectorOption" }] },
				statementOption: { anyOf: [{ $ref: "#/$defs/statementMatcher" }, {
					type: "array",
					items: { $ref: "#/$defs/statementMatcher" },
					minItems: 1,
					uniqueItems: true,
					additionalItems: false
				}] }
			},
			type: "array",
			additionalItems: false,
			items: {
				type: "object",
				properties: {
					blankLine: { $ref: "#/$defs/paddingType" },
					prev: { $ref: "#/$defs/statementOption" },
					next: { $ref: "#/$defs/statementOption" }
				},
				additionalProperties: false,
				required: [
					"blankLine",
					"prev",
					"next"
				]
			}
		},
		defaultOptions: [],
		messages: {
			unexpectedBlankLine: "Unexpected blank line before this statement.",
			expectedBlankLine: "Expected blank line before this statement."
		}
	},
	create(context, options) {
		const sourceCode = context.sourceCode;
		const selectorMatchedNodes = /* @__PURE__ */ new Map();
		const pendingPairs = [];
		function collectSelectorOption(option) {
			if (Array.isArray(option)) {
				for (const item of option) collectSelectorOption(item);
				return;
			}
			if (!isSelectorOption(option)) return;
			selectorMatchedNodes.set(option.selector, /* @__PURE__ */ new Set());
		}
		for (const configure of options) {
			collectSelectorOption(configure.prev);
			collectSelectorOption(configure.next);
		}
		let scopeInfo = null;
		function enterScope() {
			scopeInfo = {
				upper: scopeInfo,
				prevNode: null
			};
		}
		function exitScope() {
			if (scopeInfo) scopeInfo = scopeInfo.upper;
		}
		function match(node, type) {
			let innerStatementNode = node;
			while (innerStatementNode.type === AST_NODE_TYPES.LabeledStatement) innerStatementNode = innerStatementNode.body;
			if (Array.isArray(type)) return type.some(match.bind(null, innerStatementNode));
			if (isSelectorOption(type)) {
				if (!selectorMatchedNodes.get(type.selector)?.has(innerStatementNode)) return false;
				const lineMode = type.lineMode;
				if (lineMode === "singleline") return isSingleLine(innerStatementNode);
				else if (lineMode === "multiline") return !isSingleLine(innerStatementNode);
				return true;
			} else return StatementTypes[type].test(innerStatementNode, sourceCode);
		}
		function getPaddingType(prevNode, nextNode) {
			for (let i = options.length - 1; i >= 0; --i) {
				const configure = options[i];
				if (match(prevNode, configure.prev) && match(nextNode, configure.next)) return PaddingTypes[configure.blankLine];
			}
			return PaddingTypes.any;
		}
		function getPaddingLineSequences(prevNode, nextNode) {
			const pairs = [];
			let prevToken = getActualLastToken(prevNode, sourceCode);
			if (nextNode.loc.start.line - prevToken.loc.end.line >= 2) do {
				const token = sourceCode.getTokenAfter(prevToken, { includeComments: true });
				if (token.loc.start.line - prevToken.loc.end.line >= 2) pairs.push([prevToken, token]);
				prevToken = token;
			} while (prevToken.range[0] < nextNode.range[0]);
			return pairs;
		}
		function verify(node) {
			if (!node.parent || ![
				AST_NODE_TYPES.BlockStatement,
				AST_NODE_TYPES.Program,
				AST_NODE_TYPES.StaticBlock,
				AST_NODE_TYPES.SwitchCase,
				AST_NODE_TYPES.SwitchStatement,
				AST_NODE_TYPES.TSInterfaceBody,
				AST_NODE_TYPES.TSModuleBlock,
				AST_NODE_TYPES.TSTypeLiteral
			].includes(node.parent.type)) return;
			const prevNode = scopeInfo.prevNode;
			if (prevNode) pendingPairs.push({
				prevNode,
				nextNode: node
			});
			scopeInfo.prevNode = node;
		}
		function verifyPendingPairs() {
			for (const { prevNode, nextNode } of pendingPairs) {
				const type = getPaddingType(prevNode, nextNode);
				const paddingLines = getPaddingLineSequences(prevNode, nextNode);
				type.verify(context, prevNode, nextNode, paddingLines);
			}
		}
		function verifyThenEnterScope(node) {
			verify(node);
			enterScope();
		}
		const selectorMatchListeners = Object.fromEntries(Array.from(selectorMatchedNodes.keys(), (selector) => [selector, (node) => {
			selectorMatchedNodes.get(selector)?.add(node);
		}]));
		return {
			"Program": enterScope,
			"Program:exit": () => {
				verifyPendingPairs();
				exitScope();
			},
			"BlockStatement": enterScope,
			"BlockStatement:exit": exitScope,
			"SwitchStatement": enterScope,
			"SwitchStatement:exit": exitScope,
			"SwitchCase": verifyThenEnterScope,
			"SwitchCase:exit": exitScope,
			"StaticBlock": enterScope,
			"StaticBlock:exit": exitScope,
			"TSInterfaceBody": enterScope,
			"TSInterfaceBody:exit": exitScope,
			"TSModuleBlock": enterScope,
			"TSModuleBlock:exit": exitScope,
			"TSTypeLiteral": enterScope,
			"TSTypeLiteral:exit": exitScope,
			"TSDeclareFunction": verifyThenEnterScope,
			"TSDeclareFunction:exit": exitScope,
			"TSMethodSignature": verifyThenEnterScope,
			"TSMethodSignature:exit": exitScope,
			":statement": verify,
			...selectorMatchListeners
		};
	}
});
export { padding_line_between_statements_default as t };
