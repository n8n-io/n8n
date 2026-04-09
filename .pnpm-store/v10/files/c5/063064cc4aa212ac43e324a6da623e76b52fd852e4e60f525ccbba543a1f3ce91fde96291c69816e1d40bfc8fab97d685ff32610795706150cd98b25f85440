'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/v-if-else-key.js
/**
* @author Felipe Melendez
* See LICENSE file in root directory for full license.
*/
var require_v_if_else_key = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* A conditional family is made up of a group of repeated components that are conditionally rendered
	* using v-if, v-else-if, and v-else.
	*
	* @typedef {Object} ConditionalFamily
	* @property {VElement} if - The node associated with the 'v-if' directive.
	* @property {VElement[]} elseIf - An array of nodes associated with 'v-else-if' directives.
	* @property {VElement | null} else - The node associated with the 'v-else' directive, or null if there isn't one.
	*/
	/**
	* Checks if a given node has sibling nodes of the same type that are also conditionally rendered.
	* This is used to determine if multiple instances of the same component are being conditionally
	* rendered within the same parent scope.
	*
	* @param {VElement} node - The Vue component node to check for conditional rendering siblings.
	* @param {string} componentName - The name of the component to check for sibling instances.
	* @returns {boolean} True if there are sibling nodes of the same type and conditionally rendered, false otherwise.
	*/
	const hasConditionalRenderedSiblings = (node, componentName) => {
		if (!node.parent || node.parent.type !== "VElement") return false;
		return node.parent.children.some((sibling) => sibling !== node && sibling.type === "VElement" && sibling.rawName === componentName && hasConditionalDirective(sibling));
	};
	/**
	* Checks for the presence of a 'key' attribute in the given node. If the 'key' attribute is missing
	* and the node is part of a conditional family a report is generated.
	* The fix proposed adds a unique key based on the component's name and count,
	* following the format '${kebabCase(componentName)}-${componentCount}', e.g., 'some-component-2'.
	*
	* @param {VElement} node - The Vue component node to check for a 'key' attribute.
	* @param {RuleContext} context - The rule's context object, used for reporting.
	* @param {string} componentName - Name of the component.
	* @param {string} uniqueKey - A unique key for the repeated component, used for the fix.
	* @param {Map<VElement, ConditionalFamily>} conditionalFamilies - Map of conditionally rendered components and their respective conditional directives.
	*/
	const checkForKey = (node, context, componentName, uniqueKey, conditionalFamilies) => {
		if (!node.parent || node.parent.type !== "VElement" || !hasConditionalRenderedSiblings(node, componentName)) return;
		const conditionalFamily = conditionalFamilies.get(node.parent);
		if (!conditionalFamily || utils.hasAttribute(node, "key")) return;
		if (conditionalFamily.if === node || conditionalFamily.else === node || conditionalFamily.elseIf.includes(node)) context.report({
			node: node.startTag,
			loc: node.startTag.loc,
			messageId: "requireKey",
			data: { componentName },
			fix(fixer) {
				const afterComponentNamePosition = node.startTag.range[0] + componentName.length + 1;
				return fixer.insertTextBeforeRange([afterComponentNamePosition, afterComponentNamePosition], ` key="${uniqueKey}"`);
			}
		});
	};
	/**
	* Checks for the presence of conditional directives in the given node.
	*
	* @param {VElement} node - The node to check for conditional directives.
	* @returns {boolean} Returns true if a conditional directive is found in the node or its parents,
	*   false otherwise.
	*/
	const hasConditionalDirective = (node) => utils.hasDirective(node, "if") || utils.hasDirective(node, "else-if") || utils.hasDirective(node, "else");
	/** @type {import('eslint').Rule.RuleModule} */
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require key attribute for conditionally rendered repeated components",
				categories: null,
				url: "https://eslint.vuejs.org/rules/v-if-else-key.html"
			},
			fixable: "code",
			schema: [],
			messages: { requireKey: "Conditionally rendered repeated component '{{componentName}}' expected to have a 'key' attribute." }
		},
		create(context) {
			/**
			* Map to store conditionally rendered components and their respective conditional directives.
			*
			* @type {Map<VElement, ConditionalFamily>}
			*/
			const conditionalFamilies = /* @__PURE__ */ new Map();
			/**
			* Array of Maps to keep track of components and their usage counts along with the first
			* node instance. Each Map represents a different scope level, and maps a component name to
			* an object containing the count and a reference to the first node.
			*/
			/** @type {Map<string, { count: number; firstNode: any }>[]} */
			const componentUsageStack = [/* @__PURE__ */ new Map()];
			/**
			* Checks if a given node represents a custom component without any conditional directives.
			*
			* @param {VElement} node - The AST node to check.
			* @returns {boolean} True if the node represents a custom component without any conditional directives, false otherwise.
			*/
			const isCustomComponentWithoutCondition = (node) => node.type === "VElement" && utils.isCustomComponent(node) && !hasConditionalDirective(node);
			/** Set of built-in Vue components that are exempt from the rule. */
			/** @type {Set<string>} */
			const exemptTags = new Set([
				"component",
				"slot",
				"template"
			]);
			/** Set to keep track of nodes we've pushed to the stack. */
			/** @type {Set<any>} */
			const pushedNodes = /* @__PURE__ */ new Set();
			/**
			* Creates and returns an object representing a conditional family.
			*
			* @param {VElement} ifNode - The VElement associated with the 'v-if' directive.
			* @returns {ConditionalFamily}
			*/
			const createConditionalFamily = (ifNode) => ({
				if: ifNode,
				elseIf: [],
				else: null
			});
			return utils.defineTemplateBodyVisitor(context, {
				VElement(node) {
					if (exemptTags.has(node.rawName)) return;
					const condition = utils.getDirective(node, "if") || utils.getDirective(node, "else-if") || utils.getDirective(node, "else");
					if (condition) {
						const conditionType = condition.key.name.name;
						if (node.parent && node.parent.type === "VElement") {
							let conditionalFamily = conditionalFamilies.get(node.parent);
							if (!conditionalFamily) {
								conditionalFamily = createConditionalFamily(node);
								conditionalFamilies.set(node.parent, conditionalFamily);
							}
							if (conditionalFamily) switch (conditionType) {
								case "if":
									conditionalFamily = createConditionalFamily(node);
									conditionalFamilies.set(node.parent, conditionalFamily);
									break;
								case "else-if":
									conditionalFamily.elseIf.push(node);
									break;
								case "else":
									conditionalFamily.else = node;
									break;
							}
						}
					}
					if (isCustomComponentWithoutCondition(node)) {
						componentUsageStack.push(/* @__PURE__ */ new Map());
						return;
					}
					if (!utils.isCustomComponent(node)) return;
					const componentName = node.rawName;
					const currentScope = componentUsageStack.at(-1);
					const usageInfo = currentScope?.get(componentName) ?? {
						count: 0,
						firstNode: null
					};
					if (hasConditionalDirective(node)) {
						if (usageInfo.count === 0) usageInfo.firstNode = node;
						if (usageInfo.count > 0) {
							checkForKey(node, context, componentName, `${casing.kebabCase(componentName)}-${usageInfo.count + 1}`, conditionalFamilies);
							if (usageInfo.count === 1) {
								const uniqueKeyForFirstInstance = `${casing.kebabCase(componentName)}-1`;
								checkForKey(usageInfo.firstNode, context, componentName, uniqueKeyForFirstInstance, conditionalFamilies);
							}
						}
						usageInfo.count += 1;
						currentScope?.set(componentName, usageInfo);
					}
					componentUsageStack.push(/* @__PURE__ */ new Map());
					pushedNodes.add(node);
				},
				"VElement:exit"(node) {
					if (exemptTags.has(node.rawName)) return;
					if (isCustomComponentWithoutCondition(node)) {
						componentUsageStack.pop();
						return;
					}
					if (!utils.isCustomComponent(node)) return;
					if (pushedNodes.has(node)) {
						componentUsageStack.pop();
						pushedNodes.delete(node);
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
    return require_v_if_else_key();
  }
});