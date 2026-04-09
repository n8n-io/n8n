'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-export-in-script-setup.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_export_in_script_setup = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('@typescript-eslint/types').TSESTree.ExportAllDeclaration} TSESTreeExportAllDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.ExportDefaultDeclaration} TSESTreeExportDefaultDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.ExportNamedDeclaration} TSESTreeExportNamedDeclaration
	*/
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow `export` in `<script setup>`",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-export-in-script-setup.html"
			},
			fixable: null,
			schema: [],
			messages: { forbidden: "`<script setup>` cannot contain ES module exports." }
		},
		create(context) {
			/**
			* @param {ExportAllDeclaration | ExportDefaultDeclaration | ExportNamedDeclaration} node
			* @param {SourceLocation} loc
			*/
			function verify(node, loc) {
				const tsNode = node;
				if (tsNode.exportKind === "type") return;
				if (tsNode.type === "ExportNamedDeclaration" && tsNode.specifiers.length > 0 && tsNode.specifiers.every((spec) => spec.exportKind === "type")) return;
				context.report({
					node,
					loc,
					messageId: "forbidden"
				});
			}
			return utils.defineScriptSetupVisitor(context, {
				ExportAllDeclaration: (node) => verify(node, node.loc),
				ExportDefaultDeclaration: (node) => verify(node, node.loc),
				ExportNamedDeclaration: (node) => {
					if (node.declaration) verify(node, context.sourceCode.getFirstToken(node).loc);
					else verify(node, node.loc);
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_export_in_script_setup();
  }
});