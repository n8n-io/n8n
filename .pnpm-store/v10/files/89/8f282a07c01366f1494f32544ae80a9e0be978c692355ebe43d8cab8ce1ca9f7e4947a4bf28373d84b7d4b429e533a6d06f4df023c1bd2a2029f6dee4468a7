import { L as isHashbangComment, f as createRule, g as import_ast_utils, h as AST_TOKEN_TYPES, m as AST_NODE_TYPES, v as COMMENTS_IGNORE_PATTERN } from "../utils.js";
function getEmptyLineNums(lines) {
	const emptyLines = [];
	lines.forEach((line, i) => {
		if (!line.trim()) emptyLines.push(i + 1);
	});
	return emptyLines;
}
function getCommentLineNums(comments) {
	const lines = [];
	comments.forEach((token) => {
		const start = token.loc.start.line;
		const end = token.loc.end.line;
		lines.push(start, end);
	});
	return lines;
}
const ALLOW_TARGETS = [
	"Block",
	"Class",
	"Object",
	"Array",
	"Interface",
	"Type",
	"Enum",
	"Module"
];
const ALLOW_NODE_TYPES = {
	Block: [
		AST_NODE_TYPES.ClassBody,
		AST_NODE_TYPES.BlockStatement,
		AST_NODE_TYPES.StaticBlock,
		AST_NODE_TYPES.SwitchCase,
		AST_NODE_TYPES.SwitchStatement
	],
	Class: [AST_NODE_TYPES.ClassBody],
	Object: [AST_NODE_TYPES.ObjectExpression, AST_NODE_TYPES.ObjectPattern],
	Array: [AST_NODE_TYPES.ArrayExpression, AST_NODE_TYPES.ArrayPattern],
	Interface: [AST_NODE_TYPES.TSInterfaceBody],
	Type: [AST_NODE_TYPES.TSTypeLiteral],
	Enum: [AST_NODE_TYPES.TSEnumBody, AST_NODE_TYPES.TSEnumDeclaration],
	Module: [AST_NODE_TYPES.TSModuleBlock]
};
function getAllowOptionName(target, boundary) {
	return `allow${target}${boundary}`;
}
var lines_around_comment_default = createRule({
	name: "lines-around-comment",
	meta: {
		type: "layout",
		docs: { description: "Require empty lines around comments" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				beforeBlockComment: { type: "boolean" },
				afterBlockComment: { type: "boolean" },
				beforeLineComment: { type: "boolean" },
				afterLineComment: { type: "boolean" },
				...Object.fromEntries(ALLOW_TARGETS.flatMap((target) => [[getAllowOptionName(target, "Start"), { type: "boolean" }], [getAllowOptionName(target, "End"), { type: "boolean" }]])),
				ignorePattern: { type: "string" },
				applyDefaultIgnorePatterns: { type: "boolean" },
				afterHashbangComment: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{ beforeBlockComment: true }],
		messages: {
			after: "Expected line after comment.",
			before: "Expected line before comment."
		}
	},
	create(context, [options]) {
		const normalizedOptions = options;
		const defaultIgnoreRegExp = COMMENTS_IGNORE_PATTERN;
		const { beforeBlockComment, afterBlockComment, beforeLineComment, afterLineComment, afterHashbangComment, applyDefaultIgnorePatterns, ignorePattern = "" } = normalizedOptions;
		const customIgnoreRegExp = ignorePattern ? new RegExp(ignorePattern, "u") : null;
		const sourceCode = context.sourceCode;
		const comments = sourceCode.getAllComments();
		const lines = sourceCode.lines;
		const numLines = lines.length + 1;
		const commentLines = getCommentLineNums(comments);
		const emptyLines = getEmptyLineNums(lines);
		const commentAndEmptyLines = new Set(commentLines.concat(emptyLines));
		function codeAroundComment(token) {
			let currentToken = token;
			do
				currentToken = sourceCode.getTokenBefore(currentToken, { includeComments: true });
			while (currentToken && (0, import_ast_utils.isCommentToken)(currentToken));
			if (currentToken && (0, import_ast_utils.isTokenOnSameLine)(currentToken, token)) return true;
			currentToken = token;
			do
				currentToken = sourceCode.getTokenAfter(currentToken, { includeComments: true });
			while (currentToken && (0, import_ast_utils.isCommentToken)(currentToken));
			if (currentToken && (0, import_ast_utils.isTokenOnSameLine)(token, currentToken)) return true;
			return false;
		}
		function getParentNodeOfToken(token) {
			const node = sourceCode.getNodeByRangeIndex(token.range[0]);
			if (node && node.type === "StaticBlock") {
				const openingBrace = sourceCode.getFirstToken(node, { skip: 1 });
				return openingBrace && token.range[0] >= openingBrace.range[0] ? node : null;
			}
			return node;
		}
		function isCommentAtParentStart(token, nodeTypes) {
			const parent = getParentNodeOfToken(token);
			if (parent && (0, import_ast_utils.isNodeOfTypes)(nodeTypes)(parent)) {
				let parentStartNodeOrToken = parent;
				if (parent.type === "StaticBlock") parentStartNodeOrToken = sourceCode.getFirstToken(parent, { skip: 1 });
				else if (parent.type === "SwitchStatement") parentStartNodeOrToken = sourceCode.getTokenAfter(parent.discriminant, { filter: import_ast_utils.isOpeningBraceToken });
				return !!parentStartNodeOrToken && token.loc.start.line - parentStartNodeOrToken.loc.start.line === 1;
			}
			return false;
		}
		function isCommentAtParentEnd(token, nodeTypes) {
			const parent = getParentNodeOfToken(token);
			return !!parent && (0, import_ast_utils.isNodeOfTypes)(nodeTypes)(parent) && parent.loc.end.line - token.loc.end.line === 1;
		}
		function isCommentAtBoundary(token, target, boundary) {
			return (boundary === "Start" ? isCommentAtParentStart : isCommentAtParentEnd)(token, ALLOW_NODE_TYPES[target]);
		}
		function isExceptionAllowed(token, boundary) {
			const blockOptionName = getAllowOptionName("Block", boundary);
			const classOptionName = getAllowOptionName("Class", boundary);
			if (normalizedOptions[blockOptionName] && isCommentAtBoundary(token, "Block", boundary) && !(normalizedOptions[classOptionName] === false && isCommentAtBoundary(token, "Class", boundary))) return true;
			return ALLOW_TARGETS.some((target) => {
				if (target === "Block") return false;
				const optionName = getAllowOptionName(target, boundary);
				return Boolean(normalizedOptions[optionName]) && isCommentAtBoundary(token, target, boundary);
			});
		}
		function checkForEmptyLine(token, { before, after }) {
			if (applyDefaultIgnorePatterns !== false && defaultIgnoreRegExp.test(token.value)) return;
			if (customIgnoreRegExp?.test(token.value)) return;
			const prevLineNum = token.loc.start.line - 1;
			const nextLineNum = token.loc.end.line + 1;
			if (prevLineNum < 1) before = false;
			if (nextLineNum >= numLines) after = false;
			if (codeAroundComment(token)) return;
			const exceptionStartAllowed = isExceptionAllowed(token, "Start");
			const exceptionEndAllowed = isExceptionAllowed(token, "End");
			const previousTokenOrComment = sourceCode.getTokenBefore(token, { includeComments: true });
			const nextTokenOrComment = sourceCode.getTokenAfter(token, { includeComments: true });
			if (!exceptionStartAllowed && before && !commentAndEmptyLines.has(prevLineNum) && !((0, import_ast_utils.isCommentToken)(previousTokenOrComment) && (0, import_ast_utils.isTokenOnSameLine)(previousTokenOrComment, token))) {
				const lineStart = token.range[0] - token.loc.start.column;
				const range = [lineStart, lineStart];
				context.report({
					node: token,
					messageId: "before",
					fix(fixer) {
						return fixer.insertTextBeforeRange(range, "\n");
					}
				});
			}
			if (!exceptionEndAllowed && after && !commentAndEmptyLines.has(nextLineNum) && !((0, import_ast_utils.isCommentToken)(nextTokenOrComment) && (0, import_ast_utils.isTokenOnSameLine)(token, nextTokenOrComment))) context.report({
				node: token,
				messageId: "after",
				fix(fixer) {
					return fixer.insertTextAfter(token, "\n");
				}
			});
		}
		return { Program() {
			comments.forEach((token) => {
				if (token.type === AST_TOKEN_TYPES.Line) {
					if (beforeLineComment || afterLineComment) checkForEmptyLine(token, {
						after: afterLineComment,
						before: beforeLineComment
					});
				} else if (token.type === AST_TOKEN_TYPES.Block) {
					if (beforeBlockComment || afterBlockComment) checkForEmptyLine(token, {
						after: afterBlockComment,
						before: beforeBlockComment
					});
				} else if (isHashbangComment(token)) {
					if (afterHashbangComment) checkForEmptyLine(token, {
						after: afterHashbangComment,
						before: false
					});
				}
			});
		} };
	}
});
export { lines_around_comment_default as t };
