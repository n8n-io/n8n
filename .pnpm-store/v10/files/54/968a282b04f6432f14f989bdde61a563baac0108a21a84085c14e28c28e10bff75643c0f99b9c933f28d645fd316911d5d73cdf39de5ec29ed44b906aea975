'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_index = require('../../utils/index.js');

//#region lib/rules/syntaxes/define-options.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_define_options = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		supported: ">=3.3.0",
		createScriptVisitor(context) {
			const sourceCode = context.sourceCode;
			return utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				context.report({
					node,
					messageId: "forbiddenDefineOptions",
					fix(fixer) {
						return fix(fixer, node);
					}
				});
			} });
			/**
			* @param {RuleFixer} fixer
			* @param {CallExpression} node defineOptions() node
			*/
			function fix(fixer, node) {
				if (node.arguments.length === 0) return null;
				const scriptSetup = utils.getScriptSetupElement(context);
				if (!scriptSetup) return null;
				if (scriptSetup.parent.children.filter(utils.isVElement).some((node$1) => node$1.name === "script" && !utils.hasAttribute(node$1, "setup"))) return null;
				/** @type {ASTNode} */
				let statement = node;
				while (statement.parent && statement.parent.type !== "Program") statement = statement.parent;
				/** @type {Range} */
				const removeRange = [...statement.range];
				if (sourceCode.lines[statement.loc.start.line - 1].slice(0, statement.loc.start.column).trim() === "") removeRange[0] -= statement.loc.start.column;
				return [fixer.insertTextBefore(scriptSetup, `<script>\nexport default ${sourceCode.getText(node.arguments[0])}\n<\/script>\n`), fixer.removeRange(removeRange)];
			}
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_define_options();
  }
});