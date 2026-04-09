'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-restricted-call-after-await.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_restricted_call_after_await = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const fs = require("node:fs");
	const path = require("node:path");
	const { ReferenceTracker } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {import('@eslint-community/eslint-utils').TYPES.TraceMap} TraceMap
	* @typedef {import('@eslint-community/eslint-utils').TYPES.TraceKind} TraceKind
	*/
	/**
	* @param {string} id
	*/
	function safeRequireResolve(id) {
		try {
			if (fs.statSync(id).isDirectory()) return require.resolve(id);
		} catch {}
		return id;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow asynchronously called restricted methods",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-call-after-await.html"
			},
			fixable: null,
			schema: {
				type: "array",
				items: {
					type: "object",
					properties: {
						module: { type: "string" },
						path: { oneOf: [{ type: "string" }, {
							type: "array",
							items: { type: "string" }
						}] },
						message: {
							type: "string",
							minLength: 1
						}
					},
					required: ["module"],
					additionalProperties: false
				},
				uniqueItems: true,
				minItems: 0
			},
			messages: { restricted: "{{message}}" }
		},
		create(context) {
			/**
			* @typedef {object} SetupScopeData
			* @property {boolean} afterAwait
			* @property {[number,number]} range
			*/
			/** @type {Map<ESNode, string>} */
			const restrictedCallNodes = /* @__PURE__ */ new Map();
			/** @type {Map<FunctionExpression | ArrowFunctionExpression | FunctionDeclaration, SetupScopeData>} */
			const setupScopes = /* @__PURE__ */ new Map();
			/**x
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} scopeNode
			*/
			/** @type {ScopeStack | null} */
			let scopeStack = null;
			/** @type {Record<string, string[]> | null} */
			let allLocalImports = null;
			/**
			* @param {Program} ast
			*/
			function getAllLocalImports(ast) {
				if (!allLocalImports) {
					allLocalImports = {};
					const dir = path.dirname(context.filename);
					for (const body of ast.body) {
						if (body.type !== "ImportDeclaration") continue;
						const source = String(body.source.value);
						if (!source.startsWith(".")) continue;
						const modulePath = safeRequireResolve(path.join(dir, source));
						(allLocalImports[modulePath] || (allLocalImports[modulePath] = [])).push(source);
					}
				}
				return allLocalImports;
			}
			/**
			* @param {string} moduleName
			* @param {Program} ast
			* @returns {string[]}
			*/
			function normalizeModules(moduleName, ast) {
				/** @type {string} */
				let modulePath;
				if (moduleName.startsWith(".")) modulePath = safeRequireResolve(path.join(context.cwd, moduleName));
				else if (path.isAbsolute(moduleName)) modulePath = safeRequireResolve(moduleName);
				else return [moduleName];
				return getAllLocalImports(ast)[modulePath] || [];
			}
			return utils.compositingVisitors({ Program(node) {
				const tracker = new ReferenceTracker(utils.getScope(context, node));
				for (const option of context.options) {
					const modules = normalizeModules(option.module, node);
					for (const module$1 of modules) {
						/** @type {TraceMap} */
						const traceMap = { [module$1]: { [ReferenceTracker.ESM]: true } };
						let local = traceMap[module$1];
						const paths = Array.isArray(option.path) ? option.path : [option.path || "default"];
						for (const path$1 of paths) local = local[path$1] || (local[path$1] = {});
						local[ReferenceTracker.CALL] = true;
						const message = option.message || `\`${[`import("${module$1}")`, ...paths].join(".")}\` is forbidden after an \`await\` expression.`;
						for (const { node: node$1 } of tracker.iterateEsmReferences(traceMap)) restrictedCallNodes.set(node$1, message);
					}
				}
			} }, utils.defineVueVisitor(context, {
				onSetupFunctionEnter(node) {
					setupScopes.set(node, {
						afterAwait: false,
						range: node.range
					});
				},
				":function"(node) {
					scopeStack = {
						upper: scopeStack,
						scopeNode: node
					};
				},
				":function:exit"() {
					scopeStack = scopeStack && scopeStack.upper;
				},
				AwaitExpression(node) {
					if (!scopeStack) return;
					const setupScope = setupScopes.get(scopeStack.scopeNode);
					if (!setupScope || !utils.inRange(setupScope.range, node)) return;
					setupScope.afterAwait = true;
				},
				CallExpression(node) {
					if (!scopeStack) return;
					const setupScope = setupScopes.get(scopeStack.scopeNode);
					if (!setupScope || !setupScope.afterAwait || !utils.inRange(setupScope.range, node)) return;
					const message = restrictedCallNodes.get(node);
					if (message) context.report({
						node,
						messageId: "restricted",
						data: { message }
					});
				},
				onSetupFunctionExit(node) {
					setupScopes.delete(node);
				}
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_restricted_call_after_await();
  }
});