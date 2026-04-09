'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-duplicate-class-names.js
/**
* @fileoverview disallow duplication of class names in class attributes
* @author Yizack Rangel
* See LICENSE file in root directory for full license.
*/
var require_no_duplicate_class_names = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @param {VDirective} node
	* @param {Expression} [expression]
	* @param {boolean} [unconditional=true] whether the expression is unconditional
	* @param {Expression} [parentExpr] parent expression for context
	* @return {IterableIterator<{ node: Literal | TemplateElement, unconditional: boolean, parentExpr?: Expression }>}
	*/
	function* extractClassNodes(node, expression, unconditional = true, parentExpr) {
		const nodeExpression = expression ?? node.value?.expression;
		if (!nodeExpression) return;
		switch (nodeExpression.type) {
			case "Literal":
				yield {
					node: nodeExpression,
					unconditional,
					parentExpr
				};
				break;
			case "ObjectExpression":
				for (const prop of nodeExpression.properties) if (prop.type === "Property" && prop.key?.type === "Literal" && typeof prop.key.value === "string") yield {
					node: prop.key,
					unconditional: false,
					parentExpr: nodeExpression
				};
				break;
			case "ArrayExpression":
				for (const element of nodeExpression.elements) {
					if (!element || element.type === "SpreadElement") continue;
					yield* extractClassNodes(node, element, unconditional, nodeExpression);
				}
				break;
			case "ConditionalExpression":
				yield* extractClassNodes(node, nodeExpression.consequent, false, nodeExpression);
				yield* extractClassNodes(node, nodeExpression.alternate, false, nodeExpression);
				break;
			case "TemplateLiteral":
				for (const quasi of nodeExpression.quasis) yield {
					node: quasi,
					unconditional,
					parentExpr: nodeExpression
				};
				for (const expr of nodeExpression.expressions) yield* extractClassNodes(node, expr, unconditional, nodeExpression);
				break;
			case "BinaryExpression":
				if (nodeExpression.operator === "+") {
					yield* extractClassNodes(node, nodeExpression.left, unconditional, nodeExpression);
					yield* extractClassNodes(node, nodeExpression.right, unconditional, nodeExpression);
				}
				break;
			case "LogicalExpression":
				yield* extractClassNodes(node, nodeExpression.left, unconditional, nodeExpression);
				yield* extractClassNodes(node, nodeExpression.right, false, nodeExpression);
				break;
		}
	}
	/**
	* @param {string} classList
	* @returns {string[]}
	*/
	function getClassNames(classList) {
		return classList.split(/\s+/).filter(Boolean);
	}
	/**
	* @param {string} raw - raw class names string including quotes
	* @returns {string}
	*/
	function removeDuplicateClassNames(raw) {
		const quote = raw[0];
		const inner = raw.slice(1, -1);
		const tokens = inner.split(/(\s+)/);
		/** @type {string[]} */
		const kept = [];
		const used = /* @__PURE__ */ new Set();
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (!token) continue;
			if (/^\s+$/.test(token)) if (kept.length > 0) kept[kept.length - 1] += token;
			else kept.push(token);
			else if (used.has(token)) {
				const nextToken = tokens[i + 1];
				if (kept.length > 0 && i + 1 < tokens.length && /^\s+$/.test(nextToken)) {
					for (let j = kept.length - 1; j >= 0; j--) if (!/^\s+$/.test(kept[j])) {
						kept[j] = kept[j].split(/(\s+)/)[0] + nextToken;
						break;
					}
					i++;
				}
			} else {
				kept.push(token);
				used.add(token);
			}
		}
		const endsWithSpace = /\s$/.test(inner);
		const lastItem = kept.at(-1);
		if (lastItem && !endsWithSpace) {
			if (!/^\s+$/.test(lastItem)) {
				const parts = lastItem.split(/(\s+)/);
				kept[kept.length - 1] = parts[0];
			}
		}
		return quote + kept.join("") + quote;
	}
	/** @param {VLiteral | Literal | TemplateElement | null} node */
	function getRawValue(node) {
		if (!node?.value) return null;
		return typeof node.value === "object" && "raw" in node.value ? node.value.raw : node.value;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				url: "https://eslint.vuejs.org/rules/no-duplicate-class-names.html",
				description: "disallow duplication of class names in class attributes",
				categories: void 0
			},
			fixable: "code",
			schema: [],
			messages: { duplicateClassNames: "Duplicate class name{{plural}} {{names}}." }
		},
		create: (context) => {
			/**
			* @param {VLiteral | Literal | TemplateElement | null} node
			*/
			function reportDuplicateClasses(node) {
				if (!node?.value) return;
				const classList = getRawValue(node);
				if (typeof classList !== "string") return;
				const classNames = getClassNames(classList);
				if (classNames.length <= 1) return;
				const seen = /* @__PURE__ */ new Set();
				const duplicates = /* @__PURE__ */ new Set();
				for (const className of classNames) if (seen.has(className)) duplicates.add(className);
				else seen.add(className);
				if (duplicates.size === 0) return;
				context.report({
					node,
					messageId: "duplicateClassNames",
					data: {
						names: [...duplicates].map((name) => `'${name}'`).join(", "),
						plural: duplicates.size > 1 ? "s" : ""
					},
					fix: (fixer) => {
						const raw = context.sourceCode.text.slice(node.range[0], node.range[1]);
						return fixer.replaceText(node, removeDuplicateClassNames(raw));
					}
				});
				return duplicates;
			}
			return utils.defineTemplateBodyVisitor(context, {
				"VAttribute[directive=false][key.name='class'][value.type='VLiteral']"(node) {
					reportDuplicateClasses(node.value);
				},
				"VAttribute[directive=true][key.argument.name='class'][value.type='VExpressionContainer']"(node) {
					const parent = node.parent;
					const staticAttr = (parent.attributes || []).find((attr) => attr.key && attr.key.name === "class" && attr.value && attr.value.type === "VLiteral");
					/** @type {Set<string> | null} */
					let staticClasses = null;
					if (staticAttr && staticAttr.value && staticAttr.value.type === "VLiteral") staticClasses = new Set(getClassNames(String(staticAttr.value.value)));
					/** @type {Set<string>} */
					const reported = /* @__PURE__ */ new Set();
					/** @type {Set<string>} */
					const duplicatesInExpression = /* @__PURE__ */ new Set();
					/** @type {Map<string, ASTNode>} */
					const seen = /* @__PURE__ */ new Map();
					/** @type {Map<string, {node: ASTNode, unconditional: boolean, parentExpr?: Expression}>} */
					const collected = /* @__PURE__ */ new Map();
					const classNodes = extractClassNodes(node);
					for (const { node: reportNode, unconditional, parentExpr } of classNodes) {
						const reportedClasses = reportDuplicateClasses(reportNode);
						if (reportedClasses) for (const reportedClass of reportedClasses) reported.add(reportedClass);
						const classList = getRawValue(reportNode);
						if (typeof classList !== "string") continue;
						const classNames = getClassNames(classList);
						for (const className of classNames) {
							if (reported.has(className)) continue;
							const existing = collected.get(className);
							if (existing) {
								const isSameParent = parentExpr && existing.parentExpr === parentExpr && (parentExpr.type === "BinaryExpression" || parentExpr.type === "TemplateLiteral");
								if (existing.unconditional || unconditional || isSameParent) duplicatesInExpression.add(className);
							} else collected.set(className, {
								node: reportNode.parent,
								unconditional,
								parentExpr
							});
							if (unconditional) if (seen.has(className)) duplicatesInExpression.add(className);
							else seen.set(className, reportNode.parent);
						}
						if (staticClasses) {
							const intersection = classNames.filter((n) => staticClasses.has(n));
							if (intersection.length > 0 && parent) context.report({
								node: parent,
								messageId: "duplicateClassNames",
								data: {
									names: intersection.map((name) => `'${name}'`).join(", "),
									plural: intersection.length > 1 ? "s" : ""
								}
							});
						}
					}
					for (const className of duplicatesInExpression) {
						const reportNode = seen.get(className) || collected.get(className)?.node;
						if (reportNode) context.report({
							node: reportNode,
							messageId: "duplicateClassNames",
							data: {
								names: `'${className}'`,
								plural: ""
							}
						});
					}
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_duplicate_class_names();
  }
});