const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/experimental/prompts/custom_format.ts
var custom_format_exports = {};
require_rolldown_runtime.__export(custom_format_exports, { CustomFormatPromptTemplate: () => CustomFormatPromptTemplate });
var CustomFormatPromptTemplate = class extends __langchain_core_prompts.PromptTemplate {
	static lc_name() {
		return "CustomPromptTemplate";
	}
	lc_serializable = false;
	templateValidator;
	renderer;
	constructor(input) {
		super(input);
		Object.assign(this, input);
		if (this.validateTemplate && this.templateValidator !== void 0) {
			let totalInputVariables = this.inputVariables;
			if (this.partialVariables) totalInputVariables = totalInputVariables.concat(Object.keys(this.partialVariables));
			if (typeof this.template === "string") this.templateValidator(this.template, totalInputVariables);
			else throw new Error(`Must pass in string as template. Received: ${this.template}`);
		}
	}
	/**
	* Load prompt template from a template
	*/
	static fromTemplate(template, { customParser,...rest }) {
		const names = /* @__PURE__ */ new Set();
		const nodes = customParser(template);
		for (const node of nodes) if (node.type === "variable") names.add(node.name);
		return new this({
			inputVariables: [...names],
			template,
			customParser,
			...rest
		});
	}
	/**
	* Formats the prompt template with the provided values.
	* @param values The values to be used to format the prompt template.
	* @returns A promise that resolves to a string which is the formatted prompt.
	*/
	async format(values) {
		const allValues = await this.mergePartialAndUserVariables(values);
		if (typeof this.template === "string") return this.renderer(this.template, allValues);
		else throw new Error(`Must pass in string as template. Received: ${this.template}`);
	}
};

//#endregion
exports.CustomFormatPromptTemplate = CustomFormatPromptTemplate;
Object.defineProperty(exports, 'custom_format_exports', {
  enumerable: true,
  get: function () {
    return custom_format_exports;
  }
});
//# sourceMappingURL=custom_format.cjs.map