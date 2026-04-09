import { K as isSingleLine, f as createRule, g as import_ast_utils, i as getPropName } from "../utils.js";
var jsx_max_props_per_line_default = createRule({
	name: "jsx-max-props-per-line",
	meta: {
		type: "layout",
		docs: { description: "Enforce maximum of props on a single line in JSX" },
		fixable: "code",
		schema: [{ anyOf: [{
			type: "object",
			properties: { maximum: {
				type: "object",
				properties: {
					single: {
						type: "integer",
						minimum: 1
					},
					multi: {
						type: "integer",
						minimum: 1
					}
				},
				additionalProperties: false
			} },
			additionalProperties: false
		}, {
			type: "object",
			properties: {
				maximum: {
					type: "number",
					minimum: 1
				},
				when: {
					type: "string",
					enum: ["always", "multiline"]
				}
			},
			additionalProperties: false
		}] }],
		defaultOptions: [{ maximum: 1 }],
		messages: { newLine: "Prop `{{prop}}` must be placed on a new line" }
	},
	create(context, [configuration]) {
		const sourceCode = context.sourceCode;
		const { maximum } = configuration;
		const { single = Infinity, multi = Infinity } = typeof maximum === "number" ? {
			single: configuration.when === "multiline" ? Infinity : maximum,
			multi: maximum
		} : maximum;
		function generateFixFunction(line, max) {
			const output = [];
			const front = line[0].range[0];
			const back = line[line.length - 1].range[1];
			for (let i = 0; i < line.length; i += max) {
				const nodes = line.slice(i, i + max);
				output.push(nodes.reduce((prev, curr) => {
					if (prev === "") return sourceCode.getText(curr);
					return `${prev} ${sourceCode.getText(curr)}`;
				}, ""));
			}
			const code = output.join("\n");
			return function fix(fixer) {
				return fixer.replaceTextRange([front, back], code);
			};
		}
		return { JSXOpeningElement(node) {
			if (!node.attributes.length) return;
			const isSingleLineTag = isSingleLine(node);
			if ((isSingleLineTag ? single : multi) === Infinity) return;
			const linePartitionedProps = [[node.attributes[0]]];
			node.attributes.reduce((last, decl) => {
				if ((0, import_ast_utils.isTokenOnSameLine)(last, decl)) linePartitionedProps[linePartitionedProps.length - 1].push(decl);
				else linePartitionedProps.push([decl]);
				return decl;
			});
			linePartitionedProps.forEach((propsInLine) => {
				const maxPropsCountPerLine = isSingleLineTag && propsInLine[0].loc.start.line === node.loc.start.line ? single : multi;
				if (propsInLine.length > maxPropsCountPerLine) {
					const name = getPropName(sourceCode, propsInLine[maxPropsCountPerLine]);
					context.report({
						messageId: "newLine",
						node: propsInLine[maxPropsCountPerLine],
						data: { prop: name },
						fix: generateFixFunction(propsInLine, maxPropsCountPerLine)
					});
				}
			});
		} };
	}
});
export { jsx_max_props_per_line_default as t };
