const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_scope$1 = require('../scope.js');
const require_ts_types$1 = require('./ts-types.js');

//#region lib/utils/ts-utils/ts-ast.js
var require_ts_ast = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { getScope } = require_scope$1.default;
	const { findVariable } = require("@eslint-community/eslint-utils");
	const { inferRuntimeTypeFromTypeNode } = require_ts_types$1.default;
	/**
	* @typedef {import('@typescript-eslint/types').TSESTree.TypeNode} TSESTreeTypeNode
	* @typedef {import('@typescript-eslint/types').TSESTree.TSInterfaceBody} TSESTreeTSInterfaceBody
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeLiteral} TSESTreeTSTypeLiteral
	* @typedef {import('@typescript-eslint/types').TSESTree.TSFunctionType} TSESTreeTSFunctionType
	* @typedef {import('@typescript-eslint/types').TSESTree.Parameter} TSESTreeParameter
	* @typedef {import('@typescript-eslint/types').TSESTree.Node} TSESTreeNode
	*
	*/
	/**
	* @typedef {import('../index').ComponentTypeProp} ComponentTypeProp
	* @typedef {import('../index').ComponentUnknownProp} ComponentUnknownProp
	* @typedef {import('../index').ComponentTypeEmit} ComponentTypeEmit
	* @typedef {import('../index').ComponentUnknownEmit} ComponentUnknownEmit
	* @typedef {import('../index').ComponentTypeSlot} ComponentTypeSlot
	* @typedef {import('../index').ComponentUnknownSlot} ComponentUnknownSlot
	*/
	const noop = Function.prototype;
	module.exports = {
		isTypeNode,
		flattenTypeNodes,
		isTSInterfaceBody,
		isTSTypeLiteral,
		isTSTypeLiteralOrTSFunctionType,
		extractRuntimeProps,
		extractRuntimeEmits,
		extractRuntimeSlots
	};
	/**
	* @param {ASTNode} node
	* @returns {node is TypeNode}
	*/
	function isTypeNode(node) {
		if (node.type === "TSAbstractKeyword" || node.type === "TSAnyKeyword" || node.type === "TSAsyncKeyword" || node.type === "TSArrayType" || node.type === "TSBigIntKeyword" || node.type === "TSBooleanKeyword" || node.type === "TSConditionalType" || node.type === "TSConstructorType" || node.type === "TSDeclareKeyword" || node.type === "TSExportKeyword" || node.type === "TSFunctionType" || node.type === "TSImportType" || node.type === "TSIndexedAccessType" || node.type === "TSInferType" || node.type === "TSIntersectionType" || node.type === "TSIntrinsicKeyword" || node.type === "TSLiteralType" || node.type === "TSMappedType" || node.type === "TSNamedTupleMember" || node.type === "TSNeverKeyword" || node.type === "TSNullKeyword" || node.type === "TSNumberKeyword" || node.type === "TSObjectKeyword" || node.type === "TSOptionalType" || node.type === "TSQualifiedName" || node.type === "TSPrivateKeyword" || node.type === "TSProtectedKeyword" || node.type === "TSPublicKeyword" || node.type === "TSReadonlyKeyword" || node.type === "TSRestType" || node.type === "TSStaticKeyword" || node.type === "TSStringKeyword" || node.type === "TSSymbolKeyword" || node.type === "TSTemplateLiteralType" || node.type === "TSThisType" || node.type === "TSTupleType" || node.type === "TSTypeLiteral" || node.type === "TSTypeOperator" || node.type === "TSTypePredicate" || node.type === "TSTypeQuery" || node.type === "TSTypeReference" || node.type === "TSUndefinedKeyword" || node.type === "TSUnionType" || node.type === "TSUnknownKeyword" || node.type === "TSVoidKeyword") {
			/** @type {TypeNode['type']} for type check */
			const type$1 = node.type;
			noop(type$1);
			return true;
		}
		/** @type {Exclude<ASTNode['type'], TypeNode['type']>} for type check */
		const type = node.type;
		noop(type);
		return false;
	}
	/**
	* @param {TSESTreeTypeNode|TSESTreeTSInterfaceBody} node
	* @returns {node is TSESTreeTSInterfaceBody}
	*/
	function isTSInterfaceBody(node) {
		return node.type === "TSInterfaceBody";
	}
	/**
	* @param {TSESTreeTypeNode} node
	* @returns {node is TSESTreeTSTypeLiteral}
	*/
	function isTSTypeLiteral(node) {
		return node.type === "TSTypeLiteral";
	}
	/**
	* @param {TSESTreeTypeNode} node
	* @returns {node is TSESTreeTSFunctionType}
	*/
	function isTSFunctionType(node) {
		return node.type === "TSFunctionType";
	}
	/**
	* @param {TSESTreeTypeNode} node
	* @returns {node is TSESTreeTSTypeLiteral | TSESTreeTSFunctionType}
	*/
	function isTSTypeLiteralOrTSFunctionType(node) {
		return isTSTypeLiteral(node) || isTSFunctionType(node);
	}
	/**
	* @see https://github.com/vuejs/vue-next/blob/253ca2729d808fc051215876aa4af986e4caa43c/packages/compiler-sfc/src/compileScript.ts#L1512
	* @param {RuleContext} context The ESLint rule context object.
	* @param {TSESTreeTSTypeLiteral | TSESTreeTSInterfaceBody} node
	* @returns {IterableIterator<ComponentTypeProp | ComponentUnknownProp>}
	*/
	function* extractRuntimeProps(context, node) {
		const members = node.type === "TSTypeLiteral" ? node.members : node.body;
		for (const member of members) if (member.type === "TSPropertySignature" || member.type === "TSMethodSignature") {
			if (member.key.type !== "Identifier" && member.key.type !== "Literal") {
				yield {
					type: "unknown",
					propName: null,
					node: member.key
				};
				continue;
			}
			/** @type {string[]|undefined} */
			let types;
			if (member.type === "TSMethodSignature") types = ["Function"];
			else if (member.typeAnnotation) types = inferRuntimeType(context, member.typeAnnotation.typeAnnotation);
			yield {
				type: "type",
				key: member.key,
				propName: member.key.type === "Identifier" ? member.key.name : `${member.key.value}`,
				node: member,
				required: !member.optional,
				types: types || [`null`]
			};
		}
	}
	/**
	* @param {TSESTreeTSTypeLiteral | TSESTreeTSInterfaceBody | TSESTreeTSFunctionType} node
	* @returns {IterableIterator<ComponentTypeEmit | ComponentUnknownEmit>}
	*/
	function* extractRuntimeEmits(node) {
		if (node.type === "TSFunctionType") {
			yield* extractEventNames(node.params[0], node);
			return;
		}
		const members = node.type === "TSTypeLiteral" ? node.members : node.body;
		for (const member of members) if (member.type === "TSCallSignatureDeclaration") yield* extractEventNames(member.params[0], member);
		else if (member.type === "TSPropertySignature" || member.type === "TSMethodSignature") {
			if (member.key.type !== "Identifier" && member.key.type !== "Literal") {
				yield {
					type: "unknown",
					emitName: null,
					node: member.key
				};
				continue;
			}
			yield {
				type: "type",
				key: member.key,
				emitName: member.key.type === "Identifier" ? member.key.name : `${member.key.value}`,
				node: member
			};
		}
	}
	/**
	* @param {TSESTreeTSTypeLiteral | TSESTreeTSInterfaceBody} node
	* @returns {IterableIterator<ComponentTypeSlot | ComponentUnknownSlot>}
	*/
	function* extractRuntimeSlots(node) {
		const members = node.type === "TSTypeLiteral" ? node.members : node.body;
		for (const member of members) if (member.type === "TSPropertySignature" || member.type === "TSMethodSignature") {
			if (member.key.type !== "Identifier" && member.key.type !== "Literal") {
				yield {
					type: "unknown",
					slotName: null,
					node: member.key
				};
				continue;
			}
			yield {
				type: "type",
				key: member.key,
				slotName: member.key.type === "Identifier" ? member.key.name : `${member.key.value}`,
				node: member
			};
		}
	}
	/**
	* @param {TSESTreeParameter} eventName
	* @param {TSCallSignatureDeclaration | TSFunctionType} member
	* @returns {IterableIterator<ComponentTypeEmit>}
	*/
	function* extractEventNames(eventName, member) {
		if (eventName && eventName.type === "Identifier" && eventName.typeAnnotation && eventName.typeAnnotation.type === "TSTypeAnnotation") {
			const typeNode = eventName.typeAnnotation.typeAnnotation;
			if (typeNode.type === "TSLiteralType" && typeNode.literal.type === "Literal") yield {
				type: "type",
				key: typeNode,
				emitName: String(typeNode.literal.value),
				node: member
			};
			else if (typeNode.type === "TSUnionType") {
				for (const t of typeNode.types) if (t.type === "TSLiteralType" && t.literal.type === "Literal") yield {
					type: "type",
					key: t,
					emitName: String(t.literal.value),
					node: member
				};
			}
		}
	}
	/**
	* @param {RuleContext} context The ESLint rule context object.
	* @param {TSESTreeTypeNode} node
	* @returns {(TSESTreeTypeNode|TSESTreeTSInterfaceBody)[]}
	*/
	function flattenTypeNodes(context, node) {
		/**
		* @typedef {object} TraversedData
		* @property {Set<TSESTreeTypeNode|TSESTreeTSInterfaceBody>} nodes
		* @property {boolean} finished
		*/
		/** @type {Map<TSESTreeTypeNode,TraversedData>} */
		const traversed = /* @__PURE__ */ new Map();
		return [...flattenImpl(node)];
		/**
		* @param {TSESTreeTypeNode} node
		* @returns {Iterable<TSESTreeTypeNode|TSESTreeTSInterfaceBody>}
		*/
		function* flattenImpl(node$1) {
			if (node$1.type === "TSUnionType" || node$1.type === "TSIntersectionType") {
				for (const typeNode of node$1.types) yield* flattenImpl(typeNode);
				return;
			}
			if (node$1.type === "TSTypeReference" && node$1.typeName.type === "Identifier") {
				const refName = node$1.typeName.name;
				const variable = findVariable(getScope(context, node$1), refName);
				if (variable && variable.defs.length === 1) {
					const defNode = variable.defs[0].node;
					if (defNode.type === "TSInterfaceDeclaration") {
						yield defNode.body;
						return;
					} else if (defNode.type === "TSTypeAliasDeclaration") {
						const typeAnnotation = defNode.typeAnnotation;
						let traversedData = traversed.get(typeAnnotation);
						if (traversedData) {
							yield* [...traversedData.nodes];
							if (!traversedData.finished) yield typeAnnotation;
							return;
						}
						traversedData = {
							nodes: /* @__PURE__ */ new Set(),
							finished: false
						};
						traversed.set(typeAnnotation, traversedData);
						for (const e of flattenImpl(typeAnnotation)) traversedData.nodes.add(e);
						traversedData.finished = true;
						yield* traversedData.nodes;
						return;
					}
				}
			}
			yield node$1;
		}
	}
	/**
	* @param {RuleContext} context The ESLint rule context object.
	* @param {TSESTreeTypeNode} node
	* @param {Set<TSESTreeTypeNode>} [checked]
	* @returns {string[]}
	*/
	function inferRuntimeType(context, node, checked = /* @__PURE__ */ new Set()) {
		switch (node.type) {
			case "TSStringKeyword":
			case "TSTemplateLiteralType": return ["String"];
			case "TSNumberKeyword": return ["Number"];
			case "TSBooleanKeyword": return ["Boolean"];
			case "TSObjectKeyword": return ["Object"];
			case "TSTypeLiteral": return inferTypeLiteralType(node);
			case "TSFunctionType": return ["Function"];
			case "TSArrayType":
			case "TSTupleType": return ["Array"];
			case "TSSymbolKeyword": return ["Symbol"];
			case "TSLiteralType":
				if (node.literal.type === "Literal") switch (typeof node.literal.value) {
					case "boolean": return ["Boolean"];
					case "string": return ["String"];
					case "number":
					case "bigint": return ["Number"];
				}
				return inferRuntimeTypeFromTypeNode(context, node);
			case "TSTypeReference":
				if (node.typeName.type === "Identifier") {
					const variable = findVariable(getScope(context, node), node.typeName.name);
					if (variable && variable.defs.length === 1) {
						const defNode = variable.defs[0].node;
						if (defNode.type === "TSInterfaceDeclaration") return [`Object`];
						if (defNode.type === "TSTypeAliasDeclaration") {
							const typeAnnotation = defNode.typeAnnotation;
							if (!checked.has(typeAnnotation)) {
								checked.add(typeAnnotation);
								return inferRuntimeType(context, typeAnnotation, checked);
							}
						}
						if (defNode.type === "TSEnumDeclaration") return inferEnumType(context, defNode);
					}
					for (const name of [node.typeName.name, ...node.typeName.name.startsWith("Readonly") ? [node.typeName.name.slice(8)] : []]) switch (name) {
						case "Array":
						case "Function":
						case "Object":
						case "Set":
						case "Map":
						case "WeakSet":
						case "WeakMap":
						case "Date": return [name];
					}
					switch (node.typeName.name) {
						case "Record":
						case "Partial":
						case "Readonly":
						case "Pick":
						case "Omit":
						case "Required":
						case "InstanceType": return ["Object"];
						case "Uppercase":
						case "Lowercase":
						case "Capitalize":
						case "Uncapitalize": return ["String"];
						case "Parameters":
						case "ConstructorParameters": return ["Array"];
						case "NonNullable": {
							const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
							if (typeArguments && typeArguments.params[0]) return inferRuntimeType(context, typeArguments.params[0], checked).filter((t) => t !== "null");
							break;
						}
						case "Extract": {
							const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
							if (typeArguments && typeArguments.params[1]) return inferRuntimeType(context, typeArguments.params[1], checked);
							break;
						}
						case "Exclude":
						case "OmitThisParameter": {
							const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
							if (typeArguments && typeArguments.params[0]) return inferRuntimeType(context, typeArguments.params[0], checked);
							break;
						}
					}
				}
				return inferRuntimeTypeFromTypeNode(context, node);
			case "TSUnionType":
			case "TSIntersectionType": return inferUnionType(node);
			default: return inferRuntimeTypeFromTypeNode(context, node);
		}
		/**
		* @param {import('@typescript-eslint/types').TSESTree.TSUnionType|import('@typescript-eslint/types').TSESTree.TSIntersectionType} node
		* @returns {string[]}
		*/
		function inferUnionType(node$1) {
			const types = /* @__PURE__ */ new Set();
			for (const t of node$1.types) for (const tt of inferRuntimeType(context, t, checked)) types.add(tt);
			return [...types];
		}
	}
	/**
	* @param {import('@typescript-eslint/types').TSESTree.TSTypeLiteral} node
	* @returns {string[]}
	*/
	function inferTypeLiteralType(node) {
		const types = /* @__PURE__ */ new Set();
		for (const m of node.members) switch (m.type) {
			case "TSCallSignatureDeclaration":
			case "TSConstructSignatureDeclaration":
				types.add("Function");
				break;
			default: types.add("Object");
		}
		return types.size > 0 ? [...types] : ["Object"];
	}
	/**
	* @param {RuleContext} context The ESLint rule context object.
	* @param {import('@typescript-eslint/types').TSESTree.TSEnumDeclaration} node
	* @returns {string[]}
	*/
	function inferEnumType(context, node) {
		const types = /* @__PURE__ */ new Set();
		for (const m of node.members) if (m.initializer) if (m.initializer.type === "Literal") switch (typeof m.initializer.value) {
			case "string":
				types.add("String");
				break;
			case "number":
			case "bigint":
				types.add("Number");
				break;
			case "boolean":
				types.add("Boolean");
				break;
		}
		else for (const type of inferRuntimeTypeFromTypeNode(context, m.initializer)) types.add(type);
		return types.size > 0 ? [...types] : ["Number"];
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_ts_ast();
  }
});