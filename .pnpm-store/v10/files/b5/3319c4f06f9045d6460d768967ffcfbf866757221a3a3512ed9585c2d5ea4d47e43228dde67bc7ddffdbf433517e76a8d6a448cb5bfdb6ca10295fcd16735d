'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-v-model-argument.js
/**
* @author Przemyslaw Falowski (@przemkow)
* @fileoverview This rule checks whether v-model used on custom component do not have an argument
*/
var require_no_v_model_argument = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow adding an argument to `v-model` used in custom component",
				categories: ["vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-v-model-argument.html"
			},
			fixable: null,
			deprecated: true,
			schema: [],
			messages: { vModelRequireNoArgument: "'v-model' directives require no argument." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='model']"(node) {
				const element = node.parent.parent;
				if (node.key.argument && utils.isCustomComponent(element)) context.report({
					node,
					loc: node.loc,
					messageId: "vModelRequireNoArgument"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_v_model_argument();
  }
});