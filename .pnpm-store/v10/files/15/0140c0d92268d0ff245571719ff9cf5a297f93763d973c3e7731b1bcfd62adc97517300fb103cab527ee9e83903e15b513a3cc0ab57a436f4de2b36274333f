'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_index = require('../../utils/index.js');
const require_casing$1 = require('../../utils/casing.js');
const require_regexp$1 = require('../../utils/regexp.js');
const require_can_convert_to_v_slot$1 = require('./utils/can-convert-to-v-slot.js');

//#region lib/rules/syntaxes/slot-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_slot_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const canConvertToVSlot = require_can_convert_to_v_slot$1.default;
	const regexp = require_regexp$1.default;
	const casing = require_casing$1.default;
	const { isVElement } = require_index.default;
	module.exports = {
		deprecated: "2.6.0",
		supported: "<3.0.0",
		createTemplateBodyVisitor(context) {
			const { ignore = [], ignoreParents = [] } = context.options[0] || {};
			const isAnyIgnored = regexp.toRegExpGroupMatcher(ignore);
			const isParentIgnored = regexp.toRegExpGroupMatcher(ignoreParents);
			const sourceCode = context.sourceCode;
			const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
			/**
			* Checks whether the given node can convert to the `v-slot`.
			* @param {VAttribute} slotAttr node of `slot`
			* @returns {boolean} `true` if the given node can convert to the `v-slot`
			*/
			function canConvertFromSlotToVSlot(slotAttr) {
				if (!canConvertToVSlot(slotAttr.parent.parent, sourceCode, tokenStore)) return false;
				if (!slotAttr.value) return true;
				const slotName = slotAttr.value.value;
				return !/[^\w\-]/u.test(slotName);
			}
			/**
			* Checks whether the given node can convert to the `v-slot`.
			* @param {VDirective} slotAttr node of `v-bind:slot`
			* @returns {boolean} `true` if the given node can convert to the `v-slot`
			*/
			function canConvertFromVBindSlotToVSlot(slotAttr) {
				if (!canConvertToVSlot(slotAttr.parent.parent, sourceCode, tokenStore)) return false;
				if (!slotAttr.value) return true;
				if (!slotAttr.value.expression) return false;
				return slotAttr.value.expression.type === "Identifier";
			}
			/**
			* Convert to `v-slot`.
			* @param {RuleFixer} fixer fixer
			* @param {VAttribute|VDirective} slotAttr node of `slot`
			* @param {string | null} slotName name of `slot`
			* @param {boolean} vBind `true` if `slotAttr` is `v-bind:slot`
			* @returns {IterableIterator<Fix>} fix data
			*/
			function* fixSlotToVSlot(fixer, slotAttr, slotName, vBind) {
				const startTag = slotAttr.parent;
				const scopeAttr = startTag.attributes.find((attr) => attr.directive === true && attr.key.name && (attr.key.name.name === "slot-scope" || attr.key.name.name === "scope"));
				let nameArgument = "";
				if (slotName) nameArgument = vBind ? `:[${slotName}]` : `:${slotName}`;
				const scopeValue = scopeAttr && scopeAttr.value ? `=${sourceCode.getText(scopeAttr.value)}` : "";
				const replaceText = `v-slot${nameArgument}${scopeValue}`;
				const element = startTag.parent;
				if (element.name === "template") {
					yield fixer.replaceText(slotAttr || scopeAttr, replaceText);
					if (slotAttr && scopeAttr) yield fixer.remove(scopeAttr);
				} else {
					yield fixer.remove(slotAttr || scopeAttr);
					if (slotAttr && scopeAttr) yield fixer.remove(scopeAttr);
					const vFor = startTag.attributes.find((attr) => attr.directive && attr.key.name.name === "for");
					const vForText = vFor ? `${sourceCode.getText(vFor)} ` : "";
					if (vFor) yield fixer.remove(vFor);
					yield fixer.insertTextBefore(element, `<template ${vForText}${replaceText}>\n`);
					yield fixer.insertTextAfter(element, `\n</template>`);
				}
			}
			/**
			* Reports `slot` node
			* @param {VAttribute} slotAttr node of `slot`
			* @returns {void}
			*/
			function reportSlot(slotAttr) {
				const component = slotAttr.parent.parent;
				const componentName = component.rawName;
				if (isAnyIgnored(componentName, casing.pascalCase(componentName), casing.kebabCase(componentName))) return;
				const parent = component.parent;
				const parentName = isVElement(parent) ? parent.rawName : null;
				if (parentName && isParentIgnored(parentName)) return;
				context.report({
					node: slotAttr.key,
					messageId: "forbiddenSlotAttribute",
					*fix(fixer) {
						if (!canConvertFromSlotToVSlot(slotAttr)) return;
						yield* fixSlotToVSlot(fixer, slotAttr, slotAttr.value && slotAttr.value.value, false);
					}
				});
			}
			/**
			* Reports `v-bind:slot` node
			* @param {VDirective} slotAttr node of `v-bind:slot`
			* @returns {void}
			*/
			function reportVBindSlot(slotAttr) {
				context.report({
					node: slotAttr.key,
					messageId: "forbiddenSlotAttribute",
					*fix(fixer) {
						if (!canConvertFromVBindSlotToVSlot(slotAttr)) return;
						yield* fixSlotToVSlot(fixer, slotAttr, slotAttr.value && slotAttr.value.expression && sourceCode.getText(slotAttr.value.expression).trim(), true);
					}
				});
			}
			return {
				"VAttribute[directive=false][key.name='slot']": reportSlot,
				"VAttribute[directive=true][key.name.name='bind'][key.argument.name='slot']": reportVBindSlot
			};
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_slot_attribute();
  }
});