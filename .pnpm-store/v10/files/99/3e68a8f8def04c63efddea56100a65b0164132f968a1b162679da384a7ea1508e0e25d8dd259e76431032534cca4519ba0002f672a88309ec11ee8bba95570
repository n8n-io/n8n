'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/attributes-order.js
/**
* @fileoverview enforce ordering of attributes
* @author Erin Depew
*/
var require_attributes_order = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef { VDirective & { key: VDirectiveKey & { name: VIdentifier & { name: 'bind' } } } } VBindDirective
	*/
	const ATTRS = {
		DEFINITION: "DEFINITION",
		LIST_RENDERING: "LIST_RENDERING",
		CONDITIONALS: "CONDITIONALS",
		RENDER_MODIFIERS: "RENDER_MODIFIERS",
		GLOBAL: "GLOBAL",
		UNIQUE: "UNIQUE",
		SLOT: "SLOT",
		TWO_WAY_BINDING: "TWO_WAY_BINDING",
		OTHER_DIRECTIVES: "OTHER_DIRECTIVES",
		OTHER_ATTR: "OTHER_ATTR",
		ATTR_STATIC: "ATTR_STATIC",
		ATTR_DYNAMIC: "ATTR_DYNAMIC",
		ATTR_SHORTHAND_BOOL: "ATTR_SHORTHAND_BOOL",
		EVENTS: "EVENTS",
		CONTENT: "CONTENT"
	};
	/**
	* Check whether the given attribute is `v-bind` directive.
	* @param {VAttribute | VDirective | undefined | null} node
	* @returns { node is VBindDirective }
	*/
	function isVBind(node) {
		return Boolean(node && node.directive && node.key.name.name === "bind");
	}
	/**
	* Check whether the given attribute is `v-model` directive.
	* @param {VAttribute | VDirective | undefined | null} node
	* @returns { node is VDirective }
	*/
	function isVModel(node) {
		return Boolean(node && node.directive && node.key.name.name === "model");
	}
	/**
	* Check whether the given attribute is plain attribute.
	* @param {VAttribute | VDirective | undefined | null} node
	* @returns { node is VAttribute }
	*/
	function isVAttribute(node) {
		return Boolean(node && !node.directive);
	}
	/**
	* Check whether the given attribute is plain attribute, `v-bind` directive or `v-model` directive.
	* @param {VAttribute | VDirective | undefined | null} node
	* @returns { node is VAttribute }
	*/
	function isVAttributeOrVBindOrVModel(node) {
		return isVAttribute(node) || isVBind(node) || isVModel(node);
	}
	/**
	* Check whether the given attribute is `v-bind="..."` directive.
	* @param {VAttribute | VDirective | undefined | null} node
	* @returns { node is VBindDirective }
	*/
	function isVBindObject(node) {
		return isVBind(node) && node.key.argument == null;
	}
	/**
	* Check whether the given attribute is a shorthand boolean like `selected`.
	* @param {VAttribute | VDirective | undefined | null} node
	* @returns { node is VAttribute }
	*/
	function isVShorthandBoolean(node) {
		return isVAttribute(node) && !node.value;
	}
	/**
	* @param {VAttribute | VDirective} attribute
	* @param {SourceCode} sourceCode
	*/
	function getAttributeName(attribute, sourceCode) {
		if (attribute.directive) if (isVBind(attribute)) return attribute.key.argument ? sourceCode.getText(attribute.key.argument) : "";
		else return getDirectiveKeyName(attribute.key, sourceCode);
		else return attribute.key.name;
	}
	/**
	* @param {VDirectiveKey} directiveKey
	* @param {SourceCode} sourceCode
	*/
	function getDirectiveKeyName(directiveKey, sourceCode) {
		let text = `v-${directiveKey.name.name}`;
		if (directiveKey.argument) text += `:${sourceCode.getText(directiveKey.argument)}`;
		for (const modifier of directiveKey.modifiers) text += `.${modifier.name}`;
		return text;
	}
	/**
	* @param {VAttribute | VDirective} attribute
	*/
	function getAttributeType(attribute) {
		let propName;
		if (attribute.directive) {
			if (!isVBind(attribute)) switch (attribute.key.name.name) {
				case "for": return ATTRS.LIST_RENDERING;
				case "if":
				case "else-if":
				case "else":
				case "show":
				case "cloak": return ATTRS.CONDITIONALS;
				case "pre":
				case "once": return ATTRS.RENDER_MODIFIERS;
				case "model": return ATTRS.TWO_WAY_BINDING;
				case "on": return ATTRS.EVENTS;
				case "html":
				case "text": return ATTRS.CONTENT;
				case "slot": return ATTRS.SLOT;
				case "is": return ATTRS.DEFINITION;
				default: return ATTRS.OTHER_DIRECTIVES;
			}
			propName = attribute.key.argument && attribute.key.argument.type === "VIdentifier" ? attribute.key.argument.rawName : "";
		} else propName = attribute.key.name;
		switch (propName) {
			case "is": return ATTRS.DEFINITION;
			case "id": return ATTRS.GLOBAL;
			case "ref":
			case "key": return ATTRS.UNIQUE;
			case "slot":
			case "slot-scope": return ATTRS.SLOT;
			default:
				if (isVBind(attribute)) return ATTRS.ATTR_DYNAMIC;
				if (isVShorthandBoolean(attribute)) return ATTRS.ATTR_SHORTHAND_BOOL;
				return ATTRS.ATTR_STATIC;
		}
	}
	/**
	* @param {VAttribute | VDirective} attribute
	* @param { { [key: string]: number } } attributePosition
	* @returns {number | null} If the value is null, the order is omitted. Do not force the order.
	*/
	function getPosition(attribute, attributePosition) {
		const attributeType = getAttributeType(attribute);
		return attributePosition[attributeType] == null ? null : attributePosition[attributeType];
	}
	/**
	* @param {VAttribute | VDirective} prevNode
	* @param {VAttribute | VDirective} currNode
	* @param {SourceCode} sourceCode
	*/
	function isAlphabetical(prevNode, currNode, sourceCode) {
		const prevName = getAttributeName(prevNode, sourceCode);
		const currName = getAttributeName(currNode, sourceCode);
		if (prevName === currName) return isVBind(prevNode) <= isVBind(currNode);
		return prevName < currName;
	}
	/**
	* @param {RuleContext} context - The rule context.
	* @returns {RuleListener} AST event handlers.
	*/
	function create(context) {
		const sourceCode = context.sourceCode;
		const otherAttrs = [
			ATTRS.ATTR_DYNAMIC,
			ATTRS.ATTR_STATIC,
			ATTRS.ATTR_SHORTHAND_BOOL
		];
		let attributeOrder = [
			ATTRS.DEFINITION,
			ATTRS.LIST_RENDERING,
			ATTRS.CONDITIONALS,
			ATTRS.RENDER_MODIFIERS,
			ATTRS.GLOBAL,
			[ATTRS.UNIQUE, ATTRS.SLOT],
			ATTRS.TWO_WAY_BINDING,
			ATTRS.OTHER_DIRECTIVES,
			otherAttrs,
			ATTRS.EVENTS,
			ATTRS.CONTENT
		];
		if (context.options[0] && context.options[0].order) {
			attributeOrder = [...context.options[0].order];
			for (const item of attributeOrder.flat()) if (item === ATTRS.OTHER_ATTR) {
				for (const attribute of attributeOrder.flat()) if (otherAttrs.includes(attribute)) throw new Error(`Value "${ATTRS.OTHER_ATTR}" is not allowed with "${attribute}".`);
			}
			for (const [index, item] of attributeOrder.entries()) if (item === ATTRS.OTHER_ATTR) attributeOrder[index] = otherAttrs;
			else if (Array.isArray(item) && item.includes(ATTRS.OTHER_ATTR)) {
				const attributes = item.filter((i) => i !== ATTRS.OTHER_ATTR);
				attributes.push(...otherAttrs);
				attributeOrder[index] = attributes;
			}
		}
		const alphabetical = Boolean(context.options[0] && context.options[0].alphabetical);
		const sortLineLength = Boolean(context.options[0] && context.options[0].sortLineLength);
		const ignoreVBindObject = Boolean(context.options[0] && context.options[0].ignoreVBindObject);
		/** @type { { [key: string]: number } } */
		const attributePosition = {};
		for (const [i, item] of attributeOrder.entries()) if (Array.isArray(item)) for (const attr of item) attributePosition[attr] = i;
		else attributePosition[item] = i;
		/**
		* @param {VAttribute | VDirective} node
		* @param {VAttribute | VDirective} previousNode
		*/
		function reportIssue(node, previousNode) {
			const currentNode = sourceCode.getText(node.key);
			const prevNode = sourceCode.getText(previousNode.key);
			context.report({
				node,
				messageId: "expectedOrder",
				data: {
					currentNode,
					prevNode
				},
				fix(fixer) {
					const attributes = node.parent.attributes;
					/** @type { (node: VAttribute | VDirective | undefined) => boolean } */
					let isMoveUp;
					if (isVBindObject(node)) isMoveUp = isVAttributeOrVBindOrVModel;
					else if (isVAttributeOrVBindOrVModel(node)) isMoveUp = isVBindObject;
					else isMoveUp = () => false;
					const previousNodes = attributes.slice(attributes.indexOf(previousNode), attributes.indexOf(node));
					const moveNodes = [node];
					for (const node$1 of previousNodes) if (isMoveUp(node$1)) moveNodes.unshift(node$1);
					else moveNodes.push(node$1);
					return moveNodes.map((moveNode, index) => {
						const text = sourceCode.getText(moveNode);
						return fixer.replaceText(previousNodes[index] || node, text);
					});
				}
			});
		}
		return utils.defineTemplateBodyVisitor(context, { VStartTag(node) {
			const attributeAndPositions = getAttributeAndPositionList(node);
			if (attributeAndPositions.length <= 1) return;
			let { attr: previousNode, position: previousPosition } = attributeAndPositions[0];
			for (let index = 1; index < attributeAndPositions.length; index++) {
				const { attr, position } = attributeAndPositions[index];
				let valid = previousPosition <= position;
				if (valid && previousPosition === position) {
					let sortedByLength = false;
					if (sortLineLength) {
						const prevText = sourceCode.getText(previousNode);
						const currText = sourceCode.getText(attr);
						if (prevText.length !== currText.length) {
							valid = prevText.length < currText.length;
							sortedByLength = true;
						}
					}
					if (alphabetical && !sortedByLength) valid = isAlphabetical(previousNode, attr, sourceCode);
				}
				if (valid) {
					previousNode = attr;
					previousPosition = position;
				} else reportIssue(attr, previousNode);
			}
		} });
		/**
		* @param {VStartTag} node
		* @returns { { attr: ( VAttribute | VDirective ), position: number }[] }
		*/
		function getAttributeAndPositionList(node) {
			const attributes = node.attributes.filter((node$1, index, attributes$1) => {
				if (ignoreVBindObject && isVBindObject(node$1)) return false;
				if (isVBindObject(node$1) && (isVAttributeOrVBindOrVModel(attributes$1[index - 1]) || isVAttributeOrVBindOrVModel(attributes$1[index + 1]))) return false;
				return true;
			});
			const results = [];
			for (const [index, attr] of attributes.entries()) {
				const position = getPositionFromAttrIndex(index);
				if (position == null) continue;
				results.push({
					attr,
					position
				});
			}
			return results;
			/**
			* @param {number} index
			* @returns {number | null}
			*/
			function getPositionFromAttrIndex(index) {
				const node$1 = attributes[index];
				if (isVBindObject(node$1)) {
					const len = attributes.length;
					for (let nextIndex = index + 1; nextIndex < len; nextIndex++) {
						const next = attributes[nextIndex];
						if (isVAttributeOrVBindOrVModel(next) && !isVBindObject(next)) return getPositionFromAttrIndex(nextIndex);
					}
				}
				return getPosition(node$1, attributePosition);
			}
		}
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce order of attributes",
				categories: ["vue3-recommended", "vue2-recommended"],
				url: "https://eslint.vuejs.org/rules/attributes-order.html"
			},
			fixable: "code",
			schema: [{
				type: "object",
				properties: {
					order: {
						type: "array",
						items: { oneOf: [{ enum: Object.values(ATTRS) }, {
							type: "array",
							items: {
								enum: Object.values(ATTRS),
								uniqueItems: true,
								additionalItems: false
							}
						}] },
						uniqueItems: true,
						additionalItems: false
					},
					alphabetical: { type: "boolean" },
					sortLineLength: { type: "boolean" },
					ignoreVBindObject: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: { expectedOrder: `Attribute "{{currentNode}}" should go before "{{prevNode}}".` }
		},
		create
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_attributes_order();
  }
});