'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_keycode_to_key$1 = require('../utils/keycode-to-key.js');

//#region lib/rules/no-deprecated-v-on-number-modifiers.js
/**
* @fileoverview disallow using deprecated number (keycode) modifiers
* @author yoyo930021
*/
var require_no_deprecated_v_on_number_modifiers = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const keyCodeToKey = require_keycode_to_key$1.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated number (keycode) modifiers (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-v-on-number-modifiers.html"
			},
			fixable: "code",
			schema: [],
			messages: { numberModifierIsDeprecated: "'KeyboardEvent.keyCode' modifier on 'v-on' directive is deprecated. Using 'KeyboardEvent.key' instead." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='on'] > VDirectiveKey"(node) {
				const modifier = node.modifiers.find((mod) => Number.isInteger(Number.parseInt(mod.name, 10)));
				if (!modifier) return;
				const keyCodes = Number.parseInt(modifier.name, 10);
				if (keyCodes > 9 || keyCodes < 0) context.report({
					node: modifier,
					messageId: "numberModifierIsDeprecated",
					fix(fixer) {
						const key = keyCodeToKey[keyCodes];
						if (!key) return null;
						return fixer.replaceText(modifier, `${key}`);
					}
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_v_on_number_modifiers();
  }
});