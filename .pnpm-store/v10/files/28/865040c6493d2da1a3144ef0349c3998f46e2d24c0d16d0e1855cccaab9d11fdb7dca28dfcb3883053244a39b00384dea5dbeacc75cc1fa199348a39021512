import { Y as isTopLevelExpressionStatement, f as createRule, g as import_ast_utils, t as FixTracker } from "../utils.js";
var no_extra_semi_default = createRule({
	name: "no-extra-semi",
	meta: {
		type: "layout",
		docs: { description: "Disallow unnecessary semicolons" },
		fixable: "code",
		schema: [],
		messages: { unexpected: "Unnecessary semicolon." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		function isFixable(nodeOrToken) {
			const nextToken = sourceCode.getTokenAfter(nodeOrToken);
			if (!nextToken || nextToken.type !== "String") return true;
			return !isTopLevelExpressionStatement(sourceCode.getNodeByRangeIndex(nextToken.range[0]).parent);
		}
		function report(nodeOrToken) {
			context.report({
				node: nodeOrToken,
				messageId: "unexpected",
				fix: isFixable(nodeOrToken) ? (fixer) => new FixTracker(fixer, context.sourceCode).retainSurroundingTokens(nodeOrToken).remove(nodeOrToken) : null
			});
		}
		function checkForPartOfClassBody(firstToken) {
			for (let token = firstToken; token.type === "Punctuator" && !(0, import_ast_utils.isClosingBraceToken)(token); token = sourceCode.getTokenAfter(token)) if ((0, import_ast_utils.isSemicolonToken)(token)) report(token);
		}
		return {
			EmptyStatement(node) {
				const parent = node.parent;
				if (![
					"ForStatement",
					"ForInStatement",
					"ForOfStatement",
					"WhileStatement",
					"DoWhileStatement",
					"IfStatement",
					"LabeledStatement",
					"WithStatement"
				].includes(parent.type)) report(node);
			},
			ClassBody(node) {
				checkForPartOfClassBody(sourceCode.getFirstToken(node, 1));
			},
			MethodDefinition(node) {
				checkForPartOfClassBody(sourceCode.getTokenAfter(node));
			},
			PropertyDefinition(node) {
				checkForPartOfClassBody(sourceCode.getTokenAfter(node));
			},
			AccessorProperty(node) {
				checkForPartOfClassBody(sourceCode.getTokenAfter(node));
			},
			StaticBlock(node) {
				checkForPartOfClassBody(sourceCode.getTokenAfter(node));
			},
			TSAbstractMethodDefinition(node) {
				checkForPartOfClassBody(sourceCode.getTokenAfter(node));
			},
			TSAbstractPropertyDefinition(node) {
				checkForPartOfClassBody(sourceCode.getTokenAfter(node));
			}
		};
	}
});
export { no_extra_semi_default as t };
