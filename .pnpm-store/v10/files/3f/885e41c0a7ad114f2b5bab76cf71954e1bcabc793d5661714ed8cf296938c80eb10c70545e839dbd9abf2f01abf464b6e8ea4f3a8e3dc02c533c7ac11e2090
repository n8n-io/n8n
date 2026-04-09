'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/prop-name-casing.js
/**
* @fileoverview Requires specific casing for the Prop name in Vue components
* @author Yu Kimura
*/
var require_prop_name_casing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const { toRegExpGroupMatcher } = require_regexp$1.default;
	const allowedCaseOptions = ["camelCase", "snake_case"];
	/**
	* @typedef {import('../utils').ComponentProp} ComponentProp
	*/
	/** @param {RuleContext} context */
	function create(context) {
		const options = context.options[0];
		const isIgnoredProp = toRegExpGroupMatcher(context.options[1]?.ignoreProps);
		const caseType = allowedCaseOptions.includes(options) ? options : "camelCase";
		const checker = casing.getChecker(caseType);
		/**
		* @param {ComponentProp[]} props
		*/
		function processProps(props) {
			for (const item of props) {
				const propName = item.propName;
				if (propName == null) continue;
				if (!checker(propName) && !isIgnoredProp(propName)) context.report({
					node: item.node,
					messageId: "invalidCase",
					data: {
						name: propName,
						caseType
					}
				});
			}
		}
		return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(_node, props) {
			processProps(props);
		} }), utils.executeOnVue(context, (obj) => {
			processProps(utils.getComponentPropsFromOptions(obj));
		}));
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce specific casing for the Prop name in Vue components",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/prop-name-casing.html"
			},
			fixable: null,
			schema: [{ enum: allowedCaseOptions }, {
				type: "object",
				properties: { ignoreProps: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true
				} },
				additionalProperties: false
			}],
			messages: { invalidCase: "Prop \"{{name}}\" is not in {{caseType}}." }
		},
		create
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_prop_name_casing();
  }
});