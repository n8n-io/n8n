'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/no-undef-directives.js
/**
* @author rzzf
* See LICENSE file in root directory for full license.
*/
var require_no_undef_directives = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const regexp = require_regexp$1.default;
	/**
	* @param {ObjectExpression} componentObject
	* @returns { { node: Property, name: string }[] } Array of ASTNodes
	*/
	function getRegisteredDirectives(componentObject) {
		const directivesNode = componentObject.properties.find((p) => p.type === "Property" && utils.getStaticPropertyName(p) === "directives" && p.value.type === "ObjectExpression");
		if (!directivesNode || directivesNode.type !== "Property" || directivesNode.value.type !== "ObjectExpression") return [];
		return directivesNode.value.properties.flatMap((node) => {
			const name = node.type === "Property" ? utils.getStaticPropertyName(node) : null;
			return name ? [{
				node,
				name
			}] : [];
		});
	}
	/**
	* @param {string} rawName
	* @param {Set<string>} definedNames
	*/
	function isDefinedInSetup(rawName, definedNames) {
		const camelName = casing.camelCase(rawName);
		const variableName = `v${casing.capitalize(camelName)}`;
		return definedNames.has(variableName);
	}
	/**
	* @param {string} rawName
	* @param {Set<string>} definedNames
	*/
	function isDefinedInOptions(rawName, definedNames) {
		const camelName = casing.camelCase(rawName);
		if (definedNames.has(rawName)) return true;
		for (const name of definedNames) {
			const lowercaseName = name.toLowerCase();
			if (name !== lowercaseName && lowercaseName === camelName.toLowerCase()) return true;
		}
		return false;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow use of undefined custom directives",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-undef-directives.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { ignore: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true
				} },
				additionalProperties: false
			}],
			messages: { undef: "The 'v-{{name}}' directive has been used, but not defined." }
		},
		create(context) {
			const { ignore = [] } = context.options[0] || {};
			const isAnyIgnored = regexp.toRegExpGroupMatcher(ignore);
			/**
			* Check whether the given directive name is a verify target or not.
			*
			* @param {string} rawName The directive name.
			* @returns {boolean}
			*/
			function isVerifyTargetDirective(rawName) {
				const kebabName = casing.kebabCase(rawName);
				if (utils.isBuiltInDirectiveName(rawName) || isAnyIgnored(rawName, kebabName)) return false;
				return true;
			}
			/**
			* @param {(rawName: string) => boolean} isDefined
			* @returns {TemplateListener}
			*/
			function createTemplateBodyVisitor(isDefined) {
				return { "VAttribute[directive=true]"(node) {
					const name = node.key.name.name;
					if (utils.isBuiltInDirectiveName(name)) return;
					const rawName = node.key.name.rawName || name;
					if (isVerifyTargetDirective(rawName) && !isDefined(rawName)) context.report({
						node: node.key,
						messageId: "undef",
						data: { name: rawName }
					});
				} };
			}
			/** @type {Set<string>} */
			const definedInOptionDirectives = /* @__PURE__ */ new Set();
			if (utils.isScriptSetup(context)) {
				/** @type {Set<string>} */
				const definedInSetupDirectives = /* @__PURE__ */ new Set();
				const globalScope = context.sourceCode.scopeManager.globalScope;
				if (globalScope) {
					for (const variable of globalScope.variables) definedInSetupDirectives.add(variable.name);
					const moduleScope = globalScope.childScopes.find((scope) => scope.type === "module");
					for (const variable of moduleScope?.variables ?? []) definedInSetupDirectives.add(variable.name);
				}
				const scriptVisitor$1 = utils.defineVueVisitor(context, { onVueObjectEnter(node) {
					for (const directive of getRegisteredDirectives(node)) definedInOptionDirectives.add(directive.name);
				} });
				const templateBodyVisitor$1 = createTemplateBodyVisitor((rawName) => isDefinedInSetup(rawName, definedInSetupDirectives) || isDefinedInOptions(rawName, definedInOptionDirectives));
				return utils.defineTemplateBodyVisitor(context, templateBodyVisitor$1, scriptVisitor$1);
			}
			const scriptVisitor = utils.executeOnVue(context, (obj) => {
				for (const directive of getRegisteredDirectives(obj)) definedInOptionDirectives.add(directive.name);
			});
			const templateBodyVisitor = createTemplateBodyVisitor((rawName) => isDefinedInOptions(rawName, definedInOptionDirectives));
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor, scriptVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_undef_directives();
  }
});