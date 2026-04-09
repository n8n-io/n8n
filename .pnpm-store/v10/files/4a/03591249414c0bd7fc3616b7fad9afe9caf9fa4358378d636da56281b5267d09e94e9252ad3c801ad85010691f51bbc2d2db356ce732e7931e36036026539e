'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-v-bind-sync.js
/**
* @author Przemyslaw Falowski (@przemkow)
* @fileoverview Disallow use of deprecated `.sync` modifier on `v-bind` directive (in Vue.js 3.0.0+)
*/
var require_no_deprecated_v_bind_sync = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow use of deprecated `.sync` modifier on `v-bind` directive (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-v-bind-sync.html"
			},
			fixable: "code",
			schema: [],
			messages: { syncModifierIsDeprecated: "'.sync' modifier on 'v-bind' directive is deprecated. Use 'v-model:propName' instead." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind']"(node) {
				if (node.key.modifiers.map((mod) => mod.name).includes("sync")) context.report({
					node,
					loc: node.loc,
					messageId: "syncModifierIsDeprecated",
					fix(fixer) {
						if (node.key.argument == null) return null;
						if (node.key.modifiers.length > 1) return null;
						const bindArgument = context.sourceCode.getText(node.key.argument);
						return fixer.replaceText(node.key, `v-model:${bindArgument}`);
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
    return require_no_deprecated_v_bind_sync();
  }
});