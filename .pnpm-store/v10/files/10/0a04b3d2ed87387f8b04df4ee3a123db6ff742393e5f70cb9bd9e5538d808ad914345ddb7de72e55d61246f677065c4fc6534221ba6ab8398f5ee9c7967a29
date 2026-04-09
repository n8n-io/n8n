'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/prefer-use-template-ref.js
/**
* @author Thomasan1999
* See LICENSE file in root directory for full license.
*/
var require_prefer_use_template_ref = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef ScriptRef
	* @type {[string, CallExpression]}
	*/
	/**
	* @param body {(Statement | ModuleDeclaration)[]}
	* @returns {ScriptRef[]}
	* */
	function getScriptRefsFromSetupFunction(body) {
		return body.flatMap((child) => {
			if (child.type === "VariableDeclaration") {
				const declarator = child.declarations[0];
				if (declarator.init?.type === "CallExpression" && declarator.init.callee?.type === "Identifier" && declarator.id.type === "Identifier" && ["ref", "shallowRef"].includes(declarator.init.callee.name)) return [[declarator.id.name, declarator.init]];
			}
			return [];
		});
	}
	/** @type {import("eslint").Rule.RuleModule} */
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require using `useTemplateRef` instead of `ref`/`shallowRef` for template refs",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/prefer-use-template-ref.html"
			},
			schema: [],
			messages: { preferUseTemplateRef: "Replace '{{name}}' with 'useTemplateRef'." }
		},
		create(context) {
			/** @type Set<string> */
			const templateRefs = /* @__PURE__ */ new Set();
			/**
			* @type ScriptRef[] */
			const scriptRefs = [];
			return utils.compositingVisitors(utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=false]"(node) {
				if (node.key.name === "ref" && node.value?.value) templateRefs.add(node.value.value);
			} }), utils.defineVueVisitor(context, { onSetupFunctionEnter(node) {
				if (node.type === "ArrowFunctionExpression" && node.expression) return;
				const newScriptRefs = getScriptRefsFromSetupFunction(node.body.body);
				scriptRefs.push(...newScriptRefs);
			} }), utils.defineScriptSetupVisitor(context, { Program(node) {
				const newScriptRefs = getScriptRefsFromSetupFunction(node.body);
				scriptRefs.push(...newScriptRefs);
			} }), { "Program:exit"() {
				const scriptRefsMap = new Map(scriptRefs);
				for (const templateRef of templateRefs) {
					const scriptRef = scriptRefsMap.get(templateRef);
					if (!scriptRef) continue;
					context.report({
						node: scriptRef,
						messageId: "preferUseTemplateRef",
						data: { name: scriptRef.callee.name }
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_prefer_use_template_ref();
  }
});