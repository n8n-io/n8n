'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_ref_object_references$1 = require('../utils/ref-object-references.js');

//#region lib/rules/require-typed-ref.js
/**
* @author Ivan Demchuk <https://github.com/Demivan>
* See LICENSE file in root directory for full license.
*/
var require_require_typed_ref = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { iterateDefineRefs } = require_ref_object_references$1.default;
	const utils = require_index.default;
	/**
	* @param {Expression|SpreadElement} node
	*/
	function isNullOrUndefined(node) {
		return node.type === "Literal" && node.value === null || node.type === "Identifier" && node.name === "undefined";
	}
	/**
	* @typedef {import('../utils/ref-object-references').RefObjectReferences} RefObjectReferences
	*/
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require `ref` and `shallowRef` functions to be strongly typed",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/require-typed-ref.html"
			},
			fixable: null,
			schema: [],
			messages: { noType: "Specify type parameter for `{{name}}` function, otherwise created variable will not be typechecked." }
		},
		create(context) {
			const filename = context.filename;
			if (!utils.isVueFile(filename) && !utils.isTypeScriptFile(filename)) return {};
			if (utils.isVueFile(filename)) {
				const sourceCode = context.sourceCode;
				const documentFragment = sourceCode.parserServices.getDocumentFragment && sourceCode.parserServices.getDocumentFragment();
				if (!documentFragment) return {};
				if (documentFragment.children.filter(
					/** @returns {element is VElement} */
					(element) => utils.isVElement(element) && element.name === "script"
				).every((script) => !utils.hasAttribute(script, "lang", "ts"))) return {};
			}
			const defines = iterateDefineRefs(context.sourceCode.scopeManager.globalScope);
			/**
			* @param {string} name
			* @param {CallExpression} node
			*/
			function report(name, node) {
				context.report({
					node,
					messageId: "noType",
					data: { name }
				});
			}
			return { Program() {
				for (const ref of defines) {
					if (ref.name !== "ref" && ref.name !== "shallowRef") continue;
					if (ref.node.arguments.length > 0 && !isNullOrUndefined(ref.node.arguments[0])) continue;
					if (("typeArguments" in ref.node ? ref.node.typeArguments : ref.node.typeParameters) == null) if (ref.node.parent.type === "VariableDeclarator" && ref.node.parent.id.type === "Identifier") {
						if (ref.node.parent.id.typeAnnotation == null) report(ref.name, ref.node);
					} else report(ref.name, ref.node);
				}
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_typed_ref();
  }
});