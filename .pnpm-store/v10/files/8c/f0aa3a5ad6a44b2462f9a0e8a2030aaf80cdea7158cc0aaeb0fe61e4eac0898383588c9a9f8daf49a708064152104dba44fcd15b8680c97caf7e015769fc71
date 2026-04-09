'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/require-explicit-emits.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_require_explicit_emits = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	/**
	* @typedef {import('../utils').ComponentEmit} ComponentEmit
	* @typedef {import('../utils').ComponentProp} ComponentProp
	* @typedef {import('../utils').VueObjectData} VueObjectData
	*/
	const { findVariable, isOpeningBraceToken, isClosingBraceToken, isOpeningBracketToken } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	const { capitalize } = require_casing$1.default;
	const FIX_EMITS_AFTER_OPTIONS = new Set([
		"setup",
		"data",
		"computed",
		"watch",
		"methods",
		"template",
		"render",
		"renderError",
		"beforeCreate",
		"created",
		"beforeMount",
		"mounted",
		"beforeUpdate",
		"updated",
		"activated",
		"deactivated",
		"beforeUnmount",
		"unmounted",
		"beforeDestroy",
		"destroyed",
		"renderTracked",
		"renderTriggered",
		"errorCaptured"
	]);
	/**
	* @typedef {object} NameWithLoc
	* @property {string} name
	* @property {SourceLocation} loc
	* @property {Range} range
	*/
	/**
	* Get the name param node from the given CallExpression
	* @param {CallExpression} node CallExpression
	* @returns { NameWithLoc | null }
	*/
	function getNameParamNode(node) {
		const nameLiteralNode = node.arguments[0];
		if (nameLiteralNode && utils.isStringLiteral(nameLiteralNode)) {
			const name = utils.getStringLiteralValue(nameLiteralNode);
			if (name != null) return {
				name,
				loc: nameLiteralNode.loc,
				range: nameLiteralNode.range
			};
		}
		return null;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require `emits` option with name triggered by `$emit()`",
				categories: ["vue3-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/require-explicit-emits.html"
			},
			fixable: null,
			hasSuggestions: true,
			schema: [{
				type: "object",
				properties: { allowProps: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				missing: "The \"{{name}}\" event has been triggered but not declared on {{emitsKind}}.",
				addOneOption: "Add the \"{{name}}\" to {{emitsKind}}.",
				addArrayEmitsOption: "Add the {{emitsKind}} with array syntax and define \"{{name}}\" event.",
				addObjectEmitsOption: "Add the {{emitsKind}} with object syntax and define \"{{name}}\" event."
			}
		},
		create(context) {
			const allowProps = !!(context.options[0] || {}).allowProps;
			/** @type {Map<ObjectExpression | Program, { contextReferenceIds: Set<Identifier>, emitReferenceIds: Set<Identifier> }>} */
			const setupContexts = /* @__PURE__ */ new Map();
			/** @type {Map<ObjectExpression | Program, ComponentEmit[]>} */
			const vueEmitsDeclarations = /* @__PURE__ */ new Map();
			/** @type {Map<ObjectExpression | Program, ComponentProp[]>} */
			const vuePropsDeclarations = /* @__PURE__ */ new Map();
			let emitParamName = "";
			/**
			* @typedef {object} VueTemplateDefineData
			* @property {'export' | 'mark' | 'definition' | 'setup'} type
			* @property {ObjectExpression | Program} define
			* @property {ComponentEmit[]} emits
			* @property {ComponentProp[]} props
			* @property {CallExpression} [defineEmits]
			*/
			/** @type {VueTemplateDefineData | null} */
			let vueTemplateDefineData = null;
			/**
			* @param {ComponentEmit[]} emits
			* @param {ComponentProp[]} props
			* @param {NameWithLoc} nameWithLoc
			* @param {ObjectExpression | Program} vueDefineNode
			*/
			function verifyEmit(emits, props, nameWithLoc, vueDefineNode) {
				const name = nameWithLoc.name;
				if (emits.some((e) => e.emitName === name || e.emitName == null)) return;
				if (allowProps) {
					const key = `on${capitalize(name)}`;
					if (props.some((e) => e.propName === key || e.propName == null)) return;
				}
				context.report({
					loc: nameWithLoc.loc,
					messageId: "missing",
					data: {
						name,
						emitsKind: vueDefineNode.type === "ObjectExpression" ? "`emits` option" : "`defineEmits`"
					},
					suggest: buildSuggest(vueDefineNode, emits, nameWithLoc, context)
				});
			}
			const programNode = context.sourceCode.ast;
			if (utils.isScriptSetup(context)) vueTemplateDefineData = {
				type: "setup",
				define: programNode,
				emits: [],
				props: []
			};
			const callVisitor = { CallExpression(node, info) {
				const callee = utils.skipChainExpression(node.callee);
				const nameWithLoc = getNameParamNode(node);
				if (!nameWithLoc) return;
				const vueDefineNode = info ? info.node : programNode;
				const emitsDeclarations = vueEmitsDeclarations.get(vueDefineNode);
				if (!emitsDeclarations) return;
				let emit;
				if (callee.type === "MemberExpression") {
					const name = utils.getStaticPropertyName(callee);
					if (name === "emit" || name === "$emit") emit = {
						name,
						member: callee
					};
				}
				const setupContext = setupContexts.get(vueDefineNode);
				if (setupContext) {
					const { contextReferenceIds, emitReferenceIds } = setupContext;
					if (callee.type === "Identifier" && emitReferenceIds.has(callee)) verifyEmit(emitsDeclarations, vuePropsDeclarations.get(vueDefineNode) || [], nameWithLoc, vueDefineNode);
					else if (emit && emit.name === "emit") {
						const memObject = utils.skipChainExpression(emit.member.object);
						if (memObject.type === "Identifier" && contextReferenceIds.has(memObject)) verifyEmit(emitsDeclarations, vuePropsDeclarations.get(vueDefineNode) || [], nameWithLoc, vueDefineNode);
					}
				}
				if (emit && emit.name === "$emit") {
					const memObject = utils.skipChainExpression(emit.member.object);
					if (utils.isThis(memObject, context)) verifyEmit(emitsDeclarations, vuePropsDeclarations.get(vueDefineNode) || [], nameWithLoc, vueDefineNode);
				}
			} };
			return utils.defineTemplateBodyVisitor(context, { CallExpression(node) {
				const callee = utils.skipChainExpression(node.callee);
				const nameWithLoc = getNameParamNode(node);
				if (!nameWithLoc) return;
				if (!vueTemplateDefineData) return;
				if (callee.type === "Identifier" && (callee.name === "$emit" || callee.name === emitParamName)) verifyEmit(vueTemplateDefineData.emits, vueTemplateDefineData.props, nameWithLoc, vueTemplateDefineData.define);
			} }, utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
				onDefineEmitsEnter(node, emits) {
					vueEmitsDeclarations.set(programNode, emits);
					if (vueTemplateDefineData && vueTemplateDefineData.type === "setup") {
						vueTemplateDefineData.emits = emits;
						vueTemplateDefineData.defineEmits = node;
					}
					if (!node.parent || node.parent.type !== "VariableDeclarator" || node.parent.init !== node) return;
					const emitParam = node.parent.id;
					if (emitParam.type !== "Identifier") return;
					emitParamName = emitParam.name;
					const variable = findVariable(utils.getScope(context, emitParam), emitParam);
					if (!variable) return;
					/** @type {Set<Identifier>} */
					const emitReferenceIds = /* @__PURE__ */ new Set();
					for (const reference of variable.references) {
						if (!reference.isRead()) continue;
						emitReferenceIds.add(reference.identifier);
					}
					setupContexts.set(programNode, {
						contextReferenceIds: /* @__PURE__ */ new Set(),
						emitReferenceIds
					});
				},
				onDefinePropsEnter(_node, props) {
					if (allowProps) {
						vuePropsDeclarations.set(programNode, props);
						if (vueTemplateDefineData && vueTemplateDefineData.type === "setup") vueTemplateDefineData.props = props;
					}
				},
				...callVisitor
			}), utils.defineVueVisitor(context, {
				onVueObjectEnter(node) {
					vueEmitsDeclarations.set(node, utils.getComponentEmitsFromOptions(node));
					if (allowProps) vuePropsDeclarations.set(node, utils.getComponentPropsFromOptions(node));
				},
				onSetupFunctionEnter(node, { node: vueNode }) {
					const contextParam = node.params[1];
					if (!contextParam) return;
					if (contextParam.type === "RestElement") return;
					if (contextParam.type === "ArrayPattern") return;
					/** @type {Set<Identifier>} */
					const contextReferenceIds = /* @__PURE__ */ new Set();
					/** @type {Set<Identifier>} */
					const emitReferenceIds = /* @__PURE__ */ new Set();
					if (contextParam.type === "ObjectPattern") {
						const emitProperty = utils.findAssignmentProperty(contextParam, "emit");
						if (!emitProperty) return;
						const emitParam = emitProperty.value;
						const variable = emitParam.type === "Identifier" ? findVariable(utils.getScope(context, emitParam), emitParam) : null;
						if (!variable) return;
						for (const reference of variable.references) {
							if (!reference.isRead()) continue;
							emitReferenceIds.add(reference.identifier);
						}
					} else if (contextParam.type === "Identifier") {
						const variable = findVariable(utils.getScope(context, contextParam), contextParam);
						if (!variable) return;
						for (const reference of variable.references) {
							if (!reference.isRead()) continue;
							contextReferenceIds.add(reference.identifier);
						}
					}
					setupContexts.set(vueNode, {
						contextReferenceIds,
						emitReferenceIds
					});
				},
				...callVisitor,
				onVueObjectExit(node, { type }) {
					const emits = vueEmitsDeclarations.get(node);
					if ((!vueTemplateDefineData || vueTemplateDefineData.type !== "export" && vueTemplateDefineData.type !== "setup") && emits && (type === "mark" || type === "export" || type === "definition")) vueTemplateDefineData = {
						type,
						define: node,
						emits,
						props: vuePropsDeclarations.get(node) || []
					};
					setupContexts.delete(node);
					vueEmitsDeclarations.delete(node);
					vuePropsDeclarations.delete(node);
				}
			})));
		}
	};
	/**
	* @param {ObjectExpression|Program} define
	* @param {ComponentEmit[]} emits
	* @param {NameWithLoc} nameWithLoc
	* @param {RuleContext} context
	* @returns {Rule.SuggestionReportDescriptor[]}
	*/
	function buildSuggest(define, emits, nameWithLoc, context) {
		const emitsKind = define.type === "ObjectExpression" ? "`emits` option" : "`defineEmits`";
		const lastEmit = emits.filter(
			/** @returns {e is ComponentEmit & {type:'array'|'object'}} */
			(e) => e.type === "array" || e.type === "object"
		).at(-1);
		if (lastEmit) return [{
			messageId: "addOneOption",
			data: {
				name: nameWithLoc.name,
				emitsKind
			},
			fix(fixer) {
				if (lastEmit.type === "array") return fixer.insertTextAfter(lastEmit.node, `, '${nameWithLoc.name}'`);
				else if (lastEmit.type === "object") return fixer.insertTextAfter(lastEmit.node, `, '${nameWithLoc.name}': null`);
				else return null;
			}
		}];
		if (define.type !== "ObjectExpression") return [];
		const object = define;
		const propertyNodes = object.properties.filter(utils.isProperty);
		const emitsOption = propertyNodes.find((p) => utils.getStaticPropertyName(p) === "emits");
		if (emitsOption) {
			const sourceCode$1 = context.sourceCode;
			const emitsOptionValue = emitsOption.value;
			if (emitsOptionValue.type === "ArrayExpression") {
				const leftBracket = sourceCode$1.getFirstToken(emitsOptionValue, isOpeningBracketToken);
				return [{
					messageId: "addOneOption",
					data: {
						name: `${nameWithLoc.name}`,
						emitsKind
					},
					fix(fixer) {
						return fixer.insertTextAfter(leftBracket, `'${nameWithLoc.name}'${emitsOptionValue.elements.length > 0 ? "," : ""}`);
					}
				}];
			} else if (emitsOptionValue.type === "ObjectExpression") {
				const leftBrace = sourceCode$1.getFirstToken(emitsOptionValue, isOpeningBraceToken);
				return [{
					messageId: "addOneOption",
					data: {
						name: `${nameWithLoc.name}`,
						emitsKind
					},
					fix(fixer) {
						return fixer.insertTextAfter(leftBrace, `'${nameWithLoc.name}': null${emitsOptionValue.properties.length > 0 ? "," : ""}`);
					}
				}];
			}
			return [];
		}
		const sourceCode = context.sourceCode;
		const afterOptionNode = propertyNodes.find((p) => FIX_EMITS_AFTER_OPTIONS.has(utils.getStaticPropertyName(p) || ""));
		return [{
			messageId: "addArrayEmitsOption",
			data: {
				name: `${nameWithLoc.name}`,
				emitsKind
			},
			fix(fixer) {
				if (afterOptionNode) return fixer.insertTextAfter(sourceCode.getTokenBefore(afterOptionNode), `\nemits: ['${nameWithLoc.name}'],`);
				const lastPropertyNode = object.properties.at(-1);
				if (lastPropertyNode) {
					const before = propertyNodes.at(-1) || lastPropertyNode;
					return fixer.insertTextAfter(before, `,\nemits: ['${nameWithLoc.name}']`);
				} else {
					const objectLeftBrace = sourceCode.getFirstToken(object, isOpeningBraceToken);
					const objectRightBrace = sourceCode.getLastToken(object, isClosingBraceToken);
					return fixer.insertTextAfter(objectLeftBrace, `\nemits: ['${nameWithLoc.name}']${objectLeftBrace.loc.end.line < objectRightBrace.loc.start.line ? "" : "\n"}`);
				}
			}
		}, {
			messageId: "addObjectEmitsOption",
			data: {
				name: `${nameWithLoc.name}`,
				emitsKind
			},
			fix(fixer) {
				if (afterOptionNode) return fixer.insertTextAfter(sourceCode.getTokenBefore(afterOptionNode), `\nemits: {'${nameWithLoc.name}': null},`);
				const lastPropertyNode = object.properties.at(-1);
				if (lastPropertyNode) {
					const before = propertyNodes.at(-1) || lastPropertyNode;
					return fixer.insertTextAfter(before, `,\nemits: {'${nameWithLoc.name}': null}`);
				} else {
					const objectLeftBrace = sourceCode.getFirstToken(object, isOpeningBraceToken);
					const objectRightBrace = sourceCode.getLastToken(object, isClosingBraceToken);
					return fixer.insertTextAfter(objectLeftBrace, `\nemits: {'${nameWithLoc.name}': null}${objectLeftBrace.loc.end.line < objectRightBrace.loc.start.line ? "" : "\n"}`);
				}
			}
		}];
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_explicit_emits();
  }
});