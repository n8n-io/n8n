'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/order-in-components.js
/**
* @fileoverview Keep order of properties in components
* @author Michał Sajnóg
*/
var require_order_in_components = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const traverseNodes = require("vue-eslint-parser").AST.traverseNodes;
	/**
	* @typedef {import('eslint-visitor-keys').VisitorKeys} VisitorKeys
	*/
	const defaultOrder = [
		"el",
		"name",
		"key",
		"parent",
		"functional",
		["delimiters", "comments"],
		[
			"components",
			"directives",
			"filters"
		],
		"extends",
		"mixins",
		["provide", "inject"],
		"ROUTER_GUARDS",
		"layout",
		"middleware",
		"validate",
		"scrollToTop",
		"transition",
		"loading",
		"inheritAttrs",
		"model",
		["props", "propsData"],
		"emits",
		"slots",
		"expose",
		"setup",
		"asyncData",
		"data",
		"fetch",
		"head",
		"computed",
		"watch",
		"watchQuery",
		"LIFECYCLE_HOOKS",
		"methods",
		["template", "render"],
		"renderError"
	];
	/** @type { { [key: string]: string[] } } */
	const groups = {
		LIFECYCLE_HOOKS: [
			"beforeCreate",
			"created",
			"beforeMount",
			"mounted",
			"beforeUpdate",
			"updated",
			"activated",
			"deactivated",
			"beforeUnmount",
			"unmounted",
			"beforeDestroy",
			"destroyed",
			"renderTracked",
			"renderTriggered",
			"errorCaptured"
		],
		ROUTER_GUARDS: [
			"beforeRouteEnter",
			"beforeRouteUpdate",
			"beforeRouteLeave"
		]
	};
	/**
	* @param {(string | string[])[]} order
	*/
	function getOrderMap(order) {
		/** @type {Map<string, number>} */
		const orderMap = /* @__PURE__ */ new Map();
		for (const [i, property] of order.entries()) if (Array.isArray(property)) for (const p of property) orderMap.set(p, i);
		else orderMap.set(property, i);
		return orderMap;
	}
	/**
	* @param {Token} node
	*/
	function isComma(node) {
		return node.type === "Punctuator" && node.value === ",";
	}
	const ARITHMETIC_OPERATORS = [
		"+",
		"-",
		"*",
		"/",
		"%",
		"**"
	];
	const BITWISE_OPERATORS = [
		"&",
		"|",
		"^",
		"~",
		"<<",
		">>",
		">>>"
	];
	const COMPARISON_OPERATORS = [
		"==",
		"!=",
		"===",
		"!==",
		">",
		">=",
		"<",
		"<="
	];
	const RELATIONAL_OPERATORS = ["in", "instanceof"];
	const ALL_BINARY_OPERATORS = new Set([
		...ARITHMETIC_OPERATORS,
		...BITWISE_OPERATORS,
		...COMPARISON_OPERATORS,
		...RELATIONAL_OPERATORS
	]);
	const LOGICAL_OPERATORS = new Set([
		"&&",
		"||",
		"??"
	]);
	/**
	* Result `true` if the node is sure that there are no side effects
	*
	* Currently known side effects types
	*
	* node.type === 'CallExpression'
	* node.type === 'NewExpression'
	* node.type === 'UpdateExpression'
	* node.type === 'AssignmentExpression'
	* node.type === 'TaggedTemplateExpression'
	* node.type === 'UnaryExpression' && node.operator === 'delete'
	*
	* @param  {ASTNode} node target node
	* @param  {VisitorKeys} visitorKeys sourceCode.visitorKey
	* @returns {boolean} no side effects
	*/
	function isNotSideEffectsNode(node, visitorKeys) {
		let result = true;
		/** @type {ASTNode | null} */
		let skipNode = null;
		traverseNodes(node, {
			visitorKeys,
			enterNode(node$1) {
				if (!result || skipNode) return;
				if (node$1.type === "FunctionExpression" || node$1.type === "Identifier" || node$1.type === "Literal" || node$1.type === "ArrowFunctionExpression" || node$1.type === "TemplateElement" || node$1.type === "TSAsExpression") skipNode = node$1;
				else if (node$1.type !== "Property" && node$1.type !== "ObjectExpression" && node$1.type !== "ArrayExpression" && (node$1.type !== "UnaryExpression" || ![
					"!",
					"~",
					"+",
					"-",
					"typeof"
				].includes(node$1.operator)) && (node$1.type !== "BinaryExpression" || !ALL_BINARY_OPERATORS.has(node$1.operator)) && (node$1.type !== "LogicalExpression" || !LOGICAL_OPERATORS.has(node$1.operator)) && node$1.type !== "MemberExpression" && node$1.type !== "ConditionalExpression" && node$1.type !== "SpreadElement" && node$1.type !== "TemplateLiteral" && node$1.type !== "ChainExpression") result = false;
			},
			leaveNode(node$1) {
				if (skipNode === node$1) skipNode = null;
			}
		});
		return result;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce order of properties in components",
				categories: ["vue3-recommended", "vue2-recommended"],
				url: "https://eslint.vuejs.org/rules/order-in-components.html"
			},
			fixable: "code",
			hasSuggestions: true,
			schema: [{
				type: "object",
				properties: { order: { type: "array" } },
				additionalProperties: false
			}],
			messages: {
				order: "The \"{{name}}\" property should be above the \"{{firstUnorderedPropertyName}}\" property on line {{line}}.",
				reorderWithSideEffects: "Manually move \"{{name}}\" property above \"{{firstUnorderedPropertyName}}\" property on line {{line}} (might break side effects)."
			}
		},
		create(context) {
			const orderMap = getOrderMap(((context.options[0] || {}).order || defaultOrder).map((property) => typeof property === "string" && groups[property] || property));
			const sourceCode = context.sourceCode;
			/**
			* @param {string} name
			*/
			function getOrderPosition(name) {
				const num = orderMap.get(name);
				return num == null ? -1 : num;
			}
			/**
			* @param {RuleFixer} fixer
			* @param {Property} propertyNode
			* @param {Property} unorderedPropertyNode
			*/
			function* handleFix(fixer, propertyNode, unorderedPropertyNode) {
				const afterComma = sourceCode.getTokenAfter(propertyNode);
				const hasAfterComma = isComma(afterComma);
				const beforeComma = sourceCode.getTokenBefore(propertyNode);
				const codeStart = beforeComma.range[1];
				const codeEnd = hasAfterComma ? afterComma.range[1] : propertyNode.range[1];
				const removeStart = hasAfterComma ? codeStart : beforeComma.range[0];
				yield fixer.removeRange([removeStart, codeEnd]);
				const propertyCode = sourceCode.text.slice(codeStart, codeEnd) + (hasAfterComma ? "" : ",");
				const insertTarget = sourceCode.getTokenBefore(unorderedPropertyNode);
				yield fixer.insertTextAfter(insertTarget, propertyCode);
			}
			/**
			* @param {(Property | SpreadElement)[]} propertiesNodes
			*/
			function checkOrder(propertiesNodes) {
				const properties = propertiesNodes.filter(utils.isProperty).map((property) => ({
					node: property,
					name: utils.getStaticPropertyName(property) || property.key.type === "Identifier" && property.key.name || ""
				}));
				for (const [i, property] of properties.entries()) {
					if (getOrderPosition(property.name) < 0) continue;
					const firstUnorderedProperty = properties.slice(0, i).filter((p) => getOrderPosition(p.name) > getOrderPosition(property.name)).sort((p1, p2) => getOrderPosition(p1.name) > getOrderPosition(p2.name) ? 1 : -1)[0];
					if (firstUnorderedProperty) {
						const line = firstUnorderedProperty.node.loc.start.line;
						const propertyNode = property.node;
						const firstUnorderedPropertyNode = firstUnorderedProperty.node;
						const hasSideEffectsPossibility = propertiesNodes.slice(propertiesNodes.indexOf(firstUnorderedPropertyNode), propertiesNodes.indexOf(propertyNode) + 1).some((property$1) => !isNotSideEffectsNode(property$1, sourceCode.visitorKeys));
						context.report({
							node: property.node,
							messageId: "order",
							data: {
								name: property.name,
								firstUnorderedPropertyName: firstUnorderedProperty.name,
								line
							},
							fix: hasSideEffectsPossibility ? void 0 : (fixer) => handleFix(fixer, propertyNode, firstUnorderedPropertyNode),
							suggest: hasSideEffectsPossibility ? [{
								messageId: "reorderWithSideEffects",
								data: {
									name: property.name,
									firstUnorderedPropertyName: firstUnorderedProperty.name,
									line
								},
								fix: (fixer) => handleFix(fixer, propertyNode, firstUnorderedPropertyNode)
							}] : void 0
						});
					}
				}
			}
			return utils.compositingVisitors(utils.executeOnVue(context, (obj) => {
				checkOrder(obj.properties);
			}), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				if (node.arguments.length === 0) return;
				const define = node.arguments[0];
				if (define.type !== "ObjectExpression") return;
				checkOrder(define.properties);
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_order_in_components();
  }
});