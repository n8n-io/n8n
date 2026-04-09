'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/v-on-handler-style.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_v_on_handler_style = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('eslint').ReportDescriptorFix} ReportDescriptorFix
	* @typedef {'method' | 'inline' | 'inline-function'} HandlerKind
	* @typedef {object} ObjectOption
	* @property {boolean} [ignoreIncludesComment]
	*/
	/**
	* @param {RuleContext} context
	*/
	function parseOptions(context) {
		/** @type {[HandlerKind | HandlerKind[] | undefined, ObjectOption | undefined]} */
		const options = context.options;
		/** @type {HandlerKind[]} */
		const allows = [];
		if (options[0]) if (Array.isArray(options[0])) allows.push(...options[0]);
		else allows.push(options[0]);
		else allows.push("method", "inline-function");
		return {
			allows,
			ignoreIncludesComment: !!(options[1] || {}).ignoreIncludesComment
		};
	}
	/**
	* Check whether the given token is a quote.
	* @param {Token} token The token to check.
	* @returns {boolean} `true` if the token is a quote.
	*/
	function isQuote(token) {
		return token != null && token.type === "Punctuator" && (token.value === "\"" || token.value === "'");
	}
	/**
	* Check whether the given node is an identifier call expression. e.g. `foo()`
	* @param {Expression} node The node to check.
	* @returns {node is CallExpression & {callee: Identifier}}
	*/
	function isIdentifierCallExpression(node) {
		if (node.type !== "CallExpression") return false;
		if (node.optional) return false;
		return node.callee.type === "Identifier";
	}
	/**
	* Returns a call expression node if the given VOnExpression or BlockStatement consists
	* of only a single identifier call expression.
	* e.g.
	*   @click="foo()"
	*   @click="{ foo() }"
	*   @click="foo();;"
	* @param {VOnExpression | BlockStatement} node
	* @returns {CallExpression & {callee: Identifier} | null}
	*/
	function getIdentifierCallExpression(node) {
		/** @type {ExpressionStatement} */
		let exprStatement;
		let body = node.body;
		while (true) {
			const statements = body.filter((st) => st.type !== "EmptyStatement");
			if (statements.length !== 1) return null;
			const statement = statements[0];
			if (statement.type === "ExpressionStatement") {
				exprStatement = statement;
				break;
			}
			if (statement.type === "BlockStatement") {
				body = statement.body;
				continue;
			}
			return null;
		}
		const expression = exprStatement.expression;
		if (!isIdentifierCallExpression(expression)) return null;
		return expression;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce writing style for handlers in `v-on` directives",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/v-on-handler-style.html"
			},
			fixable: "code",
			schema: [{ oneOf: [{ enum: ["inline", "inline-function"] }, {
				type: "array",
				items: [{ const: "method" }, { enum: ["inline", "inline-function"] }],
				uniqueItems: true,
				additionalItems: false,
				minItems: 2,
				maxItems: 2
			}] }, {
				type: "object",
				properties: { ignoreIncludesComment: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				preferMethodOverInline: "Prefer method handler over inline handler in v-on.",
				preferMethodOverInlineWithoutIdCall: "Prefer method handler over inline handler in v-on. Note that you may need to create a new method.",
				preferMethodOverInlineFunction: "Prefer method handler over inline function in v-on.",
				preferMethodOverInlineFunctionWithoutIdCall: "Prefer method handler over inline function in v-on. Note that you may need to create a new method.",
				preferInlineOverMethod: "Prefer inline handler over method handler in v-on.",
				preferInlineOverInlineFunction: "Prefer inline handler over inline function in v-on.",
				preferInlineOverInlineFunctionWithMultipleParams: "Prefer inline handler over inline function in v-on. Note that the custom event must be changed to a single payload.",
				preferInlineFunctionOverMethod: "Prefer inline function over method handler in v-on.",
				preferInlineFunctionOverInline: "Prefer inline function over inline handler in v-on."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const { allows, ignoreIncludesComment } = parseOptions(context);
			/** @type {Set<VElement>} */
			const upperElements = /* @__PURE__ */ new Set();
			/** @type {Map<string, number>} */
			const methodParamCountMap = /* @__PURE__ */ new Map();
			/** @type {Identifier[]} */
			const $eventIdentifiers = [];
			/**
			* Verify for inline handler.
			* @param {VOnExpression} node
			* @param {HandlerKind} kind
			* @returns {boolean} Returns `true` if reported.
			*/
			function verifyForInlineHandler(node, kind) {
				switch (kind) {
					case "method": return verifyCanUseMethodHandlerForInlineHandler(node);
					case "inline-function":
						reportCanUseInlineFunctionForInlineHandler(node);
						return true;
				}
				return false;
			}
			/**
			* Report for method handler.
			* @param {Identifier} node
			* @param {HandlerKind} kind
			* @returns {boolean} Returns `true` if reported.
			*/
			function reportForMethodHandler(node, kind) {
				switch (kind) {
					case "inline":
					case "inline-function":
						context.report({
							node,
							messageId: kind === "inline" ? "preferInlineOverMethod" : "preferInlineFunctionOverMethod"
						});
						return true;
				}
				return false;
			}
			/**
			* Verify for inline function handler.
			* @param {ArrowFunctionExpression | FunctionExpression} node
			* @param {HandlerKind} kind
			* @returns {boolean} Returns `true` if reported.
			*/
			function verifyForInlineFunction(node, kind) {
				switch (kind) {
					case "method": return verifyCanUseMethodHandlerForInlineFunction(node);
					case "inline":
						reportCanUseInlineHandlerForInlineFunction(node);
						return true;
				}
				return false;
			}
			/**
			* Get token information for the given VExpressionContainer node.
			* @param {VExpressionContainer} node
			*/
			function getVExpressionContainerTokenInfo(node) {
				const tokens = sourceCode.parserServices.getTemplateBodyTokenStore().getTokens(node, { includeComments: true });
				const firstToken = tokens[0];
				const lastToken = tokens.at(-1);
				if (!lastToken) return {
					rangeWithoutQuotes: [0, 0],
					hasComment: false,
					hasQuote: false
				};
				const hasQuote = isQuote(firstToken);
				return {
					rangeWithoutQuotes: hasQuote ? [firstToken.range[1], lastToken.range[0]] : [firstToken.range[0], lastToken.range[1]],
					get hasComment() {
						return tokens.some((token) => token.type === "Block" || token.type === "Line");
					},
					hasQuote
				};
			}
			/**
			* Checks whether the given node refers to a variable of the element.
			* @param {Expression | VOnExpression} node
			*/
			function hasReferenceUpperElementVariable(node) {
				for (const element of upperElements) for (const vv of element.variables) for (const reference of vv.references) {
					const { range } = reference.id;
					if (node.range[0] <= range[0] && range[1] <= node.range[1]) return true;
				}
				return false;
			}
			/**
			* Check if `v-on:click="foo()"` can be converted to `v-on:click="foo"` and report if it can.
			* @param {VOnExpression} node
			* @returns {boolean} Returns `true` if reported.
			*/
			function verifyCanUseMethodHandlerForInlineHandler(node) {
				const { rangeWithoutQuotes, hasComment } = getVExpressionContainerTokenInfo(node.parent);
				if (ignoreIncludesComment && hasComment) return false;
				const idCallExpr = getIdentifierCallExpression(node);
				if ((!idCallExpr || idCallExpr.arguments.length > 0) && hasReferenceUpperElementVariable(node)) return false;
				context.report({
					node,
					messageId: idCallExpr ? "preferMethodOverInline" : "preferMethodOverInlineWithoutIdCall",
					fix: (fixer) => {
						if (hasComment || !idCallExpr || idCallExpr.arguments.length > 0) return null;
						const paramCount = methodParamCountMap.get(idCallExpr.callee.name);
						if (paramCount != null && paramCount > 0) return null;
						return fixer.replaceTextRange(rangeWithoutQuotes, sourceCode.getText(idCallExpr.callee));
					}
				});
				return true;
			}
			/**
			* Check if `v-on:click="() => foo()"` can be converted to `v-on:click="foo"` and report if it can.
			* @param {ArrowFunctionExpression | FunctionExpression} node
			* @returns {boolean} Returns `true` if reported.
			*/
			function verifyCanUseMethodHandlerForInlineFunction(node) {
				const { rangeWithoutQuotes, hasComment } = getVExpressionContainerTokenInfo(node.parent);
				if (ignoreIncludesComment && hasComment) return false;
				/** @type {CallExpression & {callee: Identifier} | null} */
				let idCallExpr = null;
				if (node.body.type === "BlockStatement") idCallExpr = getIdentifierCallExpression(node.body);
				else if (isIdentifierCallExpression(node.body)) idCallExpr = node.body;
				if ((!idCallExpr || !isSameParamsAndArgs(idCallExpr)) && hasReferenceUpperElementVariable(node)) return false;
				context.report({
					node,
					messageId: idCallExpr ? "preferMethodOverInlineFunction" : "preferMethodOverInlineFunctionWithoutIdCall",
					fix: (fixer) => {
						if (hasComment || !idCallExpr) return null;
						if (!isSameParamsAndArgs(idCallExpr)) return null;
						const paramCount = methodParamCountMap.get(idCallExpr.callee.name);
						if (paramCount != null && paramCount !== idCallExpr.arguments.length) return null;
						return fixer.replaceTextRange(rangeWithoutQuotes, sourceCode.getText(idCallExpr.callee));
					}
				});
				return true;
				/**
				* Checks whether parameters are passed as arguments as-is.
				* @param {CallExpression} expression
				*/
				function isSameParamsAndArgs(expression) {
					return node.params.length === expression.arguments.length && node.params.every((param, index) => {
						if (param.type !== "Identifier") return false;
						const arg = expression.arguments[index];
						if (!arg || arg.type !== "Identifier") return false;
						return param.name === arg.name;
					});
				}
			}
			/**
			* Report `v-on:click="foo()"` can be converted to `v-on:click="()=>foo()"`.
			* @param {VOnExpression} node
			* @returns {void}
			*/
			function reportCanUseInlineFunctionForInlineHandler(node) {
				context.report({
					node,
					messageId: "preferInlineFunctionOverInline",
					*fix(fixer) {
						if ($eventIdentifiers.some(({ range }) => node.range[0] <= range[0] && range[1] <= node.range[1])) return;
						const { rangeWithoutQuotes, hasQuote } = getVExpressionContainerTokenInfo(node.parent);
						if (!hasQuote) return;
						yield fixer.insertTextBeforeRange(rangeWithoutQuotes, "() => ");
						const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore();
						const firstToken = tokenStore.getFirstToken(node);
						const lastToken = tokenStore.getLastToken(node);
						if (firstToken.value === "{" && lastToken.value === "}") return;
						if (lastToken.value !== ";" && node.body.length === 1 && node.body[0].type === "ExpressionStatement") return;
						yield fixer.insertTextBefore(firstToken, "{");
						yield fixer.insertTextAfter(lastToken, "}");
					}
				});
			}
			/**
			* Report `v-on:click="() => foo()"` can be converted to `v-on:click="foo()"`.
			* @param {ArrowFunctionExpression | FunctionExpression} node
			* @returns {void}
			*/
			function reportCanUseInlineHandlerForInlineFunction(node) {
				context.report({
					node,
					messageId: node.params.length > 1 ? "preferInlineOverInlineFunctionWithMultipleParams" : "preferInlineOverInlineFunction",
					fix: node.params.length > 0 ? null : (fixer) => {
						let text = sourceCode.getText(node.body);
						if (node.body.type === "BlockStatement") text = text.slice(1, -1);
						return fixer.replaceText(node, text);
					}
				});
			}
			return utils.defineTemplateBodyVisitor(context, {
				VElement(node) {
					upperElements.add(node);
				},
				"VElement:exit"(node) {
					upperElements.delete(node);
				},
				"VAttribute[directive=true][key.name.name='on'][key.argument!=null] > VExpressionContainer.value:exit"(node) {
					const expression = node.expression;
					if (!expression) return;
					switch (expression.type) {
						case "VOnExpression":
							if (allows[0] === "inline") return;
							for (const allow of allows) if (verifyForInlineHandler(expression, allow)) return;
							break;
						case "Identifier":
							if (allows[0] === "method") return;
							for (const allow of allows) if (reportForMethodHandler(expression, allow)) return;
							break;
						case "ArrowFunctionExpression":
						case "FunctionExpression":
							if (allows[0] === "inline-function") return;
							for (const allow of allows) if (verifyForInlineFunction(expression, allow)) return;
							break;
						default: return;
					}
				},
				...allows.includes("inline-function") ? { "Identifier[name=\"$event\"]"(node) {
					$eventIdentifiers.push(node);
				} } : {}
			}, allows.includes("method") ? utils.defineVueVisitor(context, { onVueObjectEnter(node) {
				for (const method of utils.iterateProperties(node, new Set(["methods"]))) {
					if (method.type !== "object") continue;
					const value = method.property.value;
					if (value.type === "FunctionExpression" || value.type === "ArrowFunctionExpression") methodParamCountMap.set(method.name, value.params.some((p) => p.type === "RestElement") ? Number.POSITIVE_INFINITY : value.params.length);
				}
			} }) : {});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_on_handler_style();
  }
});