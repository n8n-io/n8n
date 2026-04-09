import { evaluateObjectProperties, getKeyName, getTestInfo } from "../utils.js";

//#region lib/rules/unique-test-case-names.ts
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "enforce that all test cases with names have unique names",
			category: "Tests",
			recommended: false,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/unique-test-case-names.md"
		},
		schema: [],
		messages: { notUnique: "This test case name is not unique.  All test cases with names should have unique names." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		/**
		* Validates test cases and reports them if found in violation
		* @param cases A list of test case nodes
		*/
		function validateTestCases(cases) {
			const namesSeen = /* @__PURE__ */ new Set();
			const violatingNodes = [];
			cases.filter((testCase) => !!testCase).forEach((testCase) => {
				if (testCase.type === "ObjectExpression") {
					for (const property of evaluateObjectProperties(testCase, sourceCode.scopeManager)) if (property.type === "Property") {
						if (getKeyName(property, sourceCode.getScope(testCase)) === "name" && property.value.type === "Literal" && typeof property.value.value === "string") {
							const name = property.value.value;
							if (namesSeen.has(name)) violatingNodes.push(property.value);
							else namesSeen.add(name);
							break;
						}
					}
				}
			});
			for (const node of violatingNodes) context.report({
				node,
				messageId: "notUnique"
			});
		}
		return { Program(ast) {
			getTestInfo(context, ast).forEach((testInfo) => {
				validateTestCases(testInfo.valid);
				validateTestCases(testInfo.invalid);
			});
		} };
	}
};

//#endregion
export { rule as default };