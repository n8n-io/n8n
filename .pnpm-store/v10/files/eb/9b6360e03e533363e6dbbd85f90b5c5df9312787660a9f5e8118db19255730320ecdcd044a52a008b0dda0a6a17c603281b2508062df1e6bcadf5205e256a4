'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-delete-set.js
/**
* @author Wayne Zhang
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_delete_set = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { ReferenceTracker } = require("@eslint-community/eslint-utils");
	/**
	* @typedef {import('@eslint-community/eslint-utils').TYPES.TraceMap} TraceMap
	*/
	/** @type {TraceMap} */
	const deletedImportApisMap = {
		set: { [ReferenceTracker.CALL]: true },
		del: { [ReferenceTracker.CALL]: true }
	};
	const deprecatedApis = new Set(["set", "delete"]);
	const deprecatedDollarApis = new Set(["$set", "$delete"]);
	/**
	* @param {Expression|Super} node
	*/
	function isVue(node) {
		return node.type === "Identifier" && node.name === "Vue";
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated `$delete` and `$set` (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-delete-set.html"
			},
			fixable: null,
			schema: [],
			messages: { deprecated: "The `$delete`, `$set` is deprecated." }
		},
		create(context) {
			/**
			* @param {Identifier} identifier
			* @param {RuleContext} context
			* @returns {CallExpression|undefined}
			*/
			function getVueDeprecatedCallExpression(identifier, context$1) {
				if (deprecatedDollarApis.has(identifier.name) && identifier.parent.type === "MemberExpression" && utils.isThis(identifier.parent.object, context$1) && identifier.parent.parent.type === "CallExpression" && identifier.parent.parent.callee === identifier.parent) return identifier.parent.parent;
				if (deprecatedApis.has(identifier.name) && identifier.parent.type === "MemberExpression" && isVue(identifier.parent.object) && identifier.parent.parent.type === "CallExpression" && identifier.parent.parent.callee === identifier.parent) return identifier.parent.parent;
			}
			const nodeVisitor = { Identifier(node) {
				if (!getVueDeprecatedCallExpression(node, context)) return;
				context.report({
					node,
					messageId: "deprecated"
				});
			} };
			return utils.compositingVisitors(utils.defineVueVisitor(context, nodeVisitor), utils.defineScriptSetupVisitor(context, nodeVisitor), { Program(node) {
				const tracker = new ReferenceTracker(utils.getScope(context, node));
				const esmTraceMap = { vue: {
					[ReferenceTracker.ESM]: true,
					...deletedImportApisMap
				} };
				const cjsTraceMap = { vue: { ...deletedImportApisMap } };
				for (const { node: node$1 } of [...tracker.iterateEsmReferences(esmTraceMap), ...tracker.iterateCjsReferences(cjsTraceMap)]) {
					const refNode = node$1;
					context.report({
						node: refNode.callee,
						messageId: "deprecated"
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_delete_set();
  }
});