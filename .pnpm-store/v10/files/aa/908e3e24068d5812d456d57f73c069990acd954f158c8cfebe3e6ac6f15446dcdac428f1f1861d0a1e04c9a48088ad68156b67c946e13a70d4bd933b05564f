'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/match-component-import-name.js
/**
* @author Doug Wade <douglas.b.wade@gmail.com>
* See LICENSE file in root directory for full license.
*/
var require_match_component_import_name = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* @param {Identifier} identifier
	* @return {Array<String>}
	*/
	function getExpectedNames(identifier) {
		return [casing.pascalCase(identifier.name), casing.kebabCase(identifier.name)];
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require the registered component name to match the imported component name",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/match-component-import-name.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "Component alias {{importedName}} should be one of: {{expectedName}}." }
		},
		create(context) {
			return utils.executeOnVueComponent(context, (obj) => {
				const components = utils.findProperty(obj, "components");
				if (!components || !components.value || components.value.type !== "ObjectExpression") return;
				for (const property of components.value.properties) {
					if (property.type === "SpreadElement" || property.value.type !== "Identifier" || property.computed === true) continue;
					const importedName = utils.getStaticPropertyName(property) || "";
					const expectedNames = getExpectedNames(property.value);
					if (!expectedNames.includes(importedName)) context.report({
						node: property,
						messageId: "unexpected",
						data: {
							importedName,
							expectedName: expectedNames.join(", ")
						}
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
    return require_match_component_import_name();
  }
});