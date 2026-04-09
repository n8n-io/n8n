'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_vue3_builtin_components$1 = require('../utils/vue3-builtin-components.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/multi-word-component-names.js
/**
* @author Marton Csordas
* See LICENSE file in root directory for full license.
*/
var require_multi_word_component_names = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const path = require("node:path");
	const casing = require_casing$1.default;
	const utils = require_index.default;
	const RESERVED_NAMES_IN_VUE3 = new Set(require_vue3_builtin_components$1.default);
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require component names to be always multi-word",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/multi-word-component-names.html"
			},
			schema: [{
				type: "object",
				properties: { ignores: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true,
					additionalItems: false
				} },
				additionalProperties: false
			}],
			messages: { unexpected: "Component name \"{{value}}\" should always be multi-word." }
		},
		create(context) {
			/** @type {Set<string>} */
			const ignores = new Set(["App", "app"]);
			for (const ignore of context.options[0] && context.options[0].ignores || []) {
				ignores.add(ignore);
				if (casing.isPascalCase(ignore)) ignores.add(casing.kebabCase(ignore));
			}
			let hasVue = utils.isScriptSetup(context);
			let hasName = false;
			/**
			* Returns true if the given component name is valid, otherwise false.
			* @param {string} name
			* */
			function isValidComponentName(name) {
				if (ignores.has(name) || RESERVED_NAMES_IN_VUE3.has(name)) return true;
				return casing.kebabCase(name).split("-").length > 1;
			}
			/**
			* @param {Expression | SpreadElement} nameNode
			*/
			function validateName(nameNode) {
				if (nameNode.type !== "Literal") return;
				const componentName = `${nameNode.value}`;
				if (!isValidComponentName(componentName)) context.report({
					node: nameNode,
					messageId: "unexpected",
					data: { value: componentName }
				});
			}
			return utils.compositingVisitors(utils.executeOnCallVueComponent(context, (node) => {
				hasVue = true;
				if (node.arguments.length !== 2) return;
				hasName = true;
				validateName(node.arguments[0]);
			}), utils.executeOnVue(context, (obj) => {
				hasVue = true;
				const node = utils.findProperty(obj, "name");
				if (!node) return;
				hasName = true;
				validateName(node.value);
			}), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				if (node.arguments.length === 0) return;
				const define = node.arguments[0];
				if (define.type !== "ObjectExpression") return;
				const nameNode = utils.findProperty(define, "name");
				if (!nameNode) return;
				hasName = true;
				validateName(nameNode.value);
			} }), { "Program:exit"(node) {
				if (hasName) return;
				if (!hasVue && node.body.length > 0) return;
				const fileName = context.filename;
				const componentName = path.basename(fileName, path.extname(fileName));
				if (utils.isVueFile(fileName) && !isValidComponentName(componentName)) context.report({
					messageId: "unexpected",
					data: { value: componentName },
					loc: {
						line: 1,
						column: 0
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
    return require_multi_word_component_names();
  }
});