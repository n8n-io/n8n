import { getKeyName, getTestInfo } from "../utils.js";

//#region lib/rules/test-case-property-ordering.ts
const defaultOrder = [
	"filename",
	"code",
	"output",
	"options",
	"parser",
	"languageOptions",
	"parserOptions",
	"globals",
	"env",
	"errors"
];
const keyNameMapper = (property) => getKeyName(property);
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "require the properties of a test case to be placed in a consistent order",
			category: "Tests",
			recommended: false,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/test-case-property-ordering.md"
		},
		fixable: "code",
		schema: [{
			type: "array",
			description: "What order to enforce for test case properties.",
			elements: { type: "string" }
		}],
		defaultOptions: [defaultOrder],
		messages: { inconsistentOrder: "The properties of a test case should be placed in a consistent order: [{{order}}]." }
	},
	create(context) {
		const order = context.options[0] || defaultOrder;
		const sourceCode = context.sourceCode;
		return { Program(ast) {
			getTestInfo(context, ast).forEach((testRun) => {
				[testRun.valid, testRun.invalid].forEach((tests) => {
					tests.forEach((test) => {
						const properties = test && test.type === "ObjectExpression" && test.properties || [];
						const keyNames = properties.map(keyNameMapper).filter((keyName) => keyName !== null);
						for (let i = 0, lastChecked = 0; i < keyNames.length; i++) {
							const current = order.indexOf(keyNames[i]);
							if (current !== -1 && (current < lastChecked || lastChecked === -1)) {
								let orderMsg = order.filter((item) => keyNames.includes(item));
								orderMsg = [...orderMsg, ...lastChecked === -1 ? keyNames.filter((item) => !order.includes(item)) : []];
								context.report({
									node: properties[i],
									messageId: "inconsistentOrder",
									data: { order: orderMsg.join(", ") },
									fix(fixer) {
										return orderMsg.map((key, index) => {
											const propertyToInsert = properties[keyNames.indexOf(key)];
											return fixer.replaceText(properties[index], sourceCode.getText(propertyToInsert));
										});
									}
								});
							}
							lastChecked = current;
						}
					});
				});
			});
		} };
	}
};

//#endregion
export { rule as default };