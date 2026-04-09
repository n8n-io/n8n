import { K as isSingleLine, d as safeReplaceTextBetween, f as createRule, g as import_ast_utils, m as AST_NODE_TYPES } from "../utils.js";
var list_style_default = createRule({
	name: "list-style",
	meta: {
		type: "layout",
		docs: {
			description: "Enforce consistent spacing and line break styles inside brackets.",
			experimental: true
		},
		fixable: "whitespace",
		schema: [{
			$defs: {
				singleLineConfig: {
					type: "object",
					additionalProperties: false,
					properties: {
						spacing: {
							type: "string",
							enum: ["always", "never"]
						},
						maxItems: {
							type: "integer",
							minimum: 0
						}
					}
				},
				multiLineConfig: {
					type: "object",
					additionalProperties: false,
					properties: { minItems: {
						type: "integer",
						minimum: 0
					} }
				},
				baseConfig: {
					type: "object",
					additionalProperties: false,
					properties: {
						singleLine: { $ref: "#/items/0/$defs/singleLineConfig" },
						multiline: { $ref: "#/items/0/$defs/multiLineConfig" }
					}
				},
				overrideConfig: { oneOf: [{ $ref: "#/items/0/$defs/baseConfig" }, {
					type: "string",
					enum: ["off"]
				}] }
			},
			type: "object",
			additionalProperties: false,
			properties: {
				singleLine: { $ref: "#/items/0/$defs/singleLineConfig" },
				multiLine: { $ref: "#/items/0/$defs/multiLineConfig" },
				overrides: {
					type: "object",
					additionalProperties: false,
					properties: {
						"()": { $ref: "#/items/0/$defs/overrideConfig" },
						"[]": { $ref: "#/items/0/$defs/overrideConfig" },
						"{}": { $ref: "#/items/0/$defs/overrideConfig" },
						"<>": { $ref: "#/items/0/$defs/overrideConfig" },
						"ArrayExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"ArrayPattern": { $ref: "#/items/0/$defs/overrideConfig" },
						"ArrowFunctionExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"CallExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"ExportNamedDeclaration": { $ref: "#/items/0/$defs/overrideConfig" },
						"FunctionDeclaration": { $ref: "#/items/0/$defs/overrideConfig" },
						"FunctionExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"IfStatement": { $ref: "#/items/0/$defs/overrideConfig" },
						"ImportAttributes": { $ref: "#/items/0/$defs/overrideConfig" },
						"ImportDeclaration": { $ref: "#/items/0/$defs/overrideConfig" },
						"JSONArrayExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"JSONObjectExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"NewExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"ObjectExpression": { $ref: "#/items/0/$defs/overrideConfig" },
						"ObjectPattern": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSDeclareFunction": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSEnumBody": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSFunctionType": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSInterfaceBody": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSTupleType": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSTypeLiteral": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSTypeParameterDeclaration": { $ref: "#/items/0/$defs/overrideConfig" },
						"TSTypeParameterInstantiation": { $ref: "#/items/0/$defs/overrideConfig" }
					}
				}
			}
		}],
		defaultOptions: [{
			singleLine: {
				spacing: "never",
				maxItems: Number.POSITIVE_INFINITY
			},
			multiLine: { minItems: 0 },
			overrides: { "{}": { singleLine: { spacing: "always" } } }
		}],
		messages: {
			shouldSpacing: `Should have space between '{{prev}}' and '{{next}}'`,
			shouldNotSpacing: `Should not have space(s) between '{{prev}}' and '{{next}}'`,
			shouldWrap: `Should have line break between '{{prev}}' and '{{next}}'`,
			shouldNotWrap: `Should not have line break(s) between '{{prev}}' and '{{next}}'`
		}
	},
	create: (context, [options]) => {
		const { sourceCode } = context;
		const { singleLine, multiLine, overrides } = options;
		const _resolvedOptions = /* @__PURE__ */ new Map();
		function resolveOption(parenType, nodeType) {
			if (_resolvedOptions.has(nodeType)) return _resolvedOptions.get(nodeType);
			let overridesByParen = overrides?.[parenType];
			let overridesByNode = overrides?.[nodeType];
			let resolved;
			if (overridesByNode === "off" || overridesByNode === void 0 && overridesByParen === "off") resolved = "off";
			else {
				overridesByParen = typeof overridesByParen === "object" ? overridesByParen : {};
				overridesByNode ??= {};
				resolved = {
					singleLine: {
						...singleLine,
						...overridesByParen.singleLine,
						...overridesByNode.singleLine
					},
					multiline: {
						...multiLine,
						...overridesByParen.multiline,
						...overridesByNode.multiline
					}
				};
			}
			_resolvedOptions.set(nodeType, resolved);
			return resolved;
		}
		function getDelimiter(root, current) {
			if (root.type !== "TSInterfaceBody" && root.type !== "TSTypeLiteral") return;
			return current.value.match(/(?:,|;)$/) ? void 0 : ",";
		}
		function checkSpacing(node, left, right, config) {
			const shouldSpace = config.singleLine.spacing === "always";
			const firstToken = sourceCode.getTokenAfter(left, { includeComments: true });
			const lastToken = sourceCode.getTokenBefore(right, { includeComments: true });
			function doCheck(prev, next) {
				const spaced = sourceCode.isSpaceBetween(prev, next);
				if (!spaced && shouldSpace) context.report({
					node,
					messageId: "shouldSpacing",
					loc: {
						start: prev.loc.end,
						end: next.loc.start
					},
					data: {
						prev: prev.value,
						next: next.value
					},
					fix(fixer) {
						return fixer.insertTextAfter(prev, " ");
					}
				});
				else if (spaced && !shouldSpace) context.report({
					node,
					messageId: "shouldNotSpacing",
					loc: {
						start: prev.loc.end,
						end: next.loc.start
					},
					data: {
						prev: prev.value,
						next: next.value
					},
					fix(fixer) {
						return fixer.removeRange([prev.range[1], next.range[0]]);
					}
				});
			}
			doCheck(left, firstToken);
			doCheck(lastToken, right);
		}
		function checkWrap(node, items, left, right, config) {
			const len = items.length;
			const needWrap = isSingleLine(node) ? len > config.singleLine.maxItems : len >= config.multiline.minItems && !(0, import_ast_utils.isTokenOnSameLine)(left, items[0] ?? sourceCode.getTokenAfter(left));
			function doCheck(prev, next) {
				if ((0, import_ast_utils.isTokenOnSameLine)(prev, next)) {
					if (!needWrap) return;
					context.report({
						node,
						messageId: "shouldWrap",
						loc: {
							start: prev.loc.end,
							end: next.loc.start
						},
						data: {
							prev: prev.value,
							next: next.value
						},
						fix(fixer) {
							if (sourceCode.commentsExistBetween(prev, next)) return null;
							return fixer.insertTextBefore(next, "\n");
						}
					});
				} else {
					if (needWrap) return;
					context.report({
						node,
						messageId: "shouldNotWrap",
						loc: {
							start: prev.loc.end,
							end: next.loc.start
						},
						data: {
							prev: prev.value,
							next: next.value
						},
						fix: safeReplaceTextBetween(sourceCode, prev, next, () => items.length === 1 ? "" : getDelimiter(node, prev) ?? "")
					});
				}
			}
			const tokenAfterLeft = sourceCode.getTokenAfter(left, { includeComments: false });
			doCheck(left, tokenAfterLeft);
			for (let i = 0; i < len; i++) {
				const currentItem = items[i];
				if (!currentItem) continue;
				const currentFirstToken = sourceCode.getFirstToken(currentItem);
				if (i === 0 && tokenAfterLeft === currentFirstToken) continue;
				doCheck(sourceCode.getTokenBefore(currentItem, {
					filter: (token) => (0, import_ast_utils.isNotOpeningParenToken)(token) || token === left,
					includeComments: false
				}), currentFirstToken);
			}
			doCheck(sourceCode.getTokenBefore(right, { includeComments: false }), right);
		}
		const parenMatchers = {
			"[]": {
				left: import_ast_utils.isOpeningBracketToken,
				right: import_ast_utils.isClosingBracketToken
			},
			"{}": {
				left: import_ast_utils.isOpeningBraceToken,
				right: import_ast_utils.isClosingBraceToken
			},
			"()": {
				left: import_ast_utils.isOpeningParenToken,
				right: import_ast_utils.isClosingParenToken
			},
			"<>": {
				left: (token) => token.value === "<",
				right: (token) => token.value === ">"
			}
		};
		function getLeftParen(node, items, type) {
			switch (node.type) {
				case AST_NODE_TYPES.CallExpression:
				case AST_NODE_TYPES.NewExpression: return sourceCode.getTokenAfter(node.typeArguments ?? node.callee, import_ast_utils.isOpeningParenToken);
				case AST_NODE_TYPES.ArrayExpression:
				case AST_NODE_TYPES.ArrayPattern: return sourceCode.getFirstToken(node);
				default: {
					const maybeLeft = sourceCode.getTokenBefore(items[0]);
					const { left: matcher } = parenMatchers[type];
					return maybeLeft && matcher(maybeLeft) ? maybeLeft : null;
				}
			}
		}
		function getRightParen(node, items, type) {
			switch (node.type) {
				case AST_NODE_TYPES.ArrayExpression:
				case AST_NODE_TYPES.ArrayPattern: return sourceCode.getLastToken(node);
				default: {
					const maybeRight = sourceCode.getTokenAfter(items.at(-1), import_ast_utils.isNotCommaToken);
					const { right: matcher } = parenMatchers[type];
					return maybeRight && matcher(maybeRight) ? maybeRight : null;
				}
			}
		}
		function check(parenType, node, items) {
			if (items.length === 0) return;
			const left = getLeftParen(node, items, parenType);
			const right = getRightParen(node, items, parenType);
			if (!left || !right) return;
			const config = resolveOption(parenType, items[0]?.type === "ImportAttribute" ? "ImportAttributes" : node.type);
			if (config === "off") return;
			if ((0, import_ast_utils.isTokenOnSameLine)(left, right) && items.length <= config.singleLine.maxItems) checkSpacing(node, left, right, config);
			else checkWrap(node, items, left, right, config);
		}
		return {
			ArrayExpression(node) {
				check("[]", node, node.elements);
			},
			ArrayPattern(node) {
				check("[]", node, node.elements);
			},
			ArrowFunctionExpression(node) {
				check("()", node, node.params);
			},
			CallExpression(node) {
				check("()", node, node.arguments);
			},
			ExportAllDeclaration(node) {
				if (node.attributes) check("{}", node, node.attributes);
			},
			ExportNamedDeclaration(node) {
				check("{}", node, node.specifiers);
				if (node.attributes) check("{}", node, node.attributes);
			},
			FunctionDeclaration(node) {
				check("()", node, node.params);
			},
			FunctionExpression(node) {
				check("()", node, node.params);
			},
			IfStatement: (node) => {
				check("()", node, [node.test]);
			},
			ImportDeclaration(node) {
				check("{}", node, node.specifiers.filter((specifier) => specifier.type === "ImportSpecifier"));
				if (node.attributes) check("{}", node, node.attributes);
			},
			JSONArrayExpression(node) {
				check("[]", node, node.elements);
			},
			JSONObjectExpression(node) {
				check("{}", node, node.properties);
			},
			NewExpression(node) {
				check("()", node, node.arguments);
			},
			ObjectExpression(node) {
				check("{}", node, node.properties);
			},
			ObjectPattern(node) {
				check("{}", node, node.properties);
			},
			TSDeclareFunction(node) {
				check("()", node, node.params);
			},
			TSEnumBody(node) {
				check("{}", node, node.members);
			},
			TSFunctionType(node) {
				check("()", node, node.params);
			},
			TSInterfaceBody(node) {
				check("{}", node, node.body);
			},
			TSTupleType(node) {
				check("[]", node, node.elementTypes);
			},
			TSTypeLiteral(node) {
				check("{}", node, node.members);
			},
			TSTypeParameterDeclaration(node) {
				check("<>", node, node.params);
			},
			TSTypeParameterInstantiation(node) {
				check("<>", node, node.params);
			}
		};
	}
});
export { list_style_default as t };
