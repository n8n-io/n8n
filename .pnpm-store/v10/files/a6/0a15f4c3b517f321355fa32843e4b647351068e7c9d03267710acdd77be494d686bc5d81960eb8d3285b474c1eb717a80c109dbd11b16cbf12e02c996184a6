'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_scope$1 = require('./scope.js');
const require_html_elements$1 = require('./html-elements.js');
const require_svg_elements$1 = require('./svg-elements.js');
const require_math_elements$1 = require('./math-elements.js');
const require_void_elements$1 = require('./void-elements.js');
const require_vue2_builtin_components$1 = require('./vue2-builtin-components.js');
const require_vue3_builtin_components$1 = require('./vue3-builtin-components.js');
const require_vue_builtin_elements$1 = require('./vue-builtin-elements.js');
const require_index = require('./ts-utils/index.js');

//#region lib/utils/index.js
/**
* @author Toru Nagashima <https://github.com/mysticatea>
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_utils = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { getScope } = require_scope$1.default;
	/**
	* @typedef {import('eslint').Rule.RuleModule} RuleModule
	* @typedef {import('estree').Position} Position
	* @typedef {import('eslint').Rule.CodePath} CodePath
	* @typedef {import('eslint').Rule.CodePathSegment} CodePathSegment
	*/
	/**
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentArrayProp} ComponentArrayProp
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentObjectProp} ComponentObjectProp
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentTypeProp} ComponentTypeProp
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentInferTypeProp} ComponentInferTypeProp
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentUnknownProp} ComponentUnknownProp
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentProp} ComponentProp
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentArrayEmit} ComponentArrayEmit
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentObjectEmit} ComponentObjectEmit
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentTypeEmit} ComponentTypeEmit
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentInferTypeEmit} ComponentInferTypeEmit
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentUnknownEmit} ComponentUnknownEmit
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentEmit} ComponentEmit
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentTypeSlot} ComponentTypeSlot
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentInferTypeSlot} ComponentInferTypeSlot
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentUnknownSlot} ComponentUnknownSlot
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentSlot} ComponentSlot
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentModelName} ComponentModelName
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ComponentModel} ComponentModel
	*/
	/**
	* @typedef { {key: string | null, value: BlockStatement | null} } ComponentComputedProperty
	*/
	/**
	* @typedef { 'props' | 'asyncData' | 'data' | 'computed' | 'setup' | 'watch' | 'methods' | 'provide' | 'inject' | 'expose' } GroupName
	* @typedef { { type: 'array',  name: string, groupName: GroupName, node: Literal | TemplateLiteral } } ComponentArrayPropertyData
	* @typedef { { type: 'object', name: string, groupName: GroupName, node: Identifier | Literal | TemplateLiteral, property: Property } } ComponentObjectPropertyData
	* @typedef { ComponentArrayPropertyData | ComponentObjectPropertyData } ComponentPropertyData
	*/
	/**
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').VueObjectType} VueObjectType
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').VueObjectData} VueObjectData
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').VueVisitor} VueVisitor
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/utils').ScriptSetupVisitor} ScriptSetupVisitor
	*/
	const HTML_ELEMENT_NAMES = new Set(require_html_elements$1.default);
	const SVG_ELEMENT_NAMES = new Set(require_svg_elements$1.default);
	const MATH_ELEMENT_NAMES = new Set(require_math_elements$1.default);
	const VOID_ELEMENT_NAMES = new Set(require_void_elements$1.default);
	const VUE2_BUILTIN_COMPONENT_NAMES = new Set(require_vue2_builtin_components$1.default);
	const VUE3_BUILTIN_COMPONENT_NAMES = new Set(require_vue3_builtin_components$1.default);
	const VUE_BUILTIN_ELEMENT_NAMES = new Set(require_vue_builtin_elements$1.default);
	const { createRequire } = require("node:module");
	const path = require("node:path");
	const { traverseNodes, getFallbackKeys, NS } = require("vue-eslint-parser").AST;
	const { findVariable, ReferenceTracker } = require("@eslint-community/eslint-utils");
	const { getComponentPropsFromTypeDefine, getComponentEmitsFromTypeDefine, getComponentSlotsFromTypeDefine, isTypeNode } = require_index.default;
	/**
	* @type { WeakMap<RuleContext, Token[]> }
	*/
	const componentComments = /* @__PURE__ */ new WeakMap();
	/** @type { Map<string, RuleModule> | null } */
	let coreRuleMap = null;
	/** @type { Map<string, RuleModule> } */
	const stylisticRuleMap = /* @__PURE__ */ new Map();
	/**
	* Get the core rule implementation from the rule name
	* @param {string} name
	* @returns {RuleModule | null}
	*/
	function getCoreRule(name) {
		const eslint = require("eslint");
		try {
			return (coreRuleMap || (coreRuleMap = new eslint.Linter().getRules())).get(name) || null;
		} catch {}
		const { builtinRules } = require("eslint/use-at-your-own-risk");
		return builtinRules.get(name) || null;
	}
	/**
	* Get ESLint Stylistic rule implementation from the rule name
	* @param {string} name
	* @param {'@stylistic/eslint-plugin' | '@stylistic/eslint-plugin-ts' | '@stylistic/eslint-plugin-js'} [preferModule]
	* @returns {RuleModule | null}
	*/
	function getStylisticRule(name, preferModule) {
		if (!preferModule) {
			const cached = stylisticRuleMap.get(name);
			if (cached) return cached;
		}
		const stylisticPluginNames = [
			"@stylistic/eslint-plugin",
			"@stylistic/eslint-plugin-ts",
			"@stylistic/eslint-plugin-js"
		];
		if (preferModule) stylisticPluginNames.unshift(preferModule);
		for (const stylisticPluginName of stylisticPluginNames) try {
			const rule = createRequire(`${process.cwd()}/__placeholder__.js`)(stylisticPluginName)?.rules?.[name];
			if (!preferModule) stylisticRuleMap.set(name, rule);
			return rule;
		} catch {}
		return null;
	}
	/**
	* @template {object} T
	* @param {T} target
	* @param {Partial<T>[]} propsArray
	* @returns {T}
	*/
	function newProxy(target, ...propsArray) {
		return new Proxy({}, {
			get(_object, key) {
				for (const props of propsArray) if (key in props) return props[key];
				return target[key];
			},
			has(_object, key) {
				return key in target;
			},
			ownKeys(_object) {
				return Reflect.ownKeys(target);
			},
			getPrototypeOf(_object) {
				return Reflect.getPrototypeOf(target);
			}
		});
	}
	/**
	* Wrap the rule context object to override methods which access to tokens (such as getTokenAfter).
	* @param {RuleContext} context The rule context object.
	* @param {ParserServices.TokenStore} tokenStore The token store object for template.
	* @param {Object} options The option of this rule.
	* @param {boolean} [options.applyDocument] If `true`, apply check to document fragment.
	* @returns {RuleContext}
	*/
	function wrapContextToOverrideTokenMethods(context, tokenStore, options) {
		const eslintSourceCode = context.sourceCode;
		const rootNode = options.applyDocument ? eslintSourceCode.parserServices.getDocumentFragment && eslintSourceCode.parserServices.getDocumentFragment() : eslintSourceCode.ast.templateBody;
		/** @type {Token[] | null} */
		let tokensAndComments = null;
		function getTokensAndComments() {
			if (tokensAndComments) return tokensAndComments;
			tokensAndComments = rootNode ? tokenStore.getTokens(rootNode, { includeComments: true }) : [];
			return tokensAndComments;
		}
		/** @param {number} index */
		function getNodeByRangeIndex(index) {
			if (!rootNode) return eslintSourceCode.ast;
			/** @type {ASTNode} */
			let result = eslintSourceCode.ast;
			/** @type {ASTNode[]} */
			const skipNodes = [];
			let breakFlag = false;
			traverseNodes(rootNode, {
				enterNode(node, parent) {
					if (breakFlag) return;
					if (skipNodes[0] === parent) {
						skipNodes.unshift(node);
						return;
					}
					if (node.range[0] <= index && index < node.range[1]) result = node;
					else skipNodes.unshift(node);
				},
				leaveNode(node) {
					if (breakFlag) return;
					if (result === node) breakFlag = true;
					else if (skipNodes[0] === node) skipNodes.shift();
				}
			});
			return result;
		}
		const sourceCode = newProxy(eslintSourceCode, {
			get tokensAndComments() {
				return getTokensAndComments();
			},
			getNodeByRangeIndex,
			getDeclaredVariables
		}, tokenStore);
		/** @type {WeakMap<ASTNode, import('eslint').Scope.ScopeManager>} */
		const containerScopes = /* @__PURE__ */ new WeakMap();
		/**
		* @param {ASTNode} node
		* @returns {import('eslint').Scope.ScopeManager|null}
		*/
		function getContainerScope(node) {
			const exprContainer = getVExpressionContainer(node);
			if (!exprContainer) return null;
			const cache = containerScopes.get(exprContainer);
			if (cache) return cache;
			const programNode = eslintSourceCode.ast;
			const parserOptions = context.languageOptions?.parserOptions ?? context.parserOptions ?? {};
			const ecmaFeatures = parserOptions.ecmaFeatures || {};
			const ecmaVersion = context.languageOptions?.ecmaVersion ?? parserOptions.ecmaVersion ?? 2020;
			const sourceType = programNode.sourceType;
			try {
				const eslintScope = createRequire(require.resolve("eslint"))("eslint-scope");
				const scopeProgram = newProxy(programNode, { body: [newProxy(exprContainer, { type: "ExpressionStatement" })] });
				const scope = eslintScope.analyze(scopeProgram, {
					ignoreEval: true,
					nodejsScope: false,
					impliedStrict: ecmaFeatures.impliedStrict,
					ecmaVersion,
					sourceType,
					fallback: getFallbackKeys
				});
				containerScopes.set(exprContainer, scope);
				return scope;
			} catch {}
			return null;
		}
		return newProxy(context, {
			getSourceCode() {
				return sourceCode;
			},
			get sourceCode() {
				return sourceCode;
			},
			getDeclaredVariables
		});
		/**
		* @param {ESNode} node
		* @returns {Variable[]}
		*/
		function getDeclaredVariables(node) {
			return getContainerScope(node)?.getDeclaredVariables(node) ?? [];
		}
	}
	/**
	* Wrap the rule context object to override report method to skip the dynamic argument.
	* @param {RuleContext} context The rule context object.
	* @returns {RuleContext}
	*/
	function wrapContextToOverrideReportMethodToSkipDynamicArgument(context) {
		const sourceCode = context.sourceCode;
		const templateBody = sourceCode.ast.templateBody;
		if (!templateBody) return context;
		/** @type {Range[]} */
		const directiveKeyRanges = [];
		traverseNodes(templateBody, {
			enterNode(node, parent) {
				if (parent && parent.type === "VDirectiveKey" && node.type === "VExpressionContainer") directiveKeyRanges.push(node.range);
			},
			leaveNode() {}
		});
		return newProxy(context, { report(descriptor, ...args) {
			let range = null;
			if (descriptor.loc) {
				const startLoc = descriptor.loc.start || descriptor.loc;
				const endLoc = descriptor.loc.end || startLoc;
				range = [sourceCode.getIndexFromLoc(startLoc), sourceCode.getIndexFromLoc(endLoc)];
			} else if (descriptor.node) range = descriptor.node.range;
			if (range) {
				for (const directiveKeyRange of directiveKeyRanges) if (range[0] < directiveKeyRange[1] && directiveKeyRange[0] < range[1]) return;
			}
			context.report(descriptor, ...args);
		} });
	}
	/**
	* @callback WrapRuleCreate
	* @param {RuleContext} ruleContext
	* @param {WrapRuleCreateContext} wrapContext
	* @returns {TemplateListener}
	*
	* @typedef {object} WrapRuleCreateContext
	* @property {RuleListener} baseHandlers
	*/
	/**
	* @callback WrapRulePreprocess
	* @param {RuleContext} ruleContext
	* @param {WrapRulePreprocessContext} wrapContext
	* @returns {void}
	*
	* @typedef {object} WrapRulePreprocessContext
	* @property { (override: Partial<RuleContext>) => RuleContext } wrapContextToOverrideProperties Wrap the rule context object to override
	* @property { (visitor: TemplateListener) => void } defineVisitor Define template body visitor
	*/
	/**
	* @typedef {object} WrapRuleOptions
	* @property {string[]} [categories] The categories of this rule.
	* @property {boolean} [skipDynamicArguments] If `true`, skip validation within dynamic arguments.
	* @property {boolean} [skipDynamicArgumentsReport] If `true`, skip report within dynamic arguments.
	* @property {boolean} [applyDocument] If `true`, apply check to document fragment.
	* @property {boolean} [skipBaseHandlers] If `true`, skip base rule handlers.
	* @property {WrapRulePreprocess} [preprocess] Preprocess to calling create of base rule.
	* @property {WrapRuleCreate} [create] If define, extend base rule.
	*/
	/**
	* Wrap a given core rule to apply it to Vue.js template.
	* @param {string} coreRuleName The name of the core rule implementation to wrap.
	* @param {WrapRuleOptions} [options] The option of this rule.
	* @returns {RuleModule} The wrapped rule implementation.
	*/
	function wrapCoreRule(coreRuleName, options) {
		const coreRule = getCoreRule(coreRuleName);
		if (!coreRule) return {
			meta: {
				type: "problem",
				docs: { url: `https://eslint.vuejs.org/rules/${coreRuleName}.html` }
			},
			create(context) {
				return defineTemplateBodyVisitor(context, { "VElement[name='template'][parent.type='VDocumentFragment']"(node) {
					context.report({
						node,
						message: `Failed to extend ESLint core rule "${coreRuleName}". You may be able to use this rule by upgrading the version of ESLint. If you cannot upgrade it, turn off this rule.`
					});
				} });
			}
		};
		const rule = wrapRuleModule(coreRule, coreRuleName, options);
		const meta = {
			...rule.meta,
			docs: {
				...rule.meta.docs,
				extensionSource: {
					url: coreRule.meta.docs.url,
					name: "ESLint core"
				}
			}
		};
		return {
			...rule,
			meta
		};
	}
	/**
	* @typedef {object} RuleNames
	* @property {string} core The name of the core rule implementation to wrap.
	* @property {string} stylistic The name of ESLint Stylistic rule implementation to wrap.
	* @property {string} vue The name of the wrapped rule
	*/
	/**
	* Wrap a core rule or ESLint Stylistic rule to apply it to Vue.js template.
	* @param {RuleNames|string} ruleNames The names of the rule implementation to wrap.
	* @param {WrapRuleOptions} [options] The option of this rule.
	* @returns {RuleModule} The wrapped rule implementation.
	*/
	function wrapStylisticOrCoreRule(ruleNames, options) {
		const stylisticRuleName = typeof ruleNames === "string" ? ruleNames : ruleNames.stylistic;
		const coreRuleName = typeof ruleNames === "string" ? ruleNames : ruleNames.core;
		const vueRuleName = typeof ruleNames === "string" ? ruleNames : ruleNames.vue;
		const stylisticRule = getStylisticRule(stylisticRuleName);
		const baseRule = stylisticRule || getCoreRule(coreRuleName);
		if (!baseRule) return {
			meta: {
				type: "problem",
				docs: { url: `https://eslint.vuejs.org/rules/${vueRuleName}.html` }
			},
			create(context) {
				return defineTemplateBodyVisitor(context, { "VElement[name='template'][parent.type='VDocumentFragment']"(node) {
					context.report({
						node,
						message: `Failed to extend ESLint Stylistic rule "${stylisticRule}". You may be able to use this rule by installing ESLint Stylistic plugin (https://eslint.style/). If you cannot install it, turn off this rule.`
					});
				} });
			}
		};
		const rule = wrapRuleModule(baseRule, vueRuleName, options);
		const jsRule = getStylisticRule(stylisticRuleName, "@stylistic/eslint-plugin-js");
		const description = stylisticRule ? `${jsRule?.meta.docs.description} in \`<template>\`` : rule.meta.docs.description;
		const meta = {
			...rule.meta,
			docs: {
				...rule.meta.docs,
				description,
				extensionSource: {
					url: baseRule.meta.docs.url,
					name: stylisticRule ? "ESLint Stylistic" : "ESLint core"
				}
			},
			deprecated: void 0,
			replacedBy: void 0
		};
		return {
			...rule,
			meta
		};
	}
	/**
	* Wrap a given rule to apply it to Vue.js template.
	* @param {RuleModule} baseRule The rule implementation to wrap.
	* @param {string} ruleName The name of the wrapped rule.
	* @param {WrapRuleOptions} [options] The option of this rule.
	* @returns {RuleModule} The wrapped rule implementation.
	*/
	function wrapRuleModule(baseRule, ruleName, options) {
		let description = baseRule.meta.docs.description;
		if (description) description += " in `<template>`";
		const { categories, skipDynamicArguments, skipDynamicArgumentsReport, skipBaseHandlers, applyDocument, preprocess, create } = options || {};
		return {
			create(context) {
				const sourceCode = context.sourceCode;
				const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
				if (tokenStore) context = wrapContextToOverrideTokenMethods(context, tokenStore, { applyDocument });
				if (skipDynamicArgumentsReport) context = wrapContextToOverrideReportMethodToSkipDynamicArgument(context);
				/** @type {TemplateListener} */
				const handlers = {};
				if (preprocess) preprocess(context, {
					wrapContextToOverrideProperties(override) {
						context = newProxy(context, override);
						return context;
					},
					defineVisitor(visitor) {
						compositingVisitors(handlers, visitor);
					}
				});
				const baseHandlers = baseRule.create(context);
				if (!skipBaseHandlers) compositingVisitors(handlers, baseHandlers);
				if (handlers.Program) {
					handlers[applyDocument ? "VDocumentFragment" : "VElement[parent.type!='VElement']"] = handlers.Program;
					delete handlers.Program;
				}
				if (handlers["Program:exit"]) {
					handlers[applyDocument ? "VDocumentFragment:exit" : "VElement[parent.type!='VElement']:exit"] = handlers["Program:exit"];
					delete handlers["Program:exit"];
				}
				if (skipDynamicArguments) {
					let withinDynamicArguments = false;
					for (const name of Object.keys(handlers)) {
						const original = handlers[name];
						/** @param {any[]} args */
						handlers[name] = (...args) => {
							if (withinDynamicArguments) return;
							original(...args);
						};
					}
					handlers["VDirectiveKey > VExpressionContainer"] = () => {
						withinDynamicArguments = true;
					};
					handlers["VDirectiveKey > VExpressionContainer:exit"] = () => {
						withinDynamicArguments = false;
					};
				}
				if (create) compositingVisitors(handlers, create(context, { baseHandlers }));
				if (applyDocument) return defineDocumentVisitor(context, handlers);
				return defineTemplateBodyVisitor(context, handlers);
			},
			meta: Object.assign({}, baseRule.meta, { docs: Object.assign({}, baseRule.meta.docs, {
				description,
				category: null,
				categories,
				url: `https://eslint.vuejs.org/rules/${ruleName}.html`
			}) })
		};
	}
	module.exports = {
		defineTemplateBodyVisitor,
		defineDocumentVisitor,
		wrapCoreRule,
		wrapStylisticOrCoreRule,
		getCoreRule,
		isDef,
		flatten,
		prevSibling(node) {
			let prevElement = null;
			for (const siblingNode of node.parent && node.parent.children || []) {
				if (siblingNode === node) return prevElement;
				if (siblingNode.type === "VElement") prevElement = siblingNode;
			}
			return null;
		},
		isEmptyValueDirective(node, context) {
			if (node.value == null) return false;
			if (node.value.expression != null) return false;
			let valueText = context.sourceCode.getText(node.value);
			if ((valueText[0] === "\"" || valueText[0] === "'") && valueText[0] === valueText.at(-1)) valueText = valueText.slice(1, -1);
			if (!valueText) return true;
			return false;
		},
		isEmptyExpressionValueDirective(node, context) {
			if (node.value == null) return false;
			if (node.value.expression != null) return false;
			const sourceCode = context.sourceCode;
			const valueNode = node.value;
			const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore();
			let quote1 = null;
			let quote2 = null;
			for (const token of tokenStore.getTokens(node)) {
				if (token.range[1] <= valueNode.range[0]) continue;
				if (valueNode.range[1] <= token.range[0]) return true;
				if (!quote1 && token.type === "Punctuator" && (token.value === "\"" || token.value === "'")) {
					quote1 = token;
					continue;
				}
				if (!quote2 && quote1 && token.type === "Punctuator" && token.value === quote1.value) {
					quote2 = token;
					continue;
				}
				return false;
			}
			return true;
		},
		getAttribute,
		hasAttribute,
		getDirectives,
		getDirective,
		hasDirective,
		isVBindSameNameShorthand,
		getRegisteredComponents(componentObject) {
			const componentsNode = componentObject.properties.find(
				/**
				* @param {ESNode} p
				* @returns {p is (Property & { key: Identifier & {name: 'components'}, value: ObjectExpression })}
				*/
				(p) => p.type === "Property" && getStaticPropertyName(p) === "components" && p.value.type === "ObjectExpression"
			);
			if (!componentsNode) return [];
			return componentsNode.value.properties.filter(isProperty).map((node) => {
				const name = getStaticPropertyName(node);
				return name ? {
					node,
					name
				} : null;
			}).filter(isDef);
		},
		prevElementHasIf(node) {
			const prev = this.prevSibling(node);
			return prev != null && prev.startTag.attributes.some((a) => a.directive && (a.key.name.name === "if" || a.key.name.name === "else-if"));
		},
		*iterateChildElementsChains(node) {
			let vIf = false;
			/** @type {VElement[]} */
			let elementChain = [];
			for (const childNode of node.children) if (childNode.type === "VElement") {
				let connected;
				if (hasDirective(childNode, "if")) {
					connected = false;
					vIf = true;
				} else if (hasDirective(childNode, "else-if")) {
					connected = vIf;
					vIf = true;
				} else if (hasDirective(childNode, "else")) {
					connected = vIf;
					vIf = false;
				} else {
					connected = false;
					vIf = false;
				}
				if (connected) elementChain.push(childNode);
				else {
					if (elementChain.length > 0) yield elementChain;
					elementChain = [childNode];
				}
			} else if (childNode.type !== "VText" || childNode.value.trim() !== "") vIf = false;
			if (elementChain.length > 0) yield elementChain;
		},
		isStringLiteral(node) {
			return node.type === "Literal" && typeof node.value === "string" || node.type === "TemplateLiteral" && node.expressions.length === 0;
		},
		isCustomComponent(node, ignoreElementNamespaces = false) {
			if (hasAttribute(node, "is") || hasDirective(node, "bind", "is") || hasDirective(node, "is")) return true;
			const isHtmlName = this.isHtmlWellKnownElementName(node.rawName);
			const isSvgName = this.isSvgWellKnownElementName(node.rawName);
			const isMathName = this.isMathWellKnownElementName(node.rawName);
			if (ignoreElementNamespaces) return !isHtmlName && !isSvgName && !isMathName;
			return this.isHtmlElementNode(node) && !isHtmlName || this.isSvgElementNode(node) && !isSvgName || this.isMathElementNode(node) && !isMathName;
		},
		isHtmlElementNode(node) {
			return node.namespace === NS.HTML;
		},
		isSvgElementNode(node) {
			return node.namespace === NS.SVG;
		},
		isMathElementNode(node) {
			return node.namespace === NS.MathML;
		},
		isHtmlWellKnownElementName(name) {
			return HTML_ELEMENT_NAMES.has(name);
		},
		isSvgWellKnownElementName(name) {
			return SVG_ELEMENT_NAMES.has(name);
		},
		isMathWellKnownElementName(name) {
			return MATH_ELEMENT_NAMES.has(name);
		},
		isHtmlVoidElementName(name) {
			return VOID_ELEMENT_NAMES.has(name);
		},
		isBuiltInComponentName(name) {
			return VUE3_BUILTIN_COMPONENT_NAMES.has(name) || VUE2_BUILTIN_COMPONENT_NAMES.has(name);
		},
		isVueBuiltInElementName(name) {
			return VUE_BUILTIN_ELEMENT_NAMES.has(name.toLowerCase());
		},
		isBuiltInDirectiveName(name) {
			return name === "bind" || name === "on" || name === "text" || name === "html" || name === "show" || name === "if" || name === "else" || name === "else-if" || name === "for" || name === "model" || name === "slot" || name === "pre" || name === "cloak" || name === "once" || name === "memo" || name === "is";
		},
		getStaticPropertyName,
		getStringLiteralValue,
		getComponentPropsFromOptions,
		getComponentEmitsFromOptions,
		getComputedProperties(componentObject) {
			const computedPropertiesNode = componentObject.properties.find(
				/**
				* @param {ESNode} p
				* @returns {p is (Property & { key: Identifier & {name: 'computed'}, value: ObjectExpression })}
				*/
				(p) => p.type === "Property" && getStaticPropertyName(p) === "computed" && p.value.type === "ObjectExpression"
			);
			if (!computedPropertiesNode) return [];
			return computedPropertiesNode.value.properties.filter(isProperty).map((cp) => {
				const key = getStaticPropertyName(cp);
				/** @type {Expression} */
				const propValue = skipTSAsExpression(cp.value);
				/** @type {BlockStatement | null} */
				let value = null;
				if (propValue.type === "FunctionExpression") value = propValue.body;
				else if (propValue.type === "ObjectExpression") {
					const get = findProperty(propValue, "get", (p) => p.value.type === "FunctionExpression");
					value = get ? get.value.body : null;
				}
				return {
					key,
					value
				};
			});
		},
		getGetterBodyFromComputedFunction(callExpression) {
			if (callExpression.arguments.length <= 0) return null;
			const arg = callExpression.arguments[0];
			if (arg.type === "FunctionExpression" || arg.type === "ArrowFunctionExpression") return arg;
			if (arg.type === "ObjectExpression") {
				const getProperty = findProperty(arg, "get", (p) => p.value.type === "FunctionExpression" || p.value.type === "ArrowFunctionExpression");
				return getProperty ? getProperty.value : null;
			}
			return null;
		},
		isTypeScriptFile,
		isVueFile,
		isScriptSetup,
		getScriptSetupElement,
		executeOnVue(context, cb) {
			return compositingVisitors(this.executeOnVueComponent(context, cb), this.executeOnVueInstance(context, cb));
		},
		defineVueVisitor(context, visitor) {
			/** @type {VueObjectData | null} */
			let vueStack = null;
			/**
			* @param {string} key
			* @param {ESNode} node
			*/
			function callVisitor(key, node) {
				if (visitor[key] && vueStack) visitor[key](node, vueStack);
			}
			/** @type {NodeListener} */
			const vueVisitor = {};
			for (const key in visitor) vueVisitor[key] = (node) => callVisitor(key, node);
			/**
			* @param {ObjectExpression} node
			*/
			vueVisitor.ObjectExpression = (node) => {
				const type = getVueObjectType(context, node);
				if (type) {
					vueStack = {
						node,
						type,
						parent: vueStack,
						get functional() {
							const functional = node.properties.find(
								/**
								* @param {Property | SpreadElement} p
								* @returns {p is Property}
								*/
								(p) => p.type === "Property" && getStaticPropertyName(p) === "functional"
							);
							if (!functional) return false;
							if (functional.value.type === "Literal" && functional.value.value === false) return false;
							return true;
						}
					};
					callVisitor("onVueObjectEnter", node);
				}
				callVisitor("ObjectExpression", node);
			};
			vueVisitor["ObjectExpression:exit"] = (node) => {
				callVisitor("ObjectExpression:exit", node);
				if (vueStack && vueStack.node === node) {
					callVisitor("onVueObjectExit", node);
					vueStack = vueStack.parent;
				}
			};
			if (visitor.onSetupFunctionEnter || visitor.onSetupFunctionExit || visitor.onRenderFunctionEnter) {
				const setups = /* @__PURE__ */ new Set();
				/** @param { (FunctionExpression | ArrowFunctionExpression) & { parent: Property } } node */
				vueVisitor["Property[value.type=/^(Arrow)?FunctionExpression$/] > :function"] = (node) => {
					/** @type {Property} */
					const prop = node.parent;
					if (vueStack && prop.parent === vueStack.node && prop.value === node) {
						const name = getStaticPropertyName(prop);
						if (name === "setup") {
							callVisitor("onSetupFunctionEnter", node);
							setups.add(node);
						} else if (name === "render") callVisitor("onRenderFunctionEnter", node);
					}
					callVisitor("Property[value.type=/^(Arrow)?FunctionExpression$/] > :function", node);
				};
				if (visitor.onSetupFunctionExit)
 /** @param { (FunctionExpression | ArrowFunctionExpression) & { parent: Property } } node */
				vueVisitor["Property[value.type=/^(Arrow)?FunctionExpression$/] > :function:exit"] = (node) => {
					if (setups.has(node)) {
						callVisitor("onSetupFunctionExit", node);
						setups.delete(node);
					}
				};
			}
			return vueVisitor;
		},
		defineScriptSetupVisitor(context, visitor) {
			const scriptSetup = getScriptSetupElement(context);
			if (scriptSetup == null) return {};
			const scriptSetupRange = scriptSetup.range;
			/**
			* @param {ESNode} node
			*/
			function inScriptSetup(node) {
				return scriptSetupRange[0] <= node.range[0] && node.range[1] <= scriptSetupRange[1];
			}
			/**
			* @param {string} key
			* @param {ESNode} node
			* @param {any[]} args
			*/
			function callVisitor(key, node, ...args) {
				if (visitor[key] && (node.type === "Program" || inScriptSetup(node))) visitor[key](node, ...args);
			}
			/** @type {NodeListener} */
			const scriptSetupVisitor = {};
			for (const key in visitor) scriptSetupVisitor[key] = (node) => callVisitor(key, node);
			class MacroListener {
				/**
				* @param {string} name
				* @param {string} enterName
				* @param {string} exitName
				* @param {(candidateMacro: Expression | null, node: CallExpression) => boolean} isMacroNode
				* @param {(context: RuleContext, node: CallExpression) => unknown} buildParam
				*/
				constructor(name, enterName, exitName, isMacroNode, buildParam) {
					this.name = name;
					this.enterName = enterName;
					this.exitName = exitName;
					this.isMacroNode = isMacroNode;
					this.buildParam = buildParam;
					this.hasListener = Boolean(visitor[this.enterName] || visitor[this.exitName]);
					this.paramsMap = /* @__PURE__ */ new Map();
				}
			}
			const macroListenerList = [
				new MacroListener("defineProps", "onDefinePropsEnter", "onDefinePropsExit", (candidateMacro, node) => candidateMacro === node || candidateMacro === getWithDefaults(node), getComponentPropsFromDefineProps),
				new MacroListener("defineEmits", "onDefineEmitsEnter", "onDefineEmitsExit", (candidateMacro, node) => candidateMacro === node, getComponentEmitsFromDefineEmits),
				new MacroListener("defineOptions", "onDefineOptionsEnter", "onDefineOptionsExit", (candidateMacro, node) => candidateMacro === node, () => void 0),
				new MacroListener("defineSlots", "onDefineSlotsEnter", "onDefineSlotsExit", (candidateMacro, node) => candidateMacro === node, getComponentSlotsFromDefineSlots),
				new MacroListener("defineExpose", "onDefineExposeEnter", "onDefineExposeExit", (candidateMacro, node) => candidateMacro === node, () => void 0),
				new MacroListener("defineModel", "onDefineModelEnter", "onDefineModelExit", (candidateMacro, node) => candidateMacro === node, getComponentModelFromDefineModel)
			].filter((m) => m.hasListener);
			if (macroListenerList.length > 0) {
				/** @type {Expression | null} */
				let candidateMacro = null;
				/** @param {VariableDeclarator|ExpressionStatement} node */
				scriptSetupVisitor["Program > VariableDeclaration > VariableDeclarator, Program > ExpressionStatement"] = (node) => {
					if (!candidateMacro) candidateMacro = node.type === "VariableDeclarator" ? node.init : node.expression;
				};
				/** @param {VariableDeclarator|ExpressionStatement} node */
				scriptSetupVisitor["Program > VariableDeclaration > VariableDeclarator, Program > ExpressionStatement:exit"] = (node) => {
					if (candidateMacro === (node.type === "VariableDeclarator" ? node.init : node.expression)) candidateMacro = null;
				};
				/**
				* @param {CallExpression} node
				*/
				scriptSetupVisitor.CallExpression = (node) => {
					if (candidateMacro && inScriptSetup(node) && node.callee.type === "Identifier") for (const macroListener of macroListenerList) {
						if (node.callee.name !== macroListener.name || !macroListener.isMacroNode(candidateMacro, node)) continue;
						const param = macroListener.buildParam(context, node);
						callVisitor(macroListener.enterName, node, param);
						macroListener.paramsMap.set(node, param);
						break;
					}
					callVisitor("CallExpression", node);
				};
				scriptSetupVisitor["CallExpression:exit"] = (node) => {
					callVisitor("CallExpression:exit", node);
					for (const macroListener of macroListenerList) if (macroListener.paramsMap.has(node)) {
						callVisitor(macroListener.exitName, node, macroListener.paramsMap.get(node));
						macroListener.paramsMap.delete(node);
					}
				};
			}
			return scriptSetupVisitor;
		},
		hasWithDefaults,
		getWithDefaultsPropExpressions(node) {
			const map = getWithDefaultsProps(node);
			/** @type {Record<string, Expression | undefined>} */
			const result = {};
			for (const key of Object.keys(map)) {
				const prop = map[key];
				result[key] = prop && prop.value;
			}
			return result;
		},
		getWithDefaultsProps,
		getDefaultPropExpressionsForPropsDestructure,
		getLeftOfDefineProps,
		isUsingPropsDestructure(node) {
			return getLeftOfDefineProps(node)?.type === "ObjectPattern";
		},
		getPropsDestructure,
		getVueObjectType,
		getVueComponentDefinitionType,
		isSFCObject,
		compositingVisitors,
		executeOnVueInstance(context, cb) {
			return { "ObjectExpression:exit"(node) {
				const type = getVueObjectType(context, node);
				if (!type || type !== "instance") return;
				cb(node, type);
			} };
		},
		executeOnVueComponent(context, cb) {
			return { "ObjectExpression:exit"(node) {
				const type = getVueObjectType(context, node);
				if (!type || type !== "mark" && type !== "export" && type !== "definition") return;
				cb(node, type);
			} };
		},
		executeOnCallVueComponent(_context, cb) {
			return { "CallExpression > MemberExpression > Identifier[name='component']": (node) => {
				const callExpr = node.parent.parent;
				const callee = callExpr.callee;
				if (callee.type === "MemberExpression") {
					if (skipTSAsExpression(callee.object).type === "Identifier" && callee.property === node && callExpr.arguments.length > 0) cb(callExpr);
				}
			} };
		},
		*iterateProperties(node, groups) {
			for (const item of node.properties) {
				if (item.type !== "Property") continue;
				const name = getStaticPropertyName(item);
				if (!name || !groups.has(name)) continue;
				switch (item.value.type) {
					case "ArrayExpression":
						yield* this.iterateArrayExpression(item.value, name);
						break;
					case "ObjectExpression":
						yield* this.iterateObjectExpression(item.value, name);
						break;
					case "FunctionExpression":
						yield* this.iterateFunctionExpression(item.value, name);
						break;
					case "ArrowFunctionExpression":
						yield* this.iterateArrowFunctionExpression(item.value, name);
						break;
				}
			}
		},
		*iterateArrayExpression(node, groupName) {
			for (const item of node.elements) if (item && (item.type === "Literal" || item.type === "TemplateLiteral")) {
				const name = getStringLiteralValue(item);
				if (name) yield {
					type: "array",
					name,
					groupName,
					node: item
				};
			}
		},
		*iterateObjectExpression(node, groupName) {
			/** @type {Set<Property> | undefined} */
			let usedGetter;
			for (const item of node.properties) if (item.type === "Property") {
				const key = item.key;
				if (key.type === "Identifier" || key.type === "Literal" || key.type === "TemplateLiteral") {
					const name = getStaticPropertyName(item);
					if (name) {
						if (item.kind === "set" && node.properties.some((item2) => {
							if (item2.type === "Property" && item2.kind === "get") {
								if (!usedGetter) usedGetter = /* @__PURE__ */ new Set();
								if (usedGetter.has(item2)) return false;
								if (getStaticPropertyName(item2) === name) {
									usedGetter.add(item2);
									return true;
								}
							}
							return false;
						})) continue;
						yield {
							type: "object",
							name,
							groupName,
							node: key,
							property: item
						};
					}
				}
			}
		},
		*iterateFunctionExpression(node, groupName) {
			if (node.body.type === "BlockStatement") {
				for (const item of node.body.body) if (item.type === "ReturnStatement" && item.argument && item.argument.type === "ObjectExpression") yield* this.iterateObjectExpression(item.argument, groupName);
			}
		},
		*iterateArrowFunctionExpression(node, groupName) {
			const body = node.body;
			if (body.type === "BlockStatement") {
				for (const item of body.body) if (item.type === "ReturnStatement" && item.argument && item.argument.type === "ObjectExpression") yield* this.iterateObjectExpression(item.argument, groupName);
			} else if (body.type === "ObjectExpression") yield* this.iterateObjectExpression(body, groupName);
		},
		executeOnFunctionsWithoutReturn(treatUndefinedAsUnspecified, cb) {
			/**
			* @typedef {object} FuncInfo
			* @property {FuncInfo | null} funcInfo
			* @property {CodePath} codePath
			* @property {boolean} hasReturn
			* @property {boolean} hasReturnValue
			* @property {ArrowFunctionExpression | FunctionExpression | FunctionDeclaration} node
			* @property {CodePathSegment[]} currentSegments
			*/
			/** @type {FuncInfo | null} */
			let funcInfo = null;
			function isValidReturn() {
				if (!funcInfo) return true;
				if (funcInfo.currentSegments.some((segment) => segment.reachable)) return false;
				return !treatUndefinedAsUnspecified || funcInfo.hasReturnValue;
			}
			return {
				onCodePathStart(codePath, node) {
					if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration") funcInfo = {
						codePath,
						currentSegments: [],
						funcInfo,
						hasReturn: false,
						hasReturnValue: false,
						node
					};
				},
				onCodePathSegmentStart(segment) {
					funcInfo?.currentSegments.push(segment);
				},
				onCodePathSegmentEnd() {
					funcInfo?.currentSegments.pop();
				},
				onCodePathEnd() {
					funcInfo = funcInfo && funcInfo.funcInfo;
				},
				ReturnStatement(node) {
					if (funcInfo) {
						funcInfo.hasReturn = true;
						funcInfo.hasReturnValue = Boolean(node.argument);
					}
				},
				"ArrowFunctionExpression:exit"(node) {
					if (funcInfo && !isValidReturn() && !node.expression) cb(funcInfo.node);
				},
				"FunctionExpression:exit"() {
					if (funcInfo && !isValidReturn()) cb(funcInfo.node);
				}
			};
		},
		isSingleLine(node) {
			return node.loc.start.line === node.loc.end.line;
		},
		hasInvalidEOF(node) {
			const body = node.templateBody;
			if (body == null || body.errors == null) return false;
			return body.errors.some((error) => typeof error.code === "string" && error.code.startsWith("eof-"));
		},
		getMemberChaining(node) {
			/** @type {MemberExpression[]} */
			const nodes = [];
			let n = skipChainExpression(node);
			while (n.type === "MemberExpression") {
				nodes.push(n);
				n = skipChainExpression(n.object);
			}
			return [n, ...nodes.reverse()];
		},
		editDistance(a, b) {
			if (a === b) return 0;
			const alen = a.length;
			const blen = b.length;
			const dp = Array.from({ length: alen + 1 }).map((_) => Array.from({ length: blen + 1 }).fill(0));
			for (let i = 0; i <= alen; i++) dp[i][0] = i;
			for (let j = 0; j <= blen; j++) dp[0][j] = j;
			for (let i = 1; i <= alen; i++) for (let j = 1; j <= blen; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
			return dp[alen][blen];
		},
		inRange(rangeOrNode, target) {
			const range = Array.isArray(rangeOrNode) ? rangeOrNode : rangeOrNode.range;
			return range[0] <= target.range[0] && target.range[1] <= range[1];
		},
		isProperty,
		isAssignmentProperty,
		isVElement,
		findProperty,
		findAssignmentProperty,
		isPropertyChain,
		skipTSAsExpression,
		skipDefaultParamValue,
		skipChainExpression,
		withinTypeNode,
		findVariableByIdentifier,
		getScope,
		isInExportDefault,
		isThis(node, context) {
			if (node.type === "ThisExpression") return true;
			if (node.type !== "Identifier") return false;
			const parent = node.parent;
			if (parent.type === "MemberExpression" && parent.property === node || parent.type === "Property" && parent.key === node && !parent.computed) return false;
			const variable = findVariable(getScope(context, node), node);
			if (variable != null && variable.defs.length === 1) {
				const def = variable.defs[0];
				if (def.type === "Variable" && def.parent.kind === "const" && def.node.id.type === "Identifier") return Boolean(def.node && def.node.init && def.node.init.type === "ThisExpression");
			}
			return false;
		},
		isObjectAssignCall(callExpr, targetNode) {
			const { callee, arguments: args } = callExpr;
			return args.length > 0 && args[0] === targetNode && callee?.type === "MemberExpression" && callee.object?.type === "Identifier" && callee.object.name === "Object" && callee.property?.type === "Identifier" && callee.property.name === "assign";
		},
		findMutating(props) {
			/** @type {MemberExpression[]} */
			const pathNodes = [];
			/** @type {MemberExpression | Identifier | ChainExpression} */
			let node = props;
			let target = node.parent;
			while (true) {
				switch (target.type) {
					case "AssignmentExpression":
						if (target.left === node) return {
							kind: "assignment",
							node: target,
							pathNodes
						};
						break;
					case "UpdateExpression": return {
						kind: "update",
						node: target,
						pathNodes
					};
					case "UnaryExpression":
						if (target.operator === "delete") return {
							kind: "update",
							node: target,
							pathNodes
						};
						break;
					case "CallExpression": {
						const mem = pathNodes.at(-1);
						if (mem && target.callee === node) {
							const callName = getStaticPropertyName(mem);
							if (callName && /^(?:push|pop|shift|unshift|reverse|splice|sort|copyWithin|fill)$/u.test(callName)) {
								pathNodes.pop();
								return {
									kind: "call",
									node: target,
									pathNodes
								};
							}
						}
						if (this.isObjectAssignCall(target, node)) return {
							kind: "call",
							node: target,
							pathNodes
						};
						break;
					}
					case "MemberExpression":
						if (target.object === node) {
							pathNodes.push(target);
							node = target;
							target = target.parent;
							continue;
						}
						break;
					case "ChainExpression":
						node = target;
						target = target.parent;
						continue;
				}
				return null;
			}
		},
		iterateWatchHandlerValues,
		createCompositionApiTraceMap: (map) => ({
			vue: map,
			"@vue/composition-api": map,
			"#imports": map
		}),
		*iterateReferencesTraceMap(tracker, map) {
			const esmTraceMap = this.createCompositionApiTraceMap({
				...map,
				[ReferenceTracker.ESM]: true
			});
			for (const ref of tracker.iterateEsmReferences(esmTraceMap)) yield ref;
			for (const ref of tracker.iterateGlobalReferences(map)) yield ref;
		},
		equalTokens(left, right, sourceCode) {
			const tokensL = sourceCode.getTokens(left);
			const tokensR = sourceCode.getTokens(right);
			if (tokensL.length !== tokensR.length) return false;
			return tokensL.every((token, i) => token.type === tokensR[i].type && token.value === tokensR[i].value);
		}
	};
	/**
	* Checks whether the given value is defined.
	* @template T
	* @param {T | null | undefined} v
	* @returns {v is T}
	*/
	function isDef(v) {
		return v != null;
	}
	/**
	* Flattens arrays, objects and iterable objects.
	* @template T
	* @param {T | Iterable<T> | null | undefined} v
	* @returns {T[]}
	*/
	function flatten(v) {
		/** @type {T[]} */
		const result = [];
		if (v) if (isIterable(v)) result.push(...v);
		else result.push(v);
		return result;
	}
	/**
	* @param {*} v
	* @returns {v is Iterable<any>}
	*/
	function isIterable(v) {
		return v && Symbol.iterator in v;
	}
	/**
	* Register the given visitor to parser services.
	* If the parser service of `vue-eslint-parser` was not found,
	* this generates a warning.
	*
	* @param {RuleContext} context The rule context to use parser services.
	* @param {TemplateListener} templateBodyVisitor The visitor to traverse the template body.
	* @param {RuleListener} [scriptVisitor] The visitor to traverse the script.
	* @param { { templateBodyTriggerSelector: "Program" | "Program:exit" } } [options] The options.
	* @returns {RuleListener} The merged visitor.
	*/
	function defineTemplateBodyVisitor(context, templateBodyVisitor, scriptVisitor, options) {
		const sourceCode = context.sourceCode;
		if (sourceCode.parserServices.defineTemplateBodyVisitor == null) {
			const filename = context.filename;
			if (path.extname(filename) === ".vue") context.report({
				loc: {
					line: 1,
					column: 0
				},
				message: "Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error."
			});
			return {};
		}
		return sourceCode.parserServices.defineTemplateBodyVisitor(templateBodyVisitor, scriptVisitor, options);
	}
	/**
	* Register the given visitor to parser services.
	* If the parser service of `vue-eslint-parser` was not found,
	* this generates a warning.
	*
	* @param {RuleContext} context The rule context to use parser services.
	* @param {TemplateListener} documentVisitor The visitor to traverse the document.
	* @param { { triggerSelector: "Program" | "Program:exit" } } [options] The options.
	* @returns {RuleListener} The merged visitor.
	*/
	function defineDocumentVisitor(context, documentVisitor, options) {
		const sourceCode = context.sourceCode;
		if (sourceCode.parserServices.defineDocumentVisitor == null) {
			const filename = context.filename;
			if (path.extname(filename) === ".vue") context.report({
				loc: {
					line: 1,
					column: 0
				},
				message: "Use the latest vue-eslint-parser. See also https://eslint.vuejs.org/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error."
			});
			return {};
		}
		return sourceCode.parserServices.defineDocumentVisitor(documentVisitor, options);
	}
	/**
	* @template T
	* @param {T} visitor
	* @param {...(TemplateListener | RuleListener | NodeListener)} visitors
	* @returns {T}
	*/
	function compositingVisitors(visitor, ...visitors) {
		for (const v of visitors) for (const key in v) if (visitor[key]) {
			const o = visitor[key];
			visitor[key] = (...args) => {
				o(...args);
				v[key](...args);
			};
		} else visitor[key] = v[key];
		return visitor;
	}
	/**
	* Find the variable of a given identifier.
	* @param {RuleContext} context The rule context
	* @param {Identifier} node The variable name to find.
	* @returns {Variable|null} The found variable or null.
	*/
	function findVariableByIdentifier(context, node) {
		return findVariable(getScope(context, node), node);
	}
	/**
	* Finds the property with the given name from the given ObjectExpression node.
	* @param {ObjectExpression} node
	* @param {string} name
	* @param { (p: Property) => boolean } [filter]
	* @returns { (Property) | null}
	*/
	function findProperty(node, name, filter) {
		const predicate = filter ? (prop) => isProperty(prop) && getStaticPropertyName(prop) === name && filter(prop) : (prop) => isProperty(prop) && getStaticPropertyName(prop) === name;
		return node.properties.find(predicate) || null;
	}
	/**
	* Finds the assignment property with the given name from the given ObjectPattern node.
	* @param {ObjectPattern} node
	* @param {string} name
	* @param { (p: AssignmentProperty) => boolean } [filter]
	* @returns { (AssignmentProperty) | null}
	*/
	function findAssignmentProperty(node, name, filter) {
		const predicate = filter ? (prop) => isAssignmentProperty(prop) && getStaticPropertyName(prop) === name && filter(prop) : (prop) => isAssignmentProperty(prop) && getStaticPropertyName(prop) === name;
		return node.properties.find(predicate) || null;
	}
	/**
	* Checks whether the given node is Property.
	* @param {Property | SpreadElement | AssignmentProperty} node
	* @returns {node is Property}
	*/
	function isProperty(node) {
		if (node.type !== "Property") return false;
		return !node.parent || node.parent.type === "ObjectExpression";
	}
	/**
	* Checks whether the given node is AssignmentProperty.
	* @param {AssignmentProperty | RestElement} node
	* @returns {node is AssignmentProperty}
	*/
	function isAssignmentProperty(node) {
		return node.type === "Property";
	}
	/**
	* Checks whether the given node is VElement.
	* @param {VElement | VExpressionContainer | VText | VDocumentFragment} node
	* @returns {node is VElement}
	*/
	function isVElement(node) {
		return node.type === "VElement";
	}
	/**
	* Checks whether the given node is in export default.
	* @param {ASTNode} node
	* @returns {boolean}
	*/
	function isInExportDefault(node) {
		/** @type {ASTNode | null} */
		let parent = node.parent;
		while (parent) {
			if (parent.type === "ExportDefaultDeclaration") return true;
			parent = parent.parent;
		}
		return false;
	}
	/**
	* Retrieve `TSAsExpression#expression` value if the given node a `TSAsExpression` node. Otherwise, pass through it.
	* @template T Node type
	* @param {T | TSAsExpression} node The node to address.
	* @returns {T} The `TSAsExpression#expression` value if the node is a `TSAsExpression` node. Otherwise, the node.
	*/
	function skipTSAsExpression(node) {
		if (!node) return node;
		if (node.type === "TSAsExpression") return skipTSAsExpression(node.expression);
		return node;
	}
	/**
	* Gets the parent node of the given node. This method returns a value ignoring `X as F`.
	* @param {Expression} node
	* @returns {ASTNode}
	*/
	function getParent(node) {
		let parent = node.parent;
		while (parent.type === "TSAsExpression") parent = parent.parent;
		return parent;
	}
	/**
	* Checks if the given node is a property value.
	* @param {Property} prop
	* @param {Expression} node
	*/
	function isPropertyChain(prop, node) {
		let value = node;
		while (value.parent.type === "TSAsExpression") value = value.parent;
		return prop === value.parent && prop.value === value;
	}
	/**
	* Retrieve `AssignmentPattern#left` value if the given node a `AssignmentPattern` node. Otherwise, pass through it.
	* @template T Node type
	* @param {T | AssignmentPattern} node The node to address.
	* @return {T} The `AssignmentPattern#left` value if the node is a `AssignmentPattern` node. Otherwise, the node.
	*/
	function skipDefaultParamValue(node) {
		if (!node) return node;
		if (node.type === "AssignmentPattern") return skipDefaultParamValue(node.left);
		return node;
	}
	/**
	* Retrieve `ChainExpression#expression` value if the given node a `ChainExpression` node. Otherwise, pass through it.
	* @template T Node type
	* @param {T | ChainExpression} node The node to address.
	* @returns {T} The `ChainExpression#expression` value if the node is a `ChainExpression` node. Otherwise, the node.
	*/
	function skipChainExpression(node) {
		if (!node) return node;
		if (node.type === "ChainExpression") return skipChainExpression(node.expression);
		return node;
	}
	/**
	* Checks whether the given node is in a type annotation.
	* @param {ESNode} node
	* @returns {boolean}
	*/
	function withinTypeNode(node) {
		/** @type {ASTNode | null} */
		let target = node;
		while (target) {
			if (isTypeNode(target)) return true;
			target = target.parent;
		}
		return false;
	}
	/**
	* Gets the property name of a given node.
	* @param {Property|AssignmentProperty|MethodDefinition|MemberExpression} node - The node to get.
	* @return {string|null} The property name if static. Otherwise, null.
	*/
	function getStaticPropertyName(node) {
		if (node.type === "Property" || node.type === "MethodDefinition") {
			if (!node.computed) {
				const key$1 = node.key;
				if (key$1.type === "Identifier") return key$1.name;
			}
			const key = node.key;
			return getStringLiteralValue(key);
		} else if (node.type === "MemberExpression") {
			if (!node.computed) {
				const property$1 = node.property;
				if (property$1.type === "Identifier") return property$1.name;
				return null;
			}
			const property = node.property;
			return getStringLiteralValue(property);
		}
		return null;
	}
	/**
	* Gets the string of a given node.
	* @param {Literal|TemplateLiteral} node - The node to get.
	* @param {boolean} [stringOnly]
	* @return {string|null} The string if static. Otherwise, null.
	*/
	function getStringLiteralValue(node, stringOnly) {
		if (node.type === "Literal") {
			if (node.value == null) {
				if (!stringOnly && node.bigint != null) return node.bigint;
				return null;
			}
			if (typeof node.value === "string") return node.value;
			if (!stringOnly) return String(node.value);
			return null;
		}
		if (node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1) return node.quasis[0].value.cooked;
		return null;
	}
	/**
	* Gets the VExpressionContainer of a given node.
	* @param {ASTNode} node - The node to get.
	* @return {VExpressionContainer|null}
	*/
	function getVExpressionContainer(node) {
		/** @type {ASTNode | null} */
		let n = node;
		while (n && n.type !== "VExpressionContainer") n = n.parent;
		return n;
	}
	/**
	* @param {string} path
	*/
	function isTypeScriptFile(path$1) {
		return path$1.endsWith(".ts") || path$1.endsWith(".tsx") || path$1.endsWith(".mts");
	}
	/**
	* @param {string} path
	*/
	function isVueFile(path$1) {
		return path$1.endsWith(".vue") || path$1.endsWith(".jsx") || path$1.endsWith(".tsx");
	}
	/**
	* Checks whether the current file is uses `<script setup>`
	* @param {RuleContext} context The ESLint rule context object.
	*/
	function isScriptSetup(context) {
		return Boolean(getScriptSetupElement(context));
	}
	/**
	* Gets the element of `<script setup>`
	* @param {RuleContext} context The ESLint rule context object.
	* @returns {VElement | null} the element of `<script setup>`
	*/
	function getScriptSetupElement(context) {
		const sourceCode = context.sourceCode;
		const df = sourceCode.parserServices.getDocumentFragment && sourceCode.parserServices.getDocumentFragment();
		if (!df) return null;
		const scripts = df.children.filter(
			/** @returns {e is VElement} */
			(e) => isVElement(e) && e.name === "script"
		);
		if (scripts.length === 2) return scripts.find((e) => hasAttribute(e, "setup")) || null;
		else {
			const script = scripts[0];
			if (script && hasAttribute(script, "setup")) return script;
		}
		return null;
	}
	/**
	* Check whether the given node is a Vue component based
	* on the filename and default export type
	* export default {} in .vue || .jsx
	* @param {ESNode} node Node to check
	* @param {string} path File name with extension
	* @returns {boolean}
	*/
	function isVueComponentFile(node, path$1) {
		return isVueFile(path$1) && node.type === "ExportDefaultDeclaration" && node.declaration.type === "ObjectExpression";
	}
	/**
	* Get the Vue component definition type from given node
	* Vue.component('xxx', {}) || component('xxx', {})
	* @param {ObjectExpression} node Node to check
	* @returns {'component' | 'mixin' | 'extend' | 'createApp' | 'defineComponent' | 'defineNuxtComponent' | null}
	*/
	function getVueComponentDefinitionType(node) {
		const parent = getParent(node);
		if (parent.type === "CallExpression") {
			const callee = parent.callee;
			if (callee.type === "MemberExpression") {
				const calleeObject = skipTSAsExpression(callee.object);
				if (calleeObject.type === "Identifier") {
					const propName = getStaticPropertyName(callee);
					if (calleeObject.name === "Vue") return propName && isObjectArgument(parent) && (propName === "component" || propName === "mixin" || propName === "extend") ? propName : null;
					return propName && isObjectArgument(parent) && (propName === "component" || propName === "mixin") ? propName : null;
				}
			}
			if (callee.type === "Identifier") {
				if (callee.name === "component") return isObjectArgument(parent) ? "component" : null;
				if (callee.name === "createApp") return isObjectArgument(parent) ? "createApp" : null;
				if (callee.name === "defineComponent") return isObjectArgument(parent) ? "defineComponent" : null;
				if (callee.name === "defineNuxtComponent") return isObjectArgument(parent) ? "defineNuxtComponent" : null;
			}
		}
		return null;
	}
	/** @param {CallExpression} node */
	function isObjectArgument(node) {
		const lastArgument = node.arguments.at(-1);
		return lastArgument && skipTSAsExpression(lastArgument).type === "ObjectExpression";
	}
	/**
	* Check whether given node is new Vue instance
	* new Vue({})
	* @param {NewExpression} node Node to check
	* @returns {boolean}
	*/
	function isVueInstance(node) {
		const callee = node.callee;
		return Boolean(node.type === "NewExpression" && callee.type === "Identifier" && callee.name === "Vue" && node.arguments.length > 0 && skipTSAsExpression(node.arguments[0]).type === "ObjectExpression");
	}
	/**
	* If the given object is a Vue component or instance, returns the Vue definition type.
	* @param {RuleContext} context The ESLint rule context object.
	* @param {ObjectExpression} node Node to check
	* @returns { VueObjectType | null } The Vue definition type.
	*/
	function getVueObjectType(context, node) {
		if (node.type !== "ObjectExpression") return null;
		const parent = getParent(node);
		switch (parent.type) {
			case "ExportDefaultDeclaration": {
				const filePath = context.filename;
				if (isVueComponentFile(parent, filePath) && skipTSAsExpression(parent.declaration) === node) {
					const scriptSetup = getScriptSetupElement(context);
					if (scriptSetup && scriptSetup.range[0] <= parent.range[0] && parent.range[1] <= scriptSetup.range[1]) return null;
					return "export";
				}
				break;
			}
			case "CallExpression":
				if (getVueComponentDefinitionType(node) != null && skipTSAsExpression(parent.arguments.at(-1)) === node) return "definition";
				break;
			case "NewExpression":
				if (isVueInstance(parent) && skipTSAsExpression(parent.arguments[0]) === node) return "instance";
				break;
		}
		if (getComponentComments(context).some((el) => el.loc.end.line === node.loc.start.line - 1)) return "mark";
		return null;
	}
	/**
	* Checks whether the given object is an SFC definition.
	* @param {RuleContext} context The ESLint rule context object.
	* @param {ObjectExpression} node Node to check
	* @returns { boolean } `true`, the given object is an SFC definition.
	*/
	function isSFCObject(context, node) {
		if (node.type !== "ObjectExpression") return false;
		const filePath = context.filename;
		const ext = path.extname(filePath);
		if (ext !== ".vue" && ext) return false;
		return isSFC(node);
		/**
		* @param {Expression} node
		* @returns {boolean}
		*/
		function isSFC(node$1) {
			const parent = getParent(node$1);
			switch (parent.type) {
				case "ExportDefaultDeclaration": {
					if (skipTSAsExpression(parent.declaration) !== node$1) return false;
					const scriptSetup = getScriptSetupElement(context);
					if (scriptSetup && scriptSetup.range[0] <= parent.range[0] && parent.range[1] <= scriptSetup.range[1]) return false;
					return true;
				}
				case "CallExpression": {
					if (parent.arguments.every((arg) => skipTSAsExpression(arg) !== node$1)) return false;
					const { callee } = parent;
					if (callee.type === "Identifier" && (callee.name === "defineComponent" || callee.name === "defineNuxtComponent") || callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "Vue" && callee.property.type === "Identifier" && callee.property.name === "extend") return isSFC(parent);
					return false;
				}
				case "VariableDeclarator": {
					if (skipTSAsExpression(parent.init) !== node$1 || parent.id.type !== "Identifier") return false;
					const variable = findVariable(getScope(context, node$1), parent.id);
					if (!variable) return false;
					return variable.references.some((ref) => isSFC(ref.identifier));
				}
			}
			return false;
		}
	}
	/**
	* Gets the component comments of a given context.
	* @param {RuleContext} context The ESLint rule context object.
	* @return {Token[]} The the component comments.
	*/
	function getComponentComments(context) {
		let tokens = componentComments.get(context);
		if (tokens) return tokens;
		tokens = context.sourceCode.getAllComments().filter((comment) => /@vue\/component/g.test(comment.value));
		componentComments.set(context, tokens);
		return tokens;
	}
	/**
	* Return generator with the all handler nodes defined in the given watcher property.
	* @param {Property|Expression} property
	* @returns {IterableIterator<Expression>}
	*/
	function* iterateWatchHandlerValues(property) {
		const value = property.type === "Property" ? property.value : property;
		if (value.type === "ObjectExpression") {
			const handler = findProperty(value, "handler");
			if (handler) yield handler.value;
		} else if (value.type === "ArrayExpression") {
			for (const element of value.elements.filter(isDef)) if (element.type !== "SpreadElement") yield* iterateWatchHandlerValues(element);
		} else yield value;
	}
	/**
	* Get the attribute which has the given name.
	* @param {VElement} node The start tag node to check.
	* @param {string} name The attribute name to check.
	* @param {string} [value] The attribute value to check.
	* @returns {VAttribute | null} The found attribute.
	*/
	function getAttribute(node, name, value) {
		return node.startTag.attributes.find(
			/**
			* @param {VAttribute | VDirective} node
			* @returns {node is VAttribute}
			*/
			(node$1) => !node$1.directive && node$1.key.name === name && (value === void 0 || node$1.value != null && node$1.value.value === value)
		) || null;
	}
	/**
	* Get the directive list which has the given name.
	* @param {VElement | VStartTag} node The start tag node to check.
	* @param {string} name The directive name to check.
	* @returns {VDirective[]} The array of `v-slot` directives.
	*/
	function getDirectives(node, name) {
		return (node.type === "VElement" ? node.startTag.attributes : node.attributes).filter(
			/**
			* @param {VAttribute | VDirective} node
			* @returns {node is VDirective}
			*/
			(node$1) => node$1.directive && node$1.key.name.name === name
		);
	}
	/**
	* Get the directive which has the given name.
	* @param {VElement} node The start tag node to check.
	* @param {string} name The directive name to check.
	* @param {string} [argument] The directive argument to check.
	* @returns {VDirective | null} The found directive.
	*/
	function getDirective(node, name, argument) {
		return node.startTag.attributes.find(
			/**
			* @param {VAttribute | VDirective} node
			* @returns {node is VDirective}
			*/
			(node$1) => node$1.directive && node$1.key.name.name === name && (argument === void 0 || (node$1.key.argument && node$1.key.argument.type === "VIdentifier" && node$1.key.argument.name) === argument)
		) || null;
	}
	/**
	* Check whether the given start tag has specific directive.
	* @param {VElement} node The start tag node to check.
	* @param {string} name The attribute name to check.
	* @param {string} [value] The attribute value to check.
	* @returns {boolean} `true` if the start tag has the attribute.
	*/
	function hasAttribute(node, name, value) {
		return Boolean(getAttribute(node, name, value));
	}
	/**
	* Check whether the given start tag has specific directive.
	* @param {VElement} node The start tag node to check.
	* @param {string} name The directive name to check.
	* @param {string} [argument] The directive argument to check.
	* @returns {boolean} `true` if the start tag has the directive.
	*/
	function hasDirective(node, name, argument) {
		return Boolean(getDirective(node, name, argument));
	}
	/**
	* Check whether the given directive node is v-bind same-name shorthand.
	* @param {VAttribute | VDirective} node The directive node to check.
	* @returns {node is VDirective & { value: VExpressionContainer & { expression: Identifier } }} `true` if the directive node is v-bind same-name shorthand.
	*/
	function isVBindSameNameShorthand(node) {
		return node.directive && node.key.name.name === "bind" && node.value?.expression?.type === "Identifier" && node.key.range[0] <= node.value.range[0] && node.value.range[1] <= node.key.range[1];
	}
	/**
	* Checks whether given defineProps call node has withDefaults.
	* @param {CallExpression} node The node of defineProps
	* @returns {node is CallExpression & { parent: CallExpression }}
	*/
	function hasWithDefaults(node) {
		return node.parent && node.parent.type === "CallExpression" && node.parent.arguments[0] === node && node.parent.callee.type === "Identifier" && node.parent.callee.name === "withDefaults";
	}
	/**
	* Get the withDefaults call node from given defineProps call node.
	* @param {CallExpression} node The node of defineProps
	* @returns {CallExpression | null}
	*/
	function getWithDefaults(node) {
		return hasWithDefaults(node) ? node.parent : null;
	}
	/**
	* Gets a map of the property nodes defined in withDefaults.
	* @param {CallExpression} node The node of defineProps
	* @returns { { [key: string]: Property | undefined } }
	*/
	function getWithDefaultsProps(node) {
		if (!hasWithDefaults(node)) return {};
		const param = node.parent.arguments[1];
		if (!param || param.type !== "ObjectExpression") return {};
		/** @type {Record<string, Property>} */
		const result = {};
		for (const prop of param.properties) {
			if (prop.type !== "Property") continue;
			const name = getStaticPropertyName(prop);
			if (name != null) result[name] = prop;
		}
		return result;
	}
	/**
	* Gets the props destructure property nodes for defineProp.
	* @param {CallExpression} node The node of defineProps
	* @returns { Record<string, AssignmentProperty | undefined> }
	*/
	function getPropsDestructure(node) {
		/** @type {ReturnType<typeof getPropsDestructure>} */
		const result = Object.create(null);
		const left = getLeftOfDefineProps(node);
		if (!left || left.type !== "ObjectPattern") return result;
		for (const prop of left.properties) {
			if (prop.type !== "Property") continue;
			const name = getStaticPropertyName(prop);
			if (name != null) result[name] = prop;
		}
		return result;
	}
	/**
	* Gets the default definition nodes for defineProp
	* using the props destructure with assignment pattern.
	* @param {CallExpression} node The node of defineProps
	* @returns { Record<string, {prop: AssignmentProperty , expression: Expression} | undefined> }
	*/
	function getDefaultPropExpressionsForPropsDestructure(node) {
		/** @type {ReturnType<typeof getDefaultPropExpressionsForPropsDestructure>} */
		const result = Object.create(null);
		for (const [name, prop] of Object.entries(getPropsDestructure(node))) {
			if (!prop) continue;
			const value = prop.value;
			if (value.type !== "AssignmentPattern") continue;
			result[name] = {
				prop,
				expression: value.right
			};
		}
		return result;
	}
	/**
	* Gets the pattern of the left operand of defineProps.
	* @param {CallExpression} node The node of defineProps
	* @returns {Pattern | null} The pattern of the left operand of defineProps
	*/
	function getLeftOfDefineProps(node) {
		let target = node;
		if (hasWithDefaults(target)) target = target.parent;
		if (!target.parent) return null;
		if (target.parent.type === "VariableDeclarator" && target.parent.init === target) return target.parent.id;
		return null;
	}
	/**
	* Get all props from component options object.
	* @param {ObjectExpression} componentObject Object with component definition
	* @return {(ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp)[]} Array of component props
	*/
	function getComponentPropsFromOptions(componentObject) {
		const propsNode = componentObject.properties.find(
			/**
			* @param {ESNode} p
			* @returns {p is (Property & { key: Identifier & {name: 'props'} })}
			*/
			(p) => p.type === "Property" && getStaticPropertyName(p) === "props"
		);
		if (!propsNode) return [];
		if (propsNode.value.type !== "ObjectExpression" && propsNode.value.type !== "ArrayExpression") return [{
			type: "unknown",
			propName: null,
			node: propsNode.value
		}];
		return getComponentPropsFromDefine(propsNode.value);
	}
	/**
	* Get all emits from component options object.
	* @param {ObjectExpression} componentObject Object with component definition
	* @return {(ComponentArrayEmit | ComponentObjectEmit | ComponentUnknownEmit)[]} Array of component emits
	*/
	function getComponentEmitsFromOptions(componentObject) {
		const emitsNode = componentObject.properties.find(
			/**
			* @param {ESNode} p
			* @returns {p is (Property & { key: Identifier & {name: 'emits'} })}
			*/
			(p) => p.type === "Property" && getStaticPropertyName(p) === "emits"
		);
		if (!emitsNode) return [];
		if (emitsNode.value.type !== "ObjectExpression" && emitsNode.value.type !== "ArrayExpression") return [{
			type: "unknown",
			emitName: null,
			node: emitsNode.value
		}];
		return getComponentEmitsFromDefine(emitsNode.value);
	}
	/**
	* Get all props from `defineProps` call expression.
	* @param {RuleContext} context The rule context object.
	* @param {CallExpression} node `defineProps` call expression
	* @return {ComponentProp[]} Array of component props
	*/
	function getComponentPropsFromDefineProps(context, node) {
		if (node.arguments.length > 0) {
			const defNode = getObjectOrArray(context, node.arguments[0]);
			if (defNode) return getComponentPropsFromDefine(defNode);
			return [{
				type: "unknown",
				propName: null,
				node: node.arguments[0]
			}];
		}
		const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
		if (typeArguments && typeArguments.params.length > 0) return getComponentPropsFromTypeDefine(context, typeArguments.params[0]);
		return [{
			type: "unknown",
			propName: null,
			node: null
		}];
	}
	/**
	* Get all emits from `defineEmits` call expression.
	* @param {RuleContext} context The rule context object.
	* @param {CallExpression} node `defineEmits` call expression
	* @return {ComponentEmit[]} Array of component emits
	*/
	function getComponentEmitsFromDefineEmits(context, node) {
		if (node.arguments.length > 0) {
			const defNode = getObjectOrArray(context, node.arguments[0]);
			if (defNode) return getComponentEmitsFromDefine(defNode);
			return [{
				type: "unknown",
				emitName: null,
				node: node.arguments[0]
			}];
		}
		const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
		if (typeArguments && typeArguments.params.length > 0) return getComponentEmitsFromTypeDefine(context, typeArguments.params[0]);
		return [{
			type: "unknown",
			emitName: null,
			node: null
		}];
	}
	/**
	* Get all slots from `defineSlots` call expression.
	* @param {RuleContext} context The rule context object.
	* @param {CallExpression} node `defineSlots` call expression
	* @return {ComponentSlot[]} Array of component slots
	*/
	function getComponentSlotsFromDefineSlots(context, node) {
		const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
		if (typeArguments && typeArguments.params.length > 0) return getComponentSlotsFromTypeDefine(context, typeArguments.params[0]);
		return [{
			type: "unknown",
			slotName: null,
			node: null
		}];
	}
	/**
	* Get model info from `defineModel` call expression.
	* @param {RuleContext} _context The rule context object.
	* @param {CallExpression} node `defineModel` call expression
	* @return {ComponentModel} Object of component model
	*/
	function getComponentModelFromDefineModel(_context, node) {
		/** @type {ComponentModelName} */
		let name = {
			modelName: "modelValue",
			node: null
		};
		/** @type {Expression|null} */
		let options = node.arguments[0]?.type === "SpreadElement" ? null : node.arguments[0];
		if (node.arguments.length > 0) {
			const nameNodeCandidate = skipTSAsExpression(node.arguments[0]);
			if (nameNodeCandidate.type === "Literal") {
				name = {
					modelName: String(nameNodeCandidate.value),
					node: nameNodeCandidate
				};
				options = node.arguments[1]?.type === "SpreadElement" ? null : node.arguments[1];
			}
		}
		const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
		if (typeArguments && typeArguments.params.length > 0) return {
			name,
			options,
			typeNode: typeArguments.params[0]
		};
		return {
			name,
			options,
			typeNode: null
		};
	}
	/**
	* Get all props by looking at all component's properties
	* @param {ObjectExpression|ArrayExpression} propsNode Object with props definition
	* @return {(ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp)[]} Array of component props
	*/
	function getComponentPropsFromDefine(propsNode) {
		if (propsNode.type === "ObjectExpression") return propsNode.properties.map(
			/** @returns {ComponentArrayProp | ComponentObjectProp | ComponentUnknownProp} */
			(prop) => {
				if (!isProperty(prop)) return {
					type: "unknown",
					propName: null,
					node: prop
				};
				const propName = getStaticPropertyName(prop);
				if (propName != null) return {
					type: "object",
					key: prop.key,
					propName,
					value: skipTSAsExpression(prop.value),
					node: prop
				};
				return {
					type: "object",
					key: null,
					propName: null,
					value: skipTSAsExpression(prop.value),
					node: prop
				};
			}
		);
		return propsNode.elements.filter(isDef).map((prop) => {
			if (prop.type === "Literal" || prop.type === "TemplateLiteral") {
				const propName = getStringLiteralValue(prop);
				if (propName != null) return {
					type: "array",
					key: prop,
					propName,
					value: null,
					node: prop
				};
			}
			return {
				type: "array",
				key: null,
				propName: null,
				value: null,
				node: prop
			};
		});
	}
	/**
	* Get all emits by looking at all component's properties
	* @param {ObjectExpression|ArrayExpression} emitsNode Object with emits definition
	* @return {(ComponentArrayEmit | ComponentObjectEmit | ComponentUnknownEmit)[]} Array of component emits.
	*/
	function getComponentEmitsFromDefine(emitsNode) {
		if (emitsNode.type === "ObjectExpression") return emitsNode.properties.map((prop) => {
			if (!isProperty(prop)) return {
				type: "unknown",
				key: null,
				emitName: null,
				value: null,
				node: prop
			};
			const emitName = getStaticPropertyName(prop);
			if (emitName != null) return {
				type: "object",
				key: prop.key,
				emitName,
				value: skipTSAsExpression(prop.value),
				node: prop
			};
			return {
				type: "object",
				key: null,
				emitName: null,
				value: skipTSAsExpression(prop.value),
				node: prop
			};
		});
		return emitsNode.elements.filter(isDef).map((emit) => {
			if (emit.type === "Literal" || emit.type === "TemplateLiteral") {
				const emitName = getStringLiteralValue(emit);
				if (emitName != null) return {
					type: "array",
					key: emit,
					emitName,
					value: null,
					node: emit
				};
			}
			return {
				type: "array",
				key: null,
				emitName: null,
				value: null,
				node: emit
			};
		});
	}
	/**
	* @param {RuleContext} context The rule context object.
	* @param {ESNode} node
	* @returns {ObjectExpression | ArrayExpression | null}
	*/
	function getObjectOrArray(context, node) {
		if (node.type === "ObjectExpression") return node;
		if (node.type === "ArrayExpression") return node;
		if (node.type === "Identifier") {
			const variable = findVariable(getScope(context, node), node);
			if (variable != null && variable.defs.length === 1) {
				const def = variable.defs[0];
				if (def.type === "Variable" && def.parent.kind === "const" && def.node.id.type === "Identifier" && def.node.init) return getObjectOrArray(context, def.node.init);
			}
		}
		return null;
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_utils();
  }
});