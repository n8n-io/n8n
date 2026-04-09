import { K as isSingleLine, O as getNextLocation, f as createRule, g as import_ast_utils, m as AST_NODE_TYPES, t as FixTracker } from "../utils.js";
var semi_default = createRule({
	name: "semi",
	meta: {
		type: "layout",
		docs: { description: "Require or disallow semicolons instead of ASI" },
		fixable: "code",
		schema: { anyOf: [{
			type: "array",
			items: [{
				type: "string",
				enum: ["never"]
			}, {
				type: "object",
				properties: { beforeStatementContinuationChars: {
					type: "string",
					enum: [
						"always",
						"any",
						"never"
					]
				} },
				additionalProperties: false
			}],
			minItems: 0,
			maxItems: 2
		}, {
			type: "array",
			items: [{
				type: "string",
				enum: ["always"]
			}, {
				type: "object",
				properties: {
					omitLastInOneLineBlock: { type: "boolean" },
					omitLastInOneLineClassBody: { type: "boolean" }
				},
				additionalProperties: false
			}],
			minItems: 0,
			maxItems: 2
		}] },
		defaultOptions: ["always"],
		messages: {
			missingSemi: "Missing semicolon.",
			extraSemi: "Extra semicolon."
		}
	},
	create(context, [mode, options]) {
		const OPT_OUT_PATTERN = /^[-[(/+`]/u;
		const unsafeClassFieldNames = new Set([
			"get",
			"set",
			"static"
		]);
		const unsafeClassFieldFollowers = new Set([
			"*",
			"in",
			"instanceof"
		]);
		const never = mode === "never";
		const exceptOneLine = Boolean(options && "omitLastInOneLineBlock" in options && options.omitLastInOneLineBlock);
		const exceptOneLineClassBody = Boolean(options && "omitLastInOneLineClassBody" in options && options.omitLastInOneLineClassBody);
		const beforeStatementContinuationChars = options && "beforeStatementContinuationChars" in options && options.beforeStatementContinuationChars || "any";
		const sourceCode = context.sourceCode;
		function report(node, missing = false) {
			const lastToken = sourceCode.getLastToken(node);
			let messageId = "missingSemi";
			let fix, loc;
			if (!missing) {
				loc = {
					start: lastToken.loc.end,
					end: getNextLocation(sourceCode, lastToken.loc.end)
				};
				fix = function(fixer) {
					return fixer.insertTextAfter(lastToken, ";");
				};
			} else {
				messageId = "extraSemi";
				loc = lastToken.loc;
				fix = function(fixer) {
					return new FixTracker(fixer, sourceCode).retainSurroundingTokens(lastToken).remove(lastToken);
				};
			}
			context.report({
				node,
				loc,
				messageId,
				fix
			});
		}
		function isRedundantSemi(semiToken) {
			const nextToken = sourceCode.getTokenAfter(semiToken);
			return !nextToken || (0, import_ast_utils.isClosingBraceToken)(nextToken) || (0, import_ast_utils.isSemicolonToken)(nextToken);
		}
		function isEndOfArrowBlock(lastToken) {
			if (!(0, import_ast_utils.isClosingBraceToken)(lastToken)) return false;
			const node = sourceCode.getNodeByRangeIndex(lastToken.range[0]);
			return node.type === "BlockStatement" && node.parent.type === "ArrowFunctionExpression";
		}
		function maybeClassFieldAsiHazard(node) {
			if (node.type !== "PropertyDefinition") return false;
			if (!node.computed && node.key.type === "Identifier" && "name" in node.key && unsafeClassFieldNames.has(node.key.name)) {
				if (!(node.static && node.key.name === "static") && !node.value) return true;
			}
			const followingToken = sourceCode.getTokenAfter(node);
			return unsafeClassFieldFollowers.has(followingToken.value);
		}
		function isOnSameLineWithNextToken(node) {
			const prevToken = sourceCode.getLastToken(node, 1);
			const nextToken = sourceCode.getTokenAfter(node);
			return !!nextToken && (0, import_ast_utils.isTokenOnSameLine)(prevToken, nextToken);
		}
		function maybeAsiHazardAfter(node) {
			const t = node.type;
			if (t === "DoWhileStatement" || t === "BreakStatement" || t === "ContinueStatement" || t === "DebuggerStatement" || t === "ImportDeclaration" || t === "ExportAllDeclaration") return false;
			if (t === "ReturnStatement") return Boolean(node.argument);
			if (t === "ExportNamedDeclaration") return Boolean(node.declaration);
			if (isEndOfArrowBlock(sourceCode.getLastToken(node, 1))) return false;
			return true;
		}
		function maybeAsiHazardBefore(token) {
			return Boolean(token) && OPT_OUT_PATTERN.test(token.value) && token.value !== "++" && token.value !== "--";
		}
		function canRemoveSemicolon(node) {
			if (isRedundantSemi(sourceCode.getLastToken(node))) return true;
			if (maybeClassFieldAsiHazard(node)) return false;
			if (isOnSameLineWithNextToken(node)) return false;
			if (node.type !== "PropertyDefinition" && beforeStatementContinuationChars === "never" && !maybeAsiHazardAfter(node)) return true;
			if (!maybeAsiHazardBefore(sourceCode.getTokenAfter(node))) return true;
			return false;
		}
		function isLastInOneLinerBlock(node) {
			const parent = node.parent;
			const nextToken = sourceCode.getTokenAfter(node);
			if (!nextToken || nextToken.value !== "}") return false;
			if (parent.type === "BlockStatement") return isSingleLine(parent);
			if (parent.type === "StaticBlock") return (0, import_ast_utils.isTokenOnSameLine)(parent, sourceCode.getFirstToken(parent, { skip: 1 }));
			return false;
		}
		function isLastInOneLinerClassBody(node) {
			const parent = node.parent;
			const nextToken = sourceCode.getTokenAfter(node);
			if (!nextToken || nextToken.value !== "}") return false;
			if (parent.type === "ClassBody") return isSingleLine(parent);
			return false;
		}
		function checkForSemicolon(node) {
			const isSemi = (0, import_ast_utils.isSemicolonToken)(sourceCode.getLastToken(node));
			if (never) {
				const nextToken = sourceCode.getTokenAfter(node);
				if (isSemi && canRemoveSemicolon(node)) report(node, true);
				else if (!isSemi && beforeStatementContinuationChars === "always" && node.type !== "PropertyDefinition" && maybeAsiHazardBefore(nextToken)) report(node);
			} else {
				const oneLinerBlock = exceptOneLine && isLastInOneLinerBlock(node);
				const oneLinerClassBody = exceptOneLineClassBody && isLastInOneLinerClassBody(node);
				const oneLinerBlockOrClassBody = oneLinerBlock || oneLinerClassBody;
				if (isSemi && oneLinerBlockOrClassBody) report(node, true);
				else if (!isSemi && !oneLinerBlockOrClassBody) report(node);
			}
		}
		return {
			VariableDeclaration(node) {
				const parent = node.parent;
				if ((parent.type !== "ForStatement" || parent.init !== node) && (!/^For(?:In|Of)Statement/u.test(parent.type) || parent.left !== node)) checkForSemicolon(node);
			},
			ExpressionStatement: checkForSemicolon,
			ReturnStatement: checkForSemicolon,
			ThrowStatement: checkForSemicolon,
			DoWhileStatement: checkForSemicolon,
			DebuggerStatement: checkForSemicolon,
			BreakStatement: checkForSemicolon,
			ContinueStatement: checkForSemicolon,
			ImportDeclaration: checkForSemicolon,
			ExportAllDeclaration: checkForSemicolon,
			ExportNamedDeclaration(node) {
				if (!node.declaration) checkForSemicolon(node);
			},
			ExportDefaultDeclaration(node) {
				if (node.declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration) return;
				if (!/(?:Class|Function)Declaration/u.test(node.declaration.type)) checkForSemicolon(node);
			},
			PropertyDefinition: checkForSemicolon,
			AccessorProperty: checkForSemicolon,
			TSAbstractPropertyDefinition: checkForSemicolon,
			TSDeclareFunction: checkForSemicolon,
			TSExportAssignment: checkForSemicolon,
			TSImportEqualsDeclaration: checkForSemicolon,
			TSTypeAliasDeclaration: checkForSemicolon,
			TSEmptyBodyFunctionExpression: checkForSemicolon
		};
	}
});
export { semi_default as t };
