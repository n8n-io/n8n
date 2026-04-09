'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_vue3_export_names$1 = require('../utils/vue3-export-names.js');

//#region lib/rules/prefer-import-from-vue.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_prefer_import_from_vue = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const vue3ExportNames = new Set(require_vue3_export_names$1.default);
	const TARGET_AT_VUE_MODULES = new Set([
		"@vue/runtime-dom",
		"@vue/runtime-core",
		"@vue/reactivity",
		"@vue/shared"
	]);
	const SUBSET_AT_VUE_MODULES = new Set(["@vue/runtime-dom", "@vue/runtime-core"]);
	/**
	* @param {ImportDeclaration} node
	*/
	function* extractImportNames(node) {
		for (const specifier of node.specifiers) switch (specifier.type) {
			case "ImportDefaultSpecifier":
				yield "default";
				break;
			case "ImportNamespaceSpecifier":
				yield null;
				break;
			case "ImportSpecifier":
				yield specifier.imported.name;
				break;
		}
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce import from 'vue' instead of import from '@vue/*'",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/prefer-import-from-vue.html"
			},
			fixable: "code",
			schema: [],
			messages: { importedAtVue: "Import from 'vue' instead of '{{source}}'." }
		},
		create(context) {
			/**
			*
			* @param {Literal & { value: string }} source
			* @param { () => boolean } fixable
			*/
			function verifySource(source, fixable) {
				if (!TARGET_AT_VUE_MODULES.has(source.value)) return;
				context.report({
					node: source,
					messageId: "importedAtVue",
					data: { source: source.value },
					fix: fixable() ? (fixer) => fixer.replaceTextRange([source.range[0] + 1, source.range[1] - 1], "vue") : null
				});
			}
			return {
				ImportDeclaration(node) {
					if (node.specifiers.length === 0 && context.filename.endsWith(".d.ts")) return;
					verifySource(node.source, () => {
						if (SUBSET_AT_VUE_MODULES.has(node.source.value)) return true;
						for (const name of extractImportNames(node)) {
							if (name == null) return false;
							if (!vue3ExportNames.has(name)) return false;
						}
						return true;
					});
				},
				ExportNamedDeclaration(node) {
					if (node.source) verifySource(node.source, () => {
						for (const specifier of node.specifiers) if (!vue3ExportNames.has(specifier.local.name)) return false;
						return true;
					});
				},
				ExportAllDeclaration(node) {
					verifySource(node.source, () => false);
				}
			};
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_prefer_import_from_vue();
  }
});