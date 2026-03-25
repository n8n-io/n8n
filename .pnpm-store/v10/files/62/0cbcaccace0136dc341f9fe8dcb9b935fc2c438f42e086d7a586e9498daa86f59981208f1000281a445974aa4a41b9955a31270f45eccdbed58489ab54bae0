import { __export } from "../../_virtual/rolldown_runtime.js";
import { CustomFormatPromptTemplate } from "./custom_format.js";
import Handlebars from "handlebars";

//#region src/experimental/prompts/handlebars.ts
var handlebars_exports = {};
__export(handlebars_exports, {
	HandlebarsPromptTemplate: () => HandlebarsPromptTemplate,
	interpolateHandlebars: () => interpolateHandlebars,
	parseHandlebars: () => parseHandlebars
});
const parseHandlebars = (template) => {
	const parsed = [];
	const nodes = [...Handlebars.parse(template).body];
	while (nodes.length) {
		const node = nodes.pop();
		if (node.type === "ContentStatement") {
			const text = node.value;
			parsed.push({
				type: "literal",
				text
			});
		} else if (node.type === "MustacheStatement") {
			const name = node.path.parts[0];
			const { original } = node.path;
			if (!!name && !original.startsWith("this.") && !original.startsWith("@")) parsed.push({
				type: "variable",
				name
			});
		} else if (node.type === "PathExpression") {
			const name = node.parts[0];
			const { original } = node;
			if (!!name && !original.startsWith("this.") && !original.startsWith("@")) parsed.push({
				type: "variable",
				name
			});
		} else if (node.type === "BlockStatement") nodes.push(...node.params, ...node.program.body);
	}
	return parsed;
};
const interpolateHandlebars = (template, values) => {
	const compiled = Handlebars.compile(template, { noEscape: true });
	return compiled(values);
};
var HandlebarsPromptTemplate = class extends CustomFormatPromptTemplate {
	static lc_name() {
		return "HandlebarsPromptTemplate";
	}
	/**
	* Load prompt template from a template
	*/
	static fromTemplate(template, params) {
		return super.fromTemplate(template, {
			...params,
			validateTemplate: false,
			customParser: parseHandlebars,
			renderer: interpolateHandlebars
		});
	}
};

//#endregion
export { HandlebarsPromptTemplate, handlebars_exports, interpolateHandlebars, parseHandlebars };
//# sourceMappingURL=handlebars.js.map