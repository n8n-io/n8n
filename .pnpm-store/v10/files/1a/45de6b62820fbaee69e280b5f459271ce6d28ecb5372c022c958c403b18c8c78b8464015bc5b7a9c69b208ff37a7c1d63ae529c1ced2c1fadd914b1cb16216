'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-static-inline-styles.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_static_inline_styles = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Checks whether if the given property node is a static value.
	* @param {Property} prop property node to check
	* @returns {boolean} `true` if the given property node is a static value.
	*/
	function isStaticValue(prop) {
		return !prop.computed && prop.value.type === "Literal" && (prop.key.type === "Identifier" || prop.key.type === "Literal");
	}
	/**
	* Gets the static properties of a given expression node.
	* - If `SpreadElement` or computed property exists, it gets only the static properties before it.
	*   `:style="{ color: 'red', display: 'flex', ...spread, width: '16px' }"`
	*              ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^
	* - If non-static object exists, it gets only the static properties up to that object.
	*   `:style="[ { color: 'red' }, { display: 'flex', color, width: '16px' }, { height: '16px' } ]"`
	*                ^^^^^^^^^^^^      ^^^^^^^^^^^^^^^         ^^^^^^^^^^^^^
	* - If all properties are static properties, it returns one root node.
	*   `:style="[ { color: 'red' }, { display: 'flex', width: '16px' } ]"`
	*    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	* @param {VDirective} node `:style` node to check
	* @returns {Property[] | [VDirective]} the static properties.
	*/
	function getReportNodes(node) {
		const { value } = node;
		if (!value) return [];
		const { expression } = value;
		if (!expression) return [];
		let elements;
		if (expression.type === "ObjectExpression") elements = [expression];
		else if (expression.type === "ArrayExpression") elements = expression.elements;
		else return [];
		const staticProperties = [];
		for (const element of elements) {
			if (!element) continue;
			if (element.type !== "ObjectExpression") return staticProperties;
			let isAllStatic = true;
			for (const prop of element.properties) {
				if (prop.type === "SpreadElement" || prop.computed) return staticProperties;
				if (isStaticValue(prop)) staticProperties.push(prop);
				else isAllStatic = false;
			}
			if (!isAllStatic) return staticProperties;
		}
		return [node];
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow static inline `style` attributes",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-static-inline-styles.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { allowBinding: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				forbiddenStaticInlineStyle: "Static inline `style` are forbidden.",
				forbiddenStyleAttr: "`style` attributes are forbidden."
			}
		},
		create(context) {
			/**
			* Reports if the value is static.
			* @param {VDirective} node `:style` node to check
			*/
			function verifyVBindStyle(node) {
				for (const n of getReportNodes(node)) context.report({
					node: n,
					messageId: "forbiddenStaticInlineStyle"
				});
			}
			/** @type {TemplateListener} */
			const visitor = { "VAttribute[directive=false][key.name='style']"(node) {
				context.report({
					node,
					messageId: "forbiddenStyleAttr"
				});
			} };
			if (!context.options[0] || !context.options[0].allowBinding) visitor["VAttribute[directive=true][key.name.name='bind'][key.argument.name='style']"] = verifyVBindStyle;
			return utils.defineTemplateBodyVisitor(context, visitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_static_inline_styles();
  }
});