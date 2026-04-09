'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/no-reserved-props.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_reserved_props = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* @typedef {import('../utils').ComponentProp} ComponentProp
	*/
	const RESERVED = {
		3: ["key", "ref"],
		2: [
			"key",
			"ref",
			"is",
			"slot",
			"slot-scope",
			"slotScope",
			"class",
			"style"
		]
	};
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow reserved names in props",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-reserved-props.html",
				defaultOptions: { vue2: [{ vueVersion: 2 }] }
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { vueVersion: { enum: [2, 3] } },
				additionalProperties: false
			}],
			messages: { reserved: "'{{propName}}' is a reserved attribute and cannot be used as props." }
		},
		create(context) {
			/** @type {2|3} */
			const vueVersion = (context.options[0] || {}).vueVersion || 3;
			const reserved = new Set(RESERVED[vueVersion]);
			/**
			* @param {ComponentProp[]} props
			*/
			function processProps(props) {
				for (const prop of props) if (prop.propName != null && reserved.has(prop.propName)) context.report({
					node: prop.node,
					messageId: `reserved`,
					data: { propName: casing.kebabCase(prop.propName) }
				});
			}
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(_node, props) {
				processProps(props);
			} }), utils.executeOnVue(context, (obj) => {
				processProps(utils.getComponentPropsFromOptions(obj));
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_reserved_props();
  }
});