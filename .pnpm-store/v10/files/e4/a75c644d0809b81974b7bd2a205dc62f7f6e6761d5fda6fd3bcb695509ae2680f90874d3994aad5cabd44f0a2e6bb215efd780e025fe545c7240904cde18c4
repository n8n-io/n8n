const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');

//#region lib/utils/scope.js
var require_scope = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = { getScope };
	/**
	* Gets the scope for the current node
	* @param {RuleContext} context The rule context
	* @param {ESNode} currentNode The node to get the scope of
	* @returns { import('eslint').Scope.Scope } The scope information for this node
	*/
	function getScope(context, currentNode) {
		const inner = currentNode.type !== "Program";
		const scopeManager = context.sourceCode.scopeManager;
		/** @type {ESNode | null} */
		let node = currentNode;
		for (; node; node = node.parent) {
			const scope = scopeManager.acquire(node, inner);
			if (scope) {
				if (scope.type === "function-expression-name") return scope.childScopes[0];
				return scope;
			}
		}
		return scopeManager.scopes[0];
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_scope();
  }
});