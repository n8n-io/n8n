'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_html_elements$1 = require('../utils/html-elements.js');
const require_svg_elements$1 = require('../utils/svg-elements.js');
const require_vue2_builtin_components$1 = require('../utils/vue2-builtin-components.js');
const require_vue3_builtin_components$1 = require('../utils/vue3-builtin-components.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_deprecated_html_elements$1 = require('../utils/deprecated-html-elements.js');

//#region lib/rules/no-reserved-component-names.js
/**
* @fileoverview disallow the use of reserved names in component definitions
* @author Jake Hassel <https://github.com/shadskii>
*/
var require_no_reserved_component_names = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const htmlElements = require_html_elements$1.default;
	const deprecatedHtmlElements = require_deprecated_html_elements$1.default;
	const svgElements = require_svg_elements$1.default;
	const RESERVED_NAMES_IN_VUE = new Set(require_vue2_builtin_components$1.default);
	const RESERVED_NAMES_IN_VUE3 = new Set(require_vue3_builtin_components$1.default);
	const kebabCaseElements = [
		"annotation-xml",
		"color-profile",
		"font-face",
		"font-face-src",
		"font-face-uri",
		"font-face-format",
		"font-face-name",
		"missing-glyph"
	];
	/** @param {string} word  */
	function isLowercase(word) {
		return /^[a-z]*$/.test(word);
	}
	/**
	* @param {Expression | SpreadElement} node
	* @returns {node is (Literal | TemplateLiteral)}
	*/
	function canVerify(node) {
		return node.type === "Literal" || node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1;
	}
	/**
	* @template T
	* @param {Set<T>} set
	* @param {Iterable<T>} iterable
	*/
	function addAll(set, iterable) {
		for (const element of iterable) set.add(element);
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow the use of reserved names in component definitions",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-reserved-component-names.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: {
					disallowVueBuiltInComponents: { type: "boolean" },
					disallowVue3BuiltInComponents: { type: "boolean" },
					htmlElementCaseSensitive: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: {
				reserved: "Name \"{{name}}\" is reserved.",
				reservedInHtml: "Name \"{{name}}\" is reserved in HTML.",
				reservedInVue: "Name \"{{name}}\" is reserved in Vue.js.",
				reservedInVue3: "Name \"{{name}}\" is reserved in Vue.js 3.x."
			}
		},
		create(context) {
			const options = context.options[0] || {};
			const disallowVueBuiltInComponents = options.disallowVueBuiltInComponents === true;
			const disallowVue3BuiltInComponents = options.disallowVue3BuiltInComponents === true;
			const htmlElementCaseSensitive = options.htmlElementCaseSensitive === true;
			const RESERVED_NAMES_IN_HTML = new Set(htmlElements);
			const RESERVED_NAMES_IN_OTHERS = new Set([
				...deprecatedHtmlElements,
				...kebabCaseElements,
				...svgElements
			]);
			if (!htmlElementCaseSensitive) {
				addAll(RESERVED_NAMES_IN_HTML, htmlElements.map(casing.capitalize));
				addAll(RESERVED_NAMES_IN_OTHERS, [
					...deprecatedHtmlElements.map(casing.capitalize),
					...kebabCaseElements.map(casing.pascalCase),
					...svgElements.filter(isLowercase).map(casing.capitalize)
				]);
			}
			const reservedNames = new Set([
				...RESERVED_NAMES_IN_HTML,
				...disallowVueBuiltInComponents ? RESERVED_NAMES_IN_VUE : [],
				...disallowVue3BuiltInComponents ? RESERVED_NAMES_IN_VUE3 : [],
				...RESERVED_NAMES_IN_OTHERS
			]);
			/**
			* @param {string} name
			* @returns {string}
			*/
			function getMessageId(name) {
				if (RESERVED_NAMES_IN_HTML.has(name)) return "reservedInHtml";
				if (RESERVED_NAMES_IN_VUE.has(name)) return "reservedInVue";
				if (RESERVED_NAMES_IN_VUE3.has(name)) return "reservedInVue3";
				return "reserved";
			}
			/**
			* @param {Literal | TemplateLiteral} node
			*/
			function reportIfInvalid(node) {
				let name;
				if (node.type === "TemplateLiteral") name = node.quasis[0].value.cooked;
				else name = `${node.value}`;
				if (reservedNames.has(name)) report(node, name);
			}
			/**
			* @param {ESNode} node
			* @param {string} name
			*/
			function report(node, name) {
				context.report({
					node,
					messageId: getMessageId(name),
					data: { name }
				});
			}
			return utils.compositingVisitors(utils.executeOnCallVueComponent(context, (node) => {
				if (node.arguments.length === 2) {
					const argument = node.arguments[0];
					if (canVerify(argument)) reportIfInvalid(argument);
				}
			}), utils.executeOnVue(context, (obj) => {
				for (const { node: node$1, name } of utils.getRegisteredComponents(obj)) if (reservedNames.has(name)) report(node$1, name);
				const node = utils.findProperty(obj, "name");
				if (!node) return;
				if (!canVerify(node.value)) return;
				reportIfInvalid(node.value);
			}), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				if (node.arguments.length === 0) return;
				const define = node.arguments[0];
				if (define.type !== "ObjectExpression") return;
				const nameNode = utils.findProperty(define, "name");
				if (!nameNode) return;
				if (!canVerify(nameNode.value)) return;
				reportIfInvalid(nameNode.value);
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_reserved_component_names();
  }
});