'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_vue_reserved$1 = require('../utils/vue-reserved.js');

//#region lib/rules/no-reserved-keys.js
/**
* @fileoverview Prevent overwrite reserved keys
* @author Armano
*/
var require_no_reserved_keys = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').GroupName} GroupName
	*/
	const RESERVED_KEYS = require_vue_reserved$1.default;
	/** @type {GroupName[]} */
	const GROUP_NAMES = [
		"props",
		"computed",
		"data",
		"asyncData",
		"methods",
		"setup"
	];
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow overwriting reserved keys",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-reserved-keys.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: {
					reserved: { type: "array" },
					groups: { type: "array" }
				},
				additionalProperties: false
			}],
			messages: {
				reserved: "Key '{{name}}' is reserved.",
				startsWithUnderscore: "Keys starting with '_' are reserved in '{{name}}' group."
			}
		},
		create(context) {
			const options = context.options[0] || {};
			const reservedKeys = new Set([...RESERVED_KEYS, ...options.reserved || []]);
			const groups = new Set([...GROUP_NAMES, ...options.groups || []]);
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(_node, props) {
				for (const prop of props) if (prop.propName && reservedKeys.has(prop.propName)) {
					const { propName, node } = prop;
					context.report({
						node,
						messageId: "reserved",
						data: { name: propName }
					});
				}
			} }), utils.executeOnVue(context, (obj) => {
				const properties = utils.iterateProperties(obj, groups);
				for (const o of properties) if ((o.groupName === "data" || o.groupName === "asyncData") && o.name[0] === "_") context.report({
					node: o.node,
					messageId: "startsWithUnderscore",
					data: { name: o.name }
				});
				else if (reservedKeys.has(o.name)) context.report({
					node: o.node,
					messageId: "reserved",
					data: { name: o.name }
				});
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_reserved_keys();
  }
});