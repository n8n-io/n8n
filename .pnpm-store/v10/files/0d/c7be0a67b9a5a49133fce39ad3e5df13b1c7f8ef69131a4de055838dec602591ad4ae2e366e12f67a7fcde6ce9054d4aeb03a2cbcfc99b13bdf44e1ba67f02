import { __export } from "../_virtual/rolldown_runtime.js";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms/arcjet.ts
var arcjet_exports = {};
__export(arcjet_exports, { ArcjetRedact: () => ArcjetRedact });
var ArcjetRedact = class extends LLM {
	static lc_name() {
		return "ArcjetRedact";
	}
	llm;
	entities;
	contextWindowSize;
	detect;
	replace;
	constructor(options) {
		super(options);
		if (options.entities && options.entities.length === 0) throw new Error("no entities configured for redaction");
		this.llm = options.llm;
		this.entities = options.entities;
		this.contextWindowSize = options.contextWindowSize;
		this.detect = options.detect;
		this.replace = options.replace;
	}
	_llmType() {
		return "arcjet_redact";
	}
	async _call(input, options) {
		const ajOptions = {
			entities: this.entities,
			contextWindowSize: this.contextWindowSize,
			detect: this.detect,
			replace: this.replace
		};
		const { redact } = await import("@arcjet/redact");
		const [redacted, unredact] = await redact(input, ajOptions);
		const result = await this.llm.invoke(redacted, options);
		return unredact(result);
	}
};

//#endregion
export { ArcjetRedact, arcjet_exports };
//# sourceMappingURL=arcjet.js.map