'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-default-export.js
/**
* @author ItMaga
* See LICENSE file in root directory for full license.
*/
var require_require_default_export = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require components to be the default export",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/require-default-export.html"
			},
			fixable: null,
			schema: [],
			messages: {
				missing: "Missing default export.",
				mustBeDefaultExport: "Component must be the default export."
			}
		},
		create(context) {
			const documentFragment = context.sourceCode.parserServices.getDocumentFragment?.();
			const hasScript = documentFragment && documentFragment.children.some((e) => utils.isVElement(e) && e.name === "script");
			if (utils.isScriptSetup(context) || !hasScript) return {};
			let hasDefaultExport = false;
			let hasDefinedComponent = false;
			return utils.compositingVisitors(utils.defineVueVisitor(context, { onVueObjectExit() {
				hasDefinedComponent = true;
			} }), {
				"Program > ExportDefaultDeclaration"() {
					hasDefaultExport = true;
				},
				"Program:exit"(node) {
					if (!hasDefaultExport && node.body.length > 0) context.report({
						loc: node.tokens.at(-1).loc,
						messageId: hasDefinedComponent ? "mustBeDefaultExport" : "missing"
					});
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_default_export();
  }
});