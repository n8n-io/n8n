'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_can_convert_to_v_slot$1 = require('./utils/can-convert-to-v-slot.js');

//#region lib/rules/syntaxes/slot-scope-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_slot_scope_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const canConvertToVSlotForElement = require_can_convert_to_v_slot$1.default;
	module.exports = {
		deprecated: "2.6.0",
		supported: ">=2.5.0 <3.0.0",
		createTemplateBodyVisitor(context, { fixToUpgrade } = {}) {
			const sourceCode = context.sourceCode;
			const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
			/**
			* Checks whether the given node can convert to the `v-slot`.
			* @param {VStartTag} startTag node of `<element v-slot ... >`
			* @returns {boolean} `true` if the given node can convert to the `v-slot`
			*/
			function canConvertToVSlot(startTag) {
				if (!canConvertToVSlotForElement(startTag.parent, sourceCode, tokenStore)) return false;
				if (startTag.attributes.find((attr) => attr.directive === false && attr.key.name === "slot")) return false;
				if (startTag.attributes.find((attr) => attr.directive === true && attr.key.name.name === "bind" && attr.key.argument && attr.key.argument.type === "VIdentifier" && attr.key.argument.name === "slot")) return false;
				return true;
			}
			/**
			* Convert to `v-slot`.
			* @param {RuleFixer} fixer fixer
			* @param {VDirective} scopeAttr node of `slot-scope`
			* @returns {Fix[]} fix data
			*/
			function fixSlotScopeToVSlot(fixer, scopeAttr) {
				const element = scopeAttr.parent.parent;
				const replaceText = `v-slot${scopeAttr && scopeAttr.value ? `=${sourceCode.getText(scopeAttr.value)}` : ""}`;
				if (element.name === "template") return [fixer.replaceText(scopeAttr, replaceText)];
				else {
					const tokenBefore = tokenStore.getTokenBefore(scopeAttr);
					return [
						fixer.removeRange([tokenBefore.range[1], scopeAttr.range[1]]),
						fixer.insertTextBefore(element, `<template ${replaceText}>\n`),
						fixer.insertTextAfter(element, `\n</template>`)
					];
				}
			}
			/**
			* Reports `slot-scope` node
			* @param {VDirective} scopeAttr node of `slot-scope`
			* @returns {void}
			*/
			function reportSlotScope(scopeAttr) {
				context.report({
					node: scopeAttr.key,
					messageId: "forbiddenSlotScopeAttribute",
					fix(fixer) {
						if (!fixToUpgrade) return null;
						const startTag = scopeAttr.parent;
						if (!canConvertToVSlot(startTag)) return null;
						return fixSlotScopeToVSlot(fixer, scopeAttr);
					}
				});
			}
			return { "VAttribute[directive=true][key.name.name='slot-scope']": reportSlotScope };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_slot_scope_attribute();
  }
});