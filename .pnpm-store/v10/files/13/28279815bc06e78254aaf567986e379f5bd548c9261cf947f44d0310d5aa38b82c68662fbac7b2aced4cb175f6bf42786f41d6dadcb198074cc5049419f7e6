import { getMetaSchemaNode, getMetaSchemaNodeProperty, getRuleInfo } from "../utils.js";
import { getStaticValue } from "@eslint-community/eslint-utils";

//#region lib/rules/no-meta-schema-default.ts
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "disallow rules `meta.schema` properties to include defaults",
			category: "Rules",
			recommended: true,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-meta-schema-default.md"
		},
		schema: [],
		messages: { foundDefault: "Disallowed default value in schema." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const { scopeManager } = sourceCode;
		const ruleInfo = getRuleInfo(sourceCode);
		if (!ruleInfo || !ruleInfo.meta) return {};
		const schemaNode = getMetaSchemaNode(ruleInfo.meta, scopeManager);
		if (!schemaNode) return {};
		const schemaProperty = getMetaSchemaNodeProperty(schemaNode, scopeManager);
		if (schemaProperty?.type === "ObjectExpression") checkSchemaElement(schemaProperty);
		else if (schemaProperty?.type === "ArrayExpression") for (const element of schemaProperty.elements) checkSchemaElement(element);
		return {};
		function checkSchemaElement(node) {
			if (node?.type !== "ObjectExpression") return;
			for (const property of node.properties) {
				if (property.type !== "Property") continue;
				const { key, value } = property;
				const staticKey = key.type === "Identifier" ? { value: key.name } : getStaticValue(key);
				if (!staticKey?.value) continue;
				switch (staticKey.value) {
					case "allOf":
					case "anyOf":
					case "oneOf":
						if (value.type === "ArrayExpression") for (const element of value.elements) checkSchemaElement(element);
						break;
					case "properties":
						if ("properties" in value && Array.isArray(value.properties)) {
							for (const prop of value.properties) if ("value" in prop && prop.value.type === "ObjectExpression") checkSchemaElement(prop.value);
						}
						break;
					case "elements":
						checkSchemaElement(value);
						break;
					case "default":
						context.report({
							messageId: "foundDefault",
							node: key
						});
						break;
				}
			}
		}
	}
};

//#endregion
export { rule as default };