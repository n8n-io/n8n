'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/no-undef-components.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_undef_components = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const path = require("node:path");
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* `casing.camelCase()` converts the beginning to lowercase,
	* but does not convert the case of the beginning character when converting with Vue3.
	* @see https://github.com/vuejs/core/blob/ae4b0783d78670b6e942ae2a4e3ec6efbbffa158/packages/shared/src/index.ts#L105
	* @param {string} str
	*/
	function camelize(str) {
		return str.replaceAll(/-(\w)/g, (_, c) => c ? c.toUpperCase() : "");
	}
	var DefinedInSetupComponents = class {
		constructor() {
			/**
			* Component names
			* @type {Set<string>}
			*/
			this.names = /* @__PURE__ */ new Set();
		}
		/**
		* @param {string[]} names
		*/
		addName(...names) {
			for (const name of names) this.names.add(name);
		}
		/**
		* @see https://github.com/vuejs/core/blob/ae4b0783d78670b6e942ae2a4e3ec6efbbffa158/packages/compiler-core/src/transforms/transformElement.ts#L334
		* @param {string} rawName
		*/
		isDefinedComponent(rawName) {
			if (this.names.has(rawName)) return true;
			const camelName = camelize(rawName);
			if (this.names.has(camelName)) return true;
			const pascalName = casing.capitalize(camelName);
			if (this.names.has(pascalName)) return true;
			const dotIndex = rawName.indexOf(".");
			if (dotIndex > 0 && this.isDefinedComponent(rawName.slice(0, dotIndex))) return true;
			return false;
		}
	};
	var DefinedInOptionComponents = class {
		constructor() {
			/**
			* Component names
			* @type {Set<string>}
			*/
			this.names = /* @__PURE__ */ new Set();
			/**
			* Component names, transformed to kebab-case
			* @type {Set<string>}
			*/
			this.kebabCaseNames = /* @__PURE__ */ new Set();
		}
		/**
		* @param {string[]} names
		*/
		addName(...names) {
			for (const name of names) {
				this.names.add(name);
				this.kebabCaseNames.add(casing.kebabCase(name));
			}
		}
		/**
		* @param {string} rawName
		*/
		isDefinedComponent(rawName) {
			if (this.names.has(rawName)) return true;
			const kebabCaseName = casing.kebabCase(rawName);
			if (this.kebabCaseNames.has(kebabCaseName) && !casing.isPascalCase(rawName)) return true;
			return false;
		}
	};
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow use of undefined components in `<template>`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-undef-components.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { ignorePatterns: { type: "array" } },
				additionalProperties: false
			}],
			messages: {
				undef: "The '<{{name}}>' component has been used, but not defined.",
				typeOnly: "The '<{{name}}>' component has been used, but '{{name}}' only refers to a type."
			}
		},
		create(context) {
			/** @type {string[]} */
			const ignorePatterns = (context.options[0] || {}).ignorePatterns || [];
			/**
			* Check whether the given element name is a verify target or not.
			*
			* @param {string} rawName The element name.
			* @returns {boolean}
			*/
			function isVerifyTargetComponent(rawName) {
				const kebabCaseName = casing.kebabCase(rawName);
				if (utils.isHtmlWellKnownElementName(rawName) || utils.isSvgWellKnownElementName(rawName) || utils.isMathWellKnownElementName(rawName) || utils.isBuiltInComponentName(kebabCaseName)) return false;
				const pascalCaseName = casing.pascalCase(rawName);
				if (ignorePatterns.some((pattern) => {
					const regExp = new RegExp(pattern);
					return regExp.test(rawName) || regExp.test(kebabCaseName) || regExp.test(pascalCaseName);
				})) return false;
				return true;
			}
			/** @type { (rawName:string, reportNode: ASTNode) => void } */
			let verifyName;
			/** @type {RuleListener} */
			let scriptVisitor = {};
			/** @type {TemplateListener} */
			const templateBodyVisitor = {
				VElement(node) {
					if (!utils.isHtmlElementNode(node) && !utils.isSvgElementNode(node) && !utils.isMathElementNode(node)) return;
					verifyName(node.rawName, node.startTag);
				},
				"VAttribute[directive=false][key.name='is']"(node) {
					if (!node.value) return;
					const value = node.value.value.startsWith("vue:") ? node.value.value.slice(4) : node.value.value;
					verifyName(value, node);
				}
			};
			if (utils.isScriptSetup(context)) {
				const definedInSetupComponents = new DefinedInSetupComponents();
				const definedInOptionComponents = new DefinedInOptionComponents();
				/** @type {Set<string>} */
				const scriptTypeOnlyNames = /* @__PURE__ */ new Set();
				const globalScope = context.sourceCode.scopeManager.globalScope;
				if (globalScope) {
					for (const variable of globalScope.variables) definedInSetupComponents.addName(variable.name);
					const moduleScope = globalScope.childScopes.find((scope) => scope.type === "module");
					for (const variable of moduleScope && moduleScope.variables || []) if (variable.isTypeVariable && !variable.isValueVariable || variable.defs.length > 0 && variable.defs.every((def) => {
						if (def.type !== "ImportBinding") return false;
						if (def.parent.importKind === "type") return true;
						if (def.node.type === "ImportSpecifier" && def.node.importKind === "type") return true;
						return false;
					})) scriptTypeOnlyNames.add(variable.name);
					else definedInSetupComponents.addName(variable.name);
				}
				const fileName = context.filename;
				const selfComponentName = path.basename(fileName, path.extname(fileName));
				definedInSetupComponents.addName(selfComponentName);
				scriptVisitor = utils.defineVueVisitor(context, { onVueObjectEnter(node, { type }) {
					if (type !== "export") return;
					const nameProperty = utils.findProperty(node, "name");
					if (nameProperty && utils.isStringLiteral(nameProperty.value)) {
						const name = utils.getStringLiteralValue(nameProperty.value);
						if (name) definedInOptionComponents.addName(name);
					}
				} });
				verifyName = (rawName, reportNode) => {
					if (!isVerifyTargetComponent(rawName)) return;
					if (definedInSetupComponents.isDefinedComponent(rawName)) return;
					if (definedInOptionComponents.isDefinedComponent(rawName)) return;
					context.report({
						node: reportNode,
						messageId: scriptTypeOnlyNames.has(rawName) ? "typeOnly" : "undef",
						data: { name: rawName }
					});
				};
			} else {
				const definedInOptionComponents = new DefinedInOptionComponents();
				scriptVisitor = utils.executeOnVue(context, (obj) => {
					definedInOptionComponents.addName(...utils.getRegisteredComponents(obj).map(({ name }) => name));
					const nameProperty = utils.findProperty(obj, "name");
					if (nameProperty && utils.isStringLiteral(nameProperty.value)) {
						const name = utils.getStringLiteralValue(nameProperty.value);
						if (name) definedInOptionComponents.addName(name);
					}
				});
				verifyName = (rawName, reportNode) => {
					if (!isVerifyTargetComponent(rawName)) return;
					if (definedInOptionComponents.isDefinedComponent(rawName)) return;
					context.report({
						node: reportNode,
						messageId: "undef",
						data: { name: rawName }
					});
				};
				/** @param {VDirective} node */
				templateBodyVisitor["VAttribute[directive=true][key.name.name='bind'][key.argument.name='is'], VAttribute[directive=true][key.name.name='is']"] = (node) => {
					if (!node.value || node.value.type !== "VExpressionContainer" || !node.value.expression) return;
					if (node.value.expression.type === "Literal") verifyName(`${node.value.expression.value}`, node);
				};
			}
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor, scriptVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_undef_components();
  }
});