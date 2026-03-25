const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_experimental_prompts_custom_format = require('./custom_format.cjs');
const handlebars = require_rolldown_runtime.__toESM(require("handlebars"));

//#region src/experimental/prompts/handlebars.ts
var handlebars_exports = {};
require_rolldown_runtime.__export(handlebars_exports, {
	HandlebarsPromptTemplate: () => HandlebarsPromptTemplate,
	interpolateHandlebars: () => interpolateHandlebars,
	parseHandlebars: () => parseHandlebars
});
const parseHandlebars = (template) => {
	const parsed = [];
	const nodes = [...handlebars.default.parse(template).body];
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
	const compiled = handlebars.default.compile(template, { noEscape: true });
	return compiled(values);
};
var HandlebarsPromptTemplate = class extends require_experimental_prompts_custom_format.CustomFormatPromptTemplate {
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
exports.HandlebarsPromptTemplate = HandlebarsPromptTemplate;
Object.defineProperty(exports, 'handlebars_exports', {
  enumerable: true,
  get: function () {
    return handlebars_exports;
  }
});
exports.interpolateHandlebars = interpolateHandlebars;
exports.parseHandlebars = parseHandlebars;
//# sourceMappingURL=handlebars.cjs.map