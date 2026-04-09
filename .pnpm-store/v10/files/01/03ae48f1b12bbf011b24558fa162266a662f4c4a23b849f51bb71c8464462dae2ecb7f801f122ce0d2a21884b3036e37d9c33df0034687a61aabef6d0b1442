'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/component-name-in-template-casing.js
/**
* @author Yosuke Ota
* issue https://github.com/vuejs/eslint-plugin-vue/issues/250
*/
var require_component_name_in_template_casing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const { toRegExpGroupMatcher, isRegExp } = require_regexp$1.default;
	const allowedCaseOptions = ["PascalCase", "kebab-case"];
	const defaultCase = "PascalCase";
	/**
	* Checks whether the given variable is the type-only import object.
	* @param {Variable} variable
	* @returns {boolean} `true` if the given variable is the type-only import.
	*/
	function isTypeOnlyImport(variable) {
		if (variable.defs.length === 0) return false;
		return variable.defs.every((def) => {
			if (def.type !== "ImportBinding") return false;
			if (def.parent.importKind === "type") return true;
			if (def.node.type === "ImportSpecifier" && def.node.importKind === "type") return true;
			return false;
		});
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce specific casing for the component naming style in template",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/component-name-in-template-casing.html"
			},
			fixable: "code",
			schema: [{ enum: allowedCaseOptions }, {
				type: "object",
				properties: {
					globals: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true
					},
					ignores: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
						additionalItems: false
					},
					registeredComponentsOnly: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: { incorrectCase: "Component name \"{{name}}\" is not {{caseType}}." }
		},
		create(context) {
			const caseOption = context.options[0];
			const options = context.options[1] || {};
			const caseType = allowedCaseOptions.includes(caseOption) ? caseOption : defaultCase;
			const isIgnored = toRegExpGroupMatcher(options.ignores);
			const globalStrings = [];
			const globalPatterns = [];
			for (const global of options.globals || []) if (isRegExp(global)) globalPatterns.push(global);
			else globalStrings.push(global);
			const isGlobalPattern = toRegExpGroupMatcher(globalPatterns);
			const registeredComponentsOnly = options.registeredComponentsOnly !== false;
			const sourceCode = context.sourceCode;
			const tokens = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
			/** @type { Set<string> } */
			const registeredComponents = new Set(globalStrings.map(casing.pascalCase));
			if (utils.isScriptSetup(context)) {
				const globalScope = context.sourceCode.scopeManager.globalScope;
				if (globalScope) {
					const moduleScope = globalScope.childScopes.find((scope) => scope.type === "module");
					for (const variable of moduleScope && moduleScope.variables || []) if (!isTypeOnlyImport(variable)) registeredComponents.add(variable.name);
				}
			}
			/**
			* Checks whether the given node is the verification target node.
			* @param {VElement} node element node
			* @returns {boolean} `true` if the given node is the verification target node.
			*/
			function isVerifyTarget(node) {
				if (isIgnored(node.rawName)) return false;
				if (!utils.isHtmlElementNode(node) && !utils.isSvgElementNode(node) && !utils.isMathElementNode(node) || utils.isHtmlWellKnownElementName(node.rawName) || utils.isSvgWellKnownElementName(node.rawName) || utils.isMathWellKnownElementName(node.rawName) || utils.isVueBuiltInElementName(node.rawName)) return false;
				if (!registeredComponentsOnly) return true;
				return registeredComponents.has(casing.pascalCase(node.rawName)) || isGlobalPattern(node.rawName);
			}
			let hasInvalidEOF = false;
			return utils.defineTemplateBodyVisitor(context, { VElement(node) {
				if (hasInvalidEOF) return;
				if (!isVerifyTarget(node)) return;
				const name = node.rawName;
				if (!casing.getChecker(caseType)(name)) {
					const startTag = node.startTag;
					const open = tokens.getFirstToken(startTag);
					const casingName = casing.getExactConverter(caseType)(name);
					context.report({
						node: open,
						loc: open.loc,
						messageId: "incorrectCase",
						data: {
							name,
							caseType
						},
						*fix(fixer) {
							yield fixer.replaceText(open, `<${casingName}`);
							const endTag = node.endTag;
							if (endTag) {
								const endTagOpen = tokens.getFirstToken(endTag);
								yield fixer.replaceText(endTagOpen, `</${casingName}`);
							}
						}
					});
				}
			} }, {
				Program(node) {
					hasInvalidEOF = utils.hasInvalidEOF(node);
				},
				...registeredComponentsOnly ? utils.executeOnVue(context, (obj) => {
					for (const n of utils.getRegisteredComponents(obj)) registeredComponents.add(n.name);
				}) : {}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_component_name_in_template_casing();
  }
});