'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');
const require_svg_attributes_weird_case$1 = require('../utils/svg-attributes-weird-case.js');

//#region lib/rules/attribute-hyphenation.js
/**
* @fileoverview Define a style for the props casing in templates.
* @author Armano
*/
var require_attribute_hyphenation = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const { toRegExpGroupMatcher } = require_regexp$1.default;
	const svgAttributes = require_svg_attributes_weird_case$1.default;
	/**
	* @param {VDirective | VAttribute} node
	* @returns {string | null}
	*/
	function getAttributeName(node) {
		if (!node.directive) return node.key.rawName;
		if ((node.key.name.name === "bind" || node.key.name.name === "model") && node.key.argument && node.key.argument.type === "VIdentifier") return node.key.argument.rawName;
		return null;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce attribute naming style on custom components in template",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/attribute-hyphenation.html"
			},
			fixable: "code",
			schema: [{ enum: ["always", "never"] }, {
				type: "object",
				properties: {
					ignore: {
						type: "array",
						items: { allOf: [
							{ type: "string" },
							{ not: {
								type: "string",
								pattern: ":exit$"
							} },
							{ not: {
								type: "string",
								pattern: String.raw`^\s*$`
							} }
						] },
						uniqueItems: true,
						additionalItems: false
					},
					ignoreTags: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
						additionalItems: false
					}
				},
				additionalProperties: false
			}],
			messages: {
				mustBeHyphenated: "Attribute '{{text}}' must be hyphenated.",
				cannotBeHyphenated: "Attribute '{{text}}' can't be hyphenated."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const option = context.options[0];
			const optionsPayload = context.options[1];
			const useHyphenated = option !== "never";
			const isIgnoredTagName = toRegExpGroupMatcher(optionsPayload?.ignoreTags);
			const ignoredAttributes = [
				"data-",
				"aria-",
				"slot-scope",
				...svgAttributes
			];
			if (optionsPayload && optionsPayload.ignore) ignoredAttributes.push(...optionsPayload.ignore);
			const caseConverter = casing.getExactConverter(useHyphenated ? "kebab-case" : "camelCase");
			/**
			* @param {VDirective | VAttribute} node
			* @param {string} name
			*/
			function reportIssue(node, name) {
				const text = sourceCode.getText(node.key);
				context.report({
					node: node.key,
					loc: node.loc,
					messageId: useHyphenated ? "mustBeHyphenated" : "cannotBeHyphenated",
					data: { text },
					fix: (fixer) => {
						if (text.includes("_")) return null;
						if (text.endsWith(".sync")) return null;
						if (/^[A-Z]/.test(name)) return null;
						return fixer.replaceText(node.key, text.replace(name, caseConverter(name)));
					}
				});
			}
			/**
			* @param {string} value
			*/
			function isIgnoredAttribute(value) {
				if (ignoredAttributes.some((attr) => value.includes(attr))) return true;
				return useHyphenated ? value.toLowerCase() === value : !/-/.test(value);
			}
			return utils.defineTemplateBodyVisitor(context, { VAttribute(node) {
				const element = node.parent.parent;
				if (!utils.isCustomComponent(element) && element.name !== "slot" || isIgnoredTagName(element.rawName)) return;
				const name = getAttributeName(node);
				if (name === null || isIgnoredAttribute(name)) return;
				reportIssue(node, name);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_attribute_hyphenation();
  }
});