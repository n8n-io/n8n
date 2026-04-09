//#region lib/rules/no-property-in-node.ts
const defaultTypedNodeSourceFileTesters = [/@types[/\\]estree[/\\]index\.d\.ts/, /@typescript-eslint[/\\]types[/\\]dist[/\\]generated[/\\]ast-spec\.d\.ts/];
/**
* Given a TypeScript type, determines whether the type appears to be for a known
* AST type from the typings of @typescript-eslint/types or estree.
* We check based on two rough conditions:
* - The type has a 'kind' property (as AST node types all do)
* - The type is declared in one of those package's .d.ts types
*
* @example
* ```
* module.exports = {
*  create(context) {
*    BinaryExpression(node) {
*      const type = services.getTypeAtLocation(node.right);
*      //    ^^^^
*      // This variable's type will be TSESTree.BinaryExpression
*    }
*  }
* }
* ```
*
* @returns Whether the type seems to include a known ESTree or TSESTree AST node.
*/
function isAstNodeType(type, typedNodeSourceFileTesters) {
	return (type.types || [type]).filter((typePart) => typePart.getProperty("type")).flatMap((typePart) => typePart.symbol && typePart.symbol.declarations || []).some((declaration) => {
		const fileName = declaration.getSourceFile().fileName;
		return fileName && typedNodeSourceFileTesters.some((tester) => tester.test(fileName));
	});
}
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "disallow using `in` to narrow node types instead of looking at properties",
			category: "Rules",
			recommended: false,
			requiresTypeChecking: true,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-property-in-node.md"
		},
		schema: [{
			type: "object",
			properties: { additionalNodeTypeFiles: {
				description: "Any additional regular expressions to consider source files defining AST Node types.",
				elements: { type: "string" },
				type: "array"
			} },
			additionalProperties: false
		}],
		defaultOptions: [{ additionalNodeTypeFiles: [] }],
		messages: { in: "Prefer checking specific node properties instead of a broad `in`." }
	},
	create(context) {
		const additionalNodeTypeFiles = context.options[0]?.additionalNodeTypeFiles ?? [];
		const typedNodeSourceFileTesters = [...defaultTypedNodeSourceFileTesters, ...additionalNodeTypeFiles.map((filePath) => new RegExp(filePath))];
		return { "BinaryExpression[operator=in]"(node) {
			const services = context.sourceCode.parserServices;
			if (!services.program) throw new Error("You have used a rule which requires parserServices to be generated. You must therefore provide a value for the \"parserOptions.project\" property for @typescript-eslint/parser.");
			const checker = services.program.getTypeChecker();
			const tsNode = services.esTreeNodeToTSNodeMap.get(node.right);
			if (isAstNodeType(checker.getTypeAtLocation(tsNode), typedNodeSourceFileTesters)) context.report({
				messageId: "in",
				node
			});
		} };
	}
};

//#endregion
export { rule as default };