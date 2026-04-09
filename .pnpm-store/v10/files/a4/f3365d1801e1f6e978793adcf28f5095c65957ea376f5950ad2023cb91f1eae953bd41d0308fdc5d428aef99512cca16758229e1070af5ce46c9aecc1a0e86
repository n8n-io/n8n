'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/v-on-event-hyphenation.js
var require_v_on_event_hyphenation = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const { toRegExpGroupMatcher } = require_regexp$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce v-on event naming style on custom components in template",
				categories: ["vue3-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/v-on-event-hyphenation.html",
				defaultOptions: { vue3: ["always", { autofix: true }] }
			},
			fixable: "code",
			schema: [{ enum: ["always", "never"] }, {
				type: "object",
				properties: {
					autofix: { type: "boolean" },
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
				mustBeHyphenated: "v-on event '{{text}}' must be hyphenated.",
				cannotBeHyphenated: "v-on event '{{text}}' can't be hyphenated."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const option = context.options[0];
			const optionsPayload = context.options[1];
			const useHyphenated = option !== "never";
			/** @type {string[]} */
			const ignoredAttributes = optionsPayload && optionsPayload.ignore || [];
			const isIgnoredTag = toRegExpGroupMatcher(optionsPayload?.ignoreTags);
			const autofix = Boolean(optionsPayload && optionsPayload.autofix);
			const caseConverter = casing.getConverter(useHyphenated ? "kebab-case" : "camelCase");
			/**
			* @param {VDirective} node
			* @param {VIdentifier} argument
			* @param {string} name
			*/
			function reportIssue(node, argument, name) {
				const text = sourceCode.getText(node.key);
				context.report({
					node: node.key,
					loc: node.loc,
					messageId: useHyphenated ? "mustBeHyphenated" : "cannotBeHyphenated",
					data: { text },
					fix: autofix && !name.includes("_") ? (fixer) => fixer.replaceText(argument, caseConverter(name)) : null
				});
			}
			/**
			* @param {string} value
			*/
			function isIgnoredAttribute(value) {
				if (ignoredAttributes.some((attr) => value.includes(attr))) return true;
				return useHyphenated ? value.toLowerCase() === value : !/-/.test(value);
			}
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='on']"(node) {
				const element = node.parent.parent;
				if (!utils.isCustomComponent(element) || isIgnoredTag(element.rawName)) return;
				if (!node.key.argument || node.key.argument.type !== "VIdentifier") return;
				const name = node.key.argument.rawName;
				if (!name || isIgnoredAttribute(name)) return;
				reportIssue(node, node.key.argument, name);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_on_event_hyphenation();
  }
});