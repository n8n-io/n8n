'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/prefer-define-options.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_prefer_define_options = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce use of `defineOptions` instead of default export",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/prefer-define-options.html"
			},
			fixable: "code",
			schema: [],
			messages: { preferDefineOptions: "Use `defineOptions` instead of default export." }
		},
		create(context) {
			const scriptSetup = utils.getScriptSetupElement(context);
			if (!scriptSetup) return {};
			/** @type {CallExpression | null} */
			let defineOptionsNode = null;
			/** @type {ExportDefaultDeclaration | null} */
			let exportDefaultDeclaration = null;
			/** @type {ImportDeclaration|null} */
			let lastImportDeclaration = null;
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
				ImportDeclaration(node) {
					lastImportDeclaration = node;
				},
				onDefineOptionsEnter(node) {
					defineOptionsNode = node;
				}
			}), {
				ExportDefaultDeclaration(node) {
					exportDefaultDeclaration = node;
				},
				"Program:exit"() {
					if (!exportDefaultDeclaration) return;
					context.report({
						node: exportDefaultDeclaration,
						messageId: "preferDefineOptions",
						fix: defineOptionsNode ? null : buildFix(exportDefaultDeclaration, scriptSetup)
					});
				}
			});
			/**
			* @param {ExportDefaultDeclaration} node
			* @param {VElement} scriptSetup
			* @returns {(fixer: RuleFixer) => Fix[]}
			*/
			function buildFix(node, scriptSetup$1) {
				return (fixer) => {
					const sourceCode = context.sourceCode;
					/** @type {Range} */
					let removeRange = [...node.range];
					const script = scriptSetup$1.parent.children.filter(utils.isVElement).find((node$1) => node$1.name === "script" && !utils.hasAttribute(node$1, "setup"));
					if (script && script.endTag && sourceCode.getTokensBetween(script.startTag, script.endTag, { includeComments: true }).every((token) => removeRange[0] <= token.range[0] && token.range[1] <= removeRange[1])) removeRange = [...script.range];
					const removeStartLoc = sourceCode.getLocFromIndex(removeRange[0]);
					if (sourceCode.lines[removeStartLoc.line - 1].slice(0, removeStartLoc.column).trim() === "") removeRange[0] = removeStartLoc.line === 1 ? 0 : sourceCode.getIndexFromLoc({
						line: removeStartLoc.line - 1,
						column: sourceCode.lines[removeStartLoc.line - 2].length
					});
					/** @type {VStartTag | ImportDeclaration} */
					const insertAfterTag = lastImportDeclaration || scriptSetup$1.startTag;
					return [fixer.removeRange(removeRange), fixer.insertTextAfter(insertAfterTag, `\ndefineOptions(${sourceCode.getText(node.declaration)})\n`)];
				};
			}
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_prefer_define_options();
  }
});