'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-slot.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_slot = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	/**
	* Checks whether the given node can convert to the `slot`.
	* @param {VDirective} vSlotAttr node of `v-slot`
	* @returns {boolean} `true` if the given node can convert to the `slot`
	*/
	function canConvertToSlot(vSlotAttr) {
		return vSlotAttr.parent.parent.name === "template";
	}
	module.exports = {
		supported: ">=2.6.0",
		createTemplateBodyVisitor(context) {
			const sourceCode = context.sourceCode;
			/**
			* Convert to `slot` and `slot-scope`.
			* @param {RuleFixer} fixer fixer
			* @param {VDirective} vSlotAttr node of `v-slot`
			* @returns {null|Fix} fix data
			*/
			function fixVSlotToSlot(fixer, vSlotAttr) {
				const key = vSlotAttr.key;
				if (key.modifiers.length > 0) return null;
				const attrs = [];
				const argument = key.argument;
				if (argument) if (argument.type === "VIdentifier") {
					const name = argument.rawName;
					attrs.push(`slot="${name}"`);
				} else if (argument.type === "VExpressionContainer" && argument.expression) {
					const expression = sourceCode.getText(argument.expression);
					attrs.push(`:slot="${expression}"`);
				} else return null;
				const scopedValueNode = vSlotAttr.value;
				if (scopedValueNode) attrs.push(`slot-scope=${sourceCode.getText(scopedValueNode)}`);
				if (attrs.length === 0) attrs.push("slot");
				return fixer.replaceText(vSlotAttr, attrs.join(" "));
			}
			/**
			* Reports `v-slot` node
			* @param {VDirective} vSlotAttr node of `v-slot`
			* @returns {void}
			*/
			function reportVSlot(vSlotAttr) {
				context.report({
					node: vSlotAttr.key,
					messageId: "forbiddenVSlot",
					fix(fixer) {
						if (!canConvertToSlot(vSlotAttr)) return null;
						return fixVSlotToSlot(fixer, vSlotAttr);
					}
				});
			}
			return { "VAttribute[directive=true][key.name.name='slot']": reportVSlot };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_slot();
  }
});