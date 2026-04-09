'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-root-v-if.js
/**
* @author Perry Song
* @copyright 2023 Perry Song. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_no_root_v_if = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow `v-if` directives on root element",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-root-v-if.html"
			},
			fixable: null,
			schema: [],
			messages: { noRootVIf: "`v-if` should not be used on root element without `v-else`." }
		},
		create(context) {
			return { Program(program) {
				const element = program.templateBody;
				if (element == null) return;
				const rootElements = element.children.filter(utils.isVElement);
				if (rootElements.length === 1 && utils.hasDirective(rootElements[0], "if")) context.report({
					node: element,
					loc: element.loc,
					messageId: "noRootVIf"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_root_v_if();
  }
});