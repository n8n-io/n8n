import { f as createRule } from "../utils.js";
var jsx_props_no_multi_spaces_default = createRule({
	name: "jsx-props-no-multi-spaces",
	meta: {
		type: "layout",
		docs: { description: "Disallow multiple spaces between inline JSX props. Deprecated, use `no-multi-spaces` rule instead." },
		fixable: "code",
		deprecated: {
			message: "The rule was replaced with a more general rule.",
			deprecatedSince: "5.0.0",
			replacedBy: [{ rule: {
				name: "no-multi-spaces",
				url: "https://eslint.style/rules/no-multi-spaces"
			} }]
		},
		schema: [],
		messages: {
			noLineGap: "Expected no line gap between “{{prop1}}” and “{{prop2}}”",
			onlyOneSpace: "Expected only one space between “{{prop1}}” and “{{prop2}}”"
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		function getPropName(propNode) {
			switch (propNode.type) {
				case "JSXSpreadAttribute": return sourceCode.getText(propNode.argument);
				case "JSXIdentifier": return propNode.name;
				case "JSXMemberExpression": return `${getPropName(propNode.object)}.${propNode.property.name}`;
				default: return propNode.name ? propNode.name.name : `${sourceCode.getText(propNode.object)}.${propNode.property.name}`;
			}
		}
		function hasEmptyLines(first, second) {
			const comments = sourceCode.getCommentsBefore ? sourceCode.getCommentsBefore(second) : [];
			const nodes = [].concat(first, comments, second);
			for (let i = 1; i < nodes.length; i += 1) {
				const prev = nodes[i - 1];
				if (nodes[i].loc.start.line - prev.loc.end.line >= 2) return true;
			}
			return false;
		}
		function checkSpacing(prev, node) {
			if (hasEmptyLines(prev, node)) context.report({
				messageId: "noLineGap",
				node,
				data: {
					prop1: getPropName(prev),
					prop2: getPropName(node)
				}
			});
			if (prev.loc.end.line !== node.loc.end.line) return;
			if (sourceCode.text.slice(prev.range[1], node.range[0]) !== " ") context.report({
				node,
				messageId: "onlyOneSpace",
				data: {
					prop1: getPropName(prev),
					prop2: getPropName(node)
				},
				fix(fixer) {
					return fixer.replaceTextRange([prev.range[1], node.range[0]], " ");
				}
			});
		}
		function containsGenericType(node) {
			return typeof node.typeArguments !== "undefined" && node.typeArguments?.type === "TSTypeParameterInstantiation";
		}
		function getGenericNode(node) {
			const name = node.name;
			if (containsGenericType(node)) {
				const type = node.typeArguments;
				return Object.assign({}, node, { range: [name.range[0], type?.range[1]] });
			}
			return name;
		}
		return { JSXOpeningElement(node) {
			node.attributes.reduce((prev, prop) => {
				checkSpacing(prev, prop);
				return prop;
			}, getGenericNode(node));
		} };
	}
});
export { jsx_props_no_multi_spaces_default as t };
