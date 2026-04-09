import { evaluateObjectProperties, getKeyName, getTestInfo } from "../utils.js";

//#region lib/rules/require-test-case-name.ts
const violationFilters = {
	always: (testCase) => !testCase.hasName,
	objects: (testCase) => testCase.isObject && !testCase.hasName,
	"objects-with-config": (testCase) => testCase.isObject && testCase.hasConfig && !testCase.hasName
};
const violationMessages = {
	always: "nameRequiredAlways",
	objects: "nameRequiredObjects",
	"objects-with-config": "nameRequiredObjectsWithConfig"
};
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "require test cases to have a `name` property under certain conditions",
			category: "Tests",
			recommended: false,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-test-case-name.md"
		},
		schema: [{
			additionalProperties: false,
			properties: { require: {
				description: "When should the name property be required on a test case object.",
				enum: [
					"always",
					"objects",
					"objects-with-config"
				]
			} },
			type: "object"
		}],
		defaultOptions: [{ require: "objects-with-config" }],
		messages: {
			nameRequiredAlways: "This test case is missing the `name` property.  All test cases should have a name property.",
			nameRequiredObjects: "This test case is missing the `name` property.  Test cases defined as objects should have a name property.",
			nameRequiredObjectsWithConfig: "This test case is missing the `name` property.  Test cases defined as objects with additional configuration should have a name property."
		}
	},
	create(context) {
		const { require: requireOption = "objects-with-config" } = context.options[0] || {};
		const sourceCode = context.sourceCode;
		/**
		* Validates test cases and reports them if found in violation
		* @param cases A list of test case nodes
		*/
		function validateTestCases(cases) {
			const violations = cases.filter((testCase) => !!testCase).map((testCase) => {
				if (testCase.type === "Literal" || testCase.type === "TemplateLiteral") return {
					node: testCase,
					isObject: false,
					hasName: false,
					hasConfig: false
				};
				if (testCase.type === "ObjectExpression") {
					let hasName = false;
					let hasConfig = false;
					for (const property of evaluateObjectProperties(testCase, sourceCode.scopeManager)) if (property.type === "Property") {
						const keyName = getKeyName(property, sourceCode.getScope(testCase));
						if (keyName === "name") hasName = true;
						else if (keyName === "options" || keyName === "settings") hasConfig = true;
					}
					return {
						node: testCase,
						isObject: true,
						hasName,
						hasConfig
					};
				}
				return null;
			}).filter((testCase) => !!testCase).filter(violationFilters[requireOption]);
			for (const violation of violations) context.report({
				node: violation.node,
				messageId: violationMessages[requireOption]
			});
		}
		return { Program(ast) {
			getTestInfo(context, ast).map((testRun) => [...testRun.valid, ...testRun.invalid]).forEach(validateTestCases);
		} };
	}
};

//#endregion
export { rule as default };