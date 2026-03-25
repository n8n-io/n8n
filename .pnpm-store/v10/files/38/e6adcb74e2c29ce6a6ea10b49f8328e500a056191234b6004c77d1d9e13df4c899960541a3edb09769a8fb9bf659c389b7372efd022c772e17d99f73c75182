const defaultTypedNodeSourceFileTesters = [
  /@types[/\\]estree[/\\]index\.d\.ts/,
  /@typescript-eslint[/\\]types[/\\]dist[/\\]generated[/\\]ast-spec\.d\.ts/
];
function isAstNodeType(type, typedNodeSourceFileTesters) {
  return (type.types || [type]).filter((typePart) => typePart.getProperty("type")).flatMap(
    (typePart) => typePart.symbol && typePart.symbol.declarations || []
  ).some((declaration) => {
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
      // @ts-expect-error -- need to augment the type of `Rule.RuleMetaData` to include `requiresTypeChecking`
      requiresTypeChecking: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-property-in-node.md"
    },
    schema: [
      {
        type: "object",
        properties: {
          additionalNodeTypeFiles: {
            description: "Any additional regular expressions to consider source files defining AST Node types.",
            elements: { type: "string" },
            type: "array"
          }
        },
        additionalProperties: false
      }
    ],
    defaultOptions: [{ additionalNodeTypeFiles: [] }],
    messages: {
      in: "Prefer checking specific node properties instead of a broad `in`."
    }
  },
  create(context) {
    const additionalNodeTypeFiles = context.options[0]?.additionalNodeTypeFiles ?? [];
    const typedNodeSourceFileTesters = [
      ...defaultTypedNodeSourceFileTesters,
      ...additionalNodeTypeFiles.map(
        (filePath) => new RegExp(filePath)
      )
    ];
    return {
      "BinaryExpression[operator=in]"(node) {
        const services = context.sourceCode.parserServices;
        if (!services.program) {
          throw new Error(
            'You have used a rule which requires parserServices to be generated. You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser.'
          );
        }
        const checker = services.program.getTypeChecker();
        const tsNode = services.esTreeNodeToTSNodeMap.get(node.right);
        const type = checker.getTypeAtLocation(tsNode);
        if (isAstNodeType(type, typedNodeSourceFileTesters)) {
          context.report({ messageId: "in", node });
        }
      }
    };
  }
};
var no_property_in_node_default = rule;
export {
  no_property_in_node_default as default
};
