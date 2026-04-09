'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-unused-refs.js
/**
* @fileoverview Disallow unused refs.
* @author Yosuke Ota
*/
var require_no_unused_refs = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Extract names from references objects.
	* @param {VReference[]} references
	*/
	function getReferences(references) {
		return references.filter((ref) => ref.variable == null).map((ref) => ref.id);
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow unused refs",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-unused-refs.html"
			},
			fixable: null,
			schema: [],
			messages: { unused: "'{{name}}' is defined as ref, but never used." }
		},
		create(context) {
			/** @type {Set<string>} */
			const usedRefs = /* @__PURE__ */ new Set();
			/** @type {VLiteral[]} */
			const defineRefs = [];
			let hasUnknown = false;
			/**
			* Report all unused refs.
			*/
			function reportUnusedRefs() {
				for (const defineRef of defineRefs) {
					if (usedRefs.has(defineRef.value)) continue;
					context.report({
						node: defineRef,
						messageId: "unused",
						data: { name: defineRef.value }
					});
				}
			}
			/**
			* Extract the use ref names for ObjectPattern.
			* @param {ObjectPattern} node
			* @returns {void}
			*/
			function extractUsedForObjectPattern(node) {
				for (const prop of node.properties) if (prop.type === "Property") {
					const name = utils.getStaticPropertyName(prop);
					if (name) usedRefs.add(name);
					else {
						hasUnknown = true;
						return;
					}
				} else {
					hasUnknown = true;
					return;
				}
			}
			/**
			* Extract the use ref names.
			* @param {Identifier | MemberExpression} refsNode
			* @returns {void}
			*/
			function extractUsedForPattern(refsNode) {
				/** @type {Identifier | MemberExpression | ChainExpression} */
				let node = refsNode;
				while (node.parent.type === "ChainExpression") node = node.parent;
				const parent = node.parent;
				switch (parent.type) {
					case "AssignmentExpression":
						if (parent.right === node) {
							if (parent.left.type === "ObjectPattern") extractUsedForObjectPattern(parent.left);
							else if (parent.left.type === "Identifier") hasUnknown = true;
						}
						break;
					case "VariableDeclarator":
						if (parent.init === node) {
							if (parent.id.type === "ObjectPattern") extractUsedForObjectPattern(parent.id);
							else if (parent.id.type === "Identifier") hasUnknown = true;
						}
						break;
					case "MemberExpression":
						if (parent.object === node) {
							const name = utils.getStaticPropertyName(parent);
							if (name) usedRefs.add(name);
							else hasUnknown = true;
						}
						break;
					case "CallExpression":
						if (parent.arguments.indexOf(node) !== -1) hasUnknown = true;
						break;
					case "ForInStatement":
					case "ReturnStatement":
						hasUnknown = true;
						break;
				}
			}
			return utils.defineTemplateBodyVisitor(context, {
				VExpressionContainer(node) {
					if (hasUnknown) return;
					for (const id of getReferences(node.references)) {
						if (id.name !== "$refs") continue;
						extractUsedForPattern(id);
					}
				},
				"VAttribute[directive=false]"(node) {
					if (hasUnknown) return;
					if (node.key.name === "ref" && node.value != null) defineRefs.push(node.value);
				},
				"VElement[parent.type!='VElement']:exit"() {
					if (hasUnknown) return;
					reportUnusedRefs();
				}
			}, utils.compositingVisitors(utils.isScriptSetup(context) ? { Program() {
				const globalScope = context.sourceCode.scopeManager.globalScope;
				if (!globalScope) return;
				for (const variable of globalScope.variables) if (variable.defs.length > 0) usedRefs.add(variable.name);
				const moduleScope = globalScope.childScopes.find((scope) => scope.type === "module");
				if (!moduleScope) return;
				for (const variable of moduleScope.variables) if (variable.defs.length > 0) usedRefs.add(variable.name);
			} } : {}, utils.defineVueVisitor(context, { onVueObjectEnter(node) {
				for (const prop of utils.iterateProperties(node, new Set(["setup"]))) usedRefs.add(prop.name);
			} }), {
				Identifier(id) {
					if (hasUnknown) return;
					if (id.name !== "$refs") return;
					/** @type {Identifier | MemberExpression} */
					let refsNode = id;
					if (id.parent.type === "MemberExpression" && id.parent.property === id) refsNode = id.parent;
					extractUsedForPattern(refsNode);
				},
				CallExpression(callExpression) {
					const firstArgument = callExpression.arguments[0];
					if (callExpression.callee.type !== "Identifier" || callExpression.callee.name !== "useTemplateRef" || !firstArgument || !utils.isStringLiteral(firstArgument)) return;
					const name = utils.getStringLiteralValue(firstArgument);
					if (name !== null) usedRefs.add(name);
				}
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_unused_refs();
  }
});