const require_base = require("../runnables/base.cjs");
const require_template = require("./template.cjs");
//#region src/prompts/dict.ts
var DictPromptTemplate = class extends require_base.Runnable {
	lc_namespace = [
		"langchain_core",
		"prompts",
		"dict"
	];
	lc_serializable = true;
	template;
	templateFormat;
	inputVariables;
	static lc_name() {
		return "DictPromptTemplate";
	}
	constructor(fields) {
		const templateFormat = fields.templateFormat ?? "f-string";
		const inputVariables = _getInputVariables(fields.template, templateFormat);
		super({
			inputVariables,
			...fields
		});
		this.template = fields.template;
		this.templateFormat = templateFormat;
		this.inputVariables = inputVariables;
	}
	async format(values) {
		return _insertInputVariables(this.template, values, this.templateFormat);
	}
	async invoke(values) {
		return await this._callWithConfig(this.format.bind(this), values, { runType: "prompt" });
	}
};
function _getInputVariables(template, templateFormat) {
	const inputVariables = [];
	for (const v of Object.values(template)) if (typeof v === "string") require_template.parseTemplate(v, templateFormat).forEach((t) => {
		if (t.type === "variable") inputVariables.push(t.name);
	});
	else if (Array.isArray(v)) {
		for (const x of v) if (typeof x === "string") require_template.parseTemplate(x, templateFormat).forEach((t) => {
			if (t.type === "variable") inputVariables.push(t.name);
		});
		else if (typeof x === "object") inputVariables.push(..._getInputVariables(x, templateFormat));
	} else if (typeof v === "object" && v !== null) inputVariables.push(..._getInputVariables(v, templateFormat));
	return Array.from(new Set(inputVariables));
}
function _insertInputVariables(template, inputs, templateFormat) {
	const formatted = {};
	for (const [k, v] of Object.entries(template)) if (typeof v === "string") formatted[k] = require_template.renderTemplate(v, templateFormat, inputs);
	else if (Array.isArray(v)) {
		const formattedV = [];
		for (const x of v) if (typeof x === "string") formattedV.push(require_template.renderTemplate(x, templateFormat, inputs));
		else if (typeof x === "object") formattedV.push(_insertInputVariables(x, inputs, templateFormat));
		formatted[k] = formattedV;
	} else if (typeof v === "object" && v !== null) formatted[k] = _insertInputVariables(v, inputs, templateFormat);
	else formatted[k] = v;
	return formatted;
}
//#endregion
exports.DictPromptTemplate = DictPromptTemplate;

//# sourceMappingURL=dict.cjs.map