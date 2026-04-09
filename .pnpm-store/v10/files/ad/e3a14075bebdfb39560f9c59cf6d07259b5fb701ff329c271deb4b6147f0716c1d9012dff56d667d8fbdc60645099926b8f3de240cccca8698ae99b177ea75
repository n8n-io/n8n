import { f as createRule, g as import_ast_utils, m as AST_NODE_TYPES } from "../utils.js";
var object_curly_spacing_default = createRule({
	name: "object-curly-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing inside braces" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "never"]
		}, {
			type: "object",
			properties: {
				arraysInObjects: { type: "boolean" },
				objectsInObjects: { type: "boolean" },
				overrides: {
					type: "object",
					properties: Object.fromEntries([
						"ObjectPattern",
						"ObjectExpression",
						"ImportDeclaration",
						"ImportAttributes",
						"ExportNamedDeclaration",
						"ExportAllDeclaration",
						"TSMappedType",
						"TSTypeLiteral",
						"TSInterfaceBody",
						"TSEnumBody"
					].map((node) => [node, {
						type: "string",
						enum: ["always", "never"]
					}])),
					additionalProperties: false
				},
				emptyObjects: {
					type: "string",
					enum: [
						"ignore",
						"always",
						"never"
					]
				}
			},
			additionalProperties: false
		}],
		defaultOptions: ["never"],
		messages: {
			requireSpaceBefore: "A space is required before '{{token}}'.",
			requireSpaceAfter: "A space is required after '{{token}}'.",
			unexpectedSpaceBefore: "There should be no space before '{{token}}'.",
			unexpectedSpaceAfter: "There should be no space after '{{token}}'.",
			requiredSpaceInEmptyObject: "A space is required in empty '{{node}}'.",
			unexpectedSpaceInEmptyObject: "There should be no space in empty '{{node}}'."
		}
	},
	create(context, [firstOption, secondOption]) {
		const spaced = firstOption === "always";
		const sourceCode = context.sourceCode;
		function isOptionSet(option) {
			return secondOption ? secondOption[option] === !spaced : false;
		}
		const options = {
			spaced,
			arraysInObjectsException: isOptionSet("arraysInObjects"),
			objectsInObjectsException: isOptionSet("objectsInObjects"),
			overrides: secondOption?.overrides ?? {},
			emptyObjects: secondOption?.emptyObjects ?? "ignore"
		};
		function reportNoBeginningSpace(node, token) {
			const nextToken = sourceCode.getTokenAfter(token, { includeComments: true });
			context.report({
				node,
				loc: {
					start: token.loc.end,
					end: nextToken.loc.start
				},
				messageId: "unexpectedSpaceAfter",
				data: { token: token.value },
				fix(fixer) {
					return fixer.removeRange([token.range[1], nextToken.range[0]]);
				}
			});
		}
		function reportNoEndingSpace(node, token) {
			const previousToken = sourceCode.getTokenBefore(token, { includeComments: true });
			context.report({
				node,
				loc: {
					start: previousToken.loc.end,
					end: token.loc.start
				},
				messageId: "unexpectedSpaceBefore",
				data: { token: token.value },
				fix(fixer) {
					return fixer.removeRange([previousToken.range[1], token.range[0]]);
				}
			});
		}
		function reportRequiredBeginningSpace(node, token) {
			context.report({
				node,
				loc: token.loc,
				messageId: "requireSpaceAfter",
				data: { token: token.value },
				fix(fixer) {
					return fixer.insertTextAfter(token, " ");
				}
			});
		}
		function reportRequiredEndingSpace(node, token) {
			context.report({
				node,
				loc: token.loc,
				messageId: "requireSpaceBefore",
				data: { token: token.value },
				fix(fixer) {
					return fixer.insertTextBefore(token, " ");
				}
			});
		}
		function validateBraceSpacing(node, openingToken, closingToken, nodeType = node.type) {
			const tokenAfterOpening = sourceCode.getTokenAfter(openingToken, { includeComments: true });
			const spaced = options.overrides[nodeType] ? options.overrides[nodeType] === "always" : options.spaced;
			if ((0, import_ast_utils.isTokenOnSameLine)(openingToken, tokenAfterOpening)) {
				const firstSpaced = sourceCode.isSpaceBetween(openingToken, tokenAfterOpening);
				const secondType = sourceCode.getNodeByRangeIndex(tokenAfterOpening.range[0]).type;
				const openingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [AST_NODE_TYPES.TSMappedType, AST_NODE_TYPES.TSIndexSignature].includes(secondType) ? !spaced : spaced;
				if (openingCurlyBraceMustBeSpaced && !firstSpaced) reportRequiredBeginningSpace(node, openingToken);
				if (!openingCurlyBraceMustBeSpaced && firstSpaced && !((0, import_ast_utils.isCommentToken)(tokenAfterOpening) && !(0, import_ast_utils.isTokenOnSameLine)(openingToken, closingToken))) reportNoBeginningSpace(node, openingToken);
			}
			const tokenBeforeClosing = sourceCode.getTokenBefore(closingToken, { includeComments: true });
			if ((0, import_ast_utils.isTokenOnSameLine)(tokenBeforeClosing, closingToken)) {
				const penultimateType = options.arraysInObjectsException && (0, import_ast_utils.isClosingBracketToken)(tokenBeforeClosing) || options.objectsInObjectsException && (0, import_ast_utils.isClosingBraceToken)(tokenBeforeClosing) ? sourceCode.getNodeByRangeIndex(tokenBeforeClosing.range[0]).type : void 0;
				const closingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [AST_NODE_TYPES.ArrayExpression, AST_NODE_TYPES.TSTupleType].includes(penultimateType) || options.objectsInObjectsException && penultimateType !== void 0 && [
					AST_NODE_TYPES.ObjectExpression,
					AST_NODE_TYPES.ObjectPattern,
					AST_NODE_TYPES.TSMappedType,
					AST_NODE_TYPES.TSTypeLiteral
				].includes(penultimateType) ? !spaced : spaced;
				const lastSpaced = sourceCode.isSpaceBetween(tokenBeforeClosing, closingToken);
				if (closingCurlyBraceMustBeSpaced && !lastSpaced) reportRequiredEndingSpace(node, closingToken);
				if (!closingCurlyBraceMustBeSpaced && lastSpaced) reportNoEndingSpace(node, closingToken);
			}
		}
		function checkSpaceInEmptyObjectLike(node, openingToken, closingToken, nodeType = node.type) {
			if (options.emptyObjects === "ignore" || !(0, import_ast_utils.isTokenOnSameLine)(openingToken, closingToken) || sourceCode.commentsExistBetween(openingToken, closingToken)) return;
			const sourceBetween = sourceCode.getText().slice(openingToken.range[0] + 1, closingToken.range[1] - 1);
			if (sourceBetween.trim() !== "") return;
			if (options.emptyObjects === "always") {
				if (sourceBetween === " ") return;
				context.report({
					node,
					loc: {
						start: openingToken.loc.end,
						end: closingToken.loc.start
					},
					messageId: "requiredSpaceInEmptyObject",
					data: { node: nodeType },
					fix(fixer) {
						return fixer.replaceTextRange([openingToken.range[1], closingToken.range[0]], " ");
					}
				});
			} else if (options.emptyObjects === "never") {
				if (sourceBetween === "") return;
				context.report({
					node,
					loc: {
						start: openingToken.loc.end,
						end: closingToken.loc.start
					},
					messageId: "unexpectedSpaceInEmptyObject",
					data: { node: nodeType },
					fix(fixer) {
						return fixer.removeRange([openingToken.range[1], closingToken.range[0]]);
					}
				});
			}
		}
		function getBraceToken(node, nodeType = node.type) {
			switch (nodeType) {
				case "ImportDeclaration":
				case "ExportNamedDeclaration":
				case "ExportAllDeclaration": {
					const attrTokens = sourceCode.getTokens(node);
					return [attrTokens.find((token) => (0, import_ast_utils.isOpeningBraceToken)(token)), attrTokens.find((token) => (0, import_ast_utils.isClosingBraceToken)(token))];
				}
				case "ImportAttributes": {
					const attrTokens = sourceCode.getTokens(node);
					const openingAttrToken = attrTokens.findLast((token) => (0, import_ast_utils.isOpeningBraceToken)(token));
					const closingAttrToken = attrTokens.findLast((token) => (0, import_ast_utils.isClosingBraceToken)(token));
					if (!openingAttrToken || !closingAttrToken || !node.source || openingAttrToken.range[0] < node.source.range[0]) return [null, null];
					return [openingAttrToken, closingAttrToken];
				}
				case "ObjectPattern":
				case "ObjectExpression":
				case "TSMappedType":
				case "TSTypeLiteral":
				case "TSInterfaceBody":
				case "TSEnumBody": {
					const allTokens = sourceCode.getTokens(node);
					return [allTokens.find((token) => (0, import_ast_utils.isOpeningBraceToken)(token)), node.type === "ObjectPattern" && node.typeAnnotation ? sourceCode.getTokenBefore(node.typeAnnotation) : allTokens.findLast((token) => (0, import_ast_utils.isClosingBraceToken)(token))];
				}
				default: throw new Error(`Unsupported node type: ${nodeType}`);
			}
		}
		function checkForObjectLike(node, properties, nodeType = node.type) {
			const [openingToken, closingToken] = getBraceToken(node, nodeType);
			if (!openingToken || !closingToken) return;
			if (properties.length === 0) {
				checkSpaceInEmptyObjectLike(node, openingToken, closingToken, nodeType);
				return;
			}
			validateBraceSpacing(node, openingToken, closingToken, nodeType);
		}
		return {
			ObjectPattern(node) {
				checkForObjectLike(node, node.properties);
			},
			ObjectExpression(node) {
				checkForObjectLike(node, node.properties);
			},
			ImportDeclaration(node) {
				if (node.attributes) checkForObjectLike(node, node.attributes, "ImportAttributes");
				const firstSpecifierIndex = node.specifiers.findIndex((specifier) => specifier.type === "ImportSpecifier");
				if (firstSpecifierIndex === -1) {
					checkForObjectLike(node, []);
					return;
				}
				checkForObjectLike(node, node.specifiers.slice(firstSpecifierIndex));
			},
			ExportNamedDeclaration(node) {
				checkForObjectLike(node, node.specifiers);
				if (node.attributes) checkForObjectLike(node, node.attributes, "ImportAttributes");
			},
			ExportAllDeclaration(node) {
				if (node.attributes) checkForObjectLike(node, node.attributes, "ImportAttributes");
			},
			TSMappedType(node) {
				validateBraceSpacing(node, sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
			},
			TSTypeLiteral(node) {
				checkForObjectLike(node, node.members);
			},
			TSInterfaceBody(node) {
				checkForObjectLike(node, node.body);
			},
			TSEnumBody(node) {
				checkForObjectLike(node, node.members);
			}
		};
	}
});
export { object_curly_spacing_default as t };
