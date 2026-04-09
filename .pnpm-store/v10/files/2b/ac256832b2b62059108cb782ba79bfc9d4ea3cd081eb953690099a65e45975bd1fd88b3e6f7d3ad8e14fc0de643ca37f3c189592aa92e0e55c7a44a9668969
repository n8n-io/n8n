import { evaluateObjectProperties, getKeyName, getMetaSchemaNode, getMetaSchemaNodeProperty, getRuleInfo } from "../utils.js";

//#region lib/rules/require-meta-default-options.ts
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "require only rules with options to implement a `meta.defaultOptions` property",
			category: "Rules",
			recommended: true,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-default-options.md"
		},
		fixable: "code",
		schema: [],
		messages: {
			missingDefaultOptions: "Rule with non-empty schema is missing a `meta.defaultOptions` property.",
			unnecessaryDefaultOptions: "Rule with empty schema should not have a `meta.defaultOptions` property.",
			defaultOptionsMustBeArray: "Default options must be an array.",
			defaultOptionsMustNotBeEmpty: "Default options must not be empty."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const { scopeManager } = sourceCode;
		const ruleInfo = getRuleInfo(sourceCode);
		if (!ruleInfo) return {};
		const metaNode = ruleInfo.meta;
		const schemaProperty = getMetaSchemaNodeProperty(getMetaSchemaNode(metaNode, scopeManager), scopeManager);
		if (!schemaProperty) return {};
		const metaDefaultOptions = evaluateObjectProperties(metaNode, scopeManager).filter((p) => p.type === "Property").find((p) => getKeyName(p) === "defaultOptions");
		if (schemaProperty.type === "ArrayExpression" && schemaProperty.elements.length === 0) {
			if (metaDefaultOptions) context.report({
				node: metaDefaultOptions,
				messageId: "unnecessaryDefaultOptions",
				fix(fixer) {
					return fixer.remove(metaDefaultOptions);
				}
			});
			return {};
		}
		if (!metaDefaultOptions) {
			if (metaNode) context.report({
				node: metaNode,
				messageId: "missingDefaultOptions",
				fix(fixer) {
					return fixer.insertTextAfter(schemaProperty, ", defaultOptions: []");
				}
			});
			return {};
		}
		const metaDefaultOptionsValue = metaDefaultOptions.value.type === "TSAsExpression" || metaDefaultOptions.value.type === "TSSatisfiesExpression" ? metaDefaultOptions.value.expression : metaDefaultOptions.value;
		if (metaDefaultOptionsValue.type !== "ArrayExpression") {
			context.report({
				node: metaDefaultOptions.value,
				messageId: "defaultOptionsMustBeArray"
			});
			return {};
		}
		const isArrayRootSchema = schemaProperty.type === "ObjectExpression" && schemaProperty.properties.filter((property) => property.type === "Property").find((property) => property.key.name === "type")?.value.value === "array";
		if (metaDefaultOptionsValue.elements.length === 0 && !isArrayRootSchema) {
			context.report({
				node: metaDefaultOptions.value,
				messageId: "defaultOptionsMustNotBeEmpty"
			});
			return {};
		}
		return {};
	}
};

//#endregion
export { rule as default };