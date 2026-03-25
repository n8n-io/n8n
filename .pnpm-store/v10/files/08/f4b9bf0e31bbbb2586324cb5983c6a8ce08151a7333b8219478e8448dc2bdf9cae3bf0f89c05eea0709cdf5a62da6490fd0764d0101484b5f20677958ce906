import { __exportAll } from "./_virtual/_rolldown/runtime.js";
//#region src/outputs.ts
var outputs_exports = /* @__PURE__ */ __exportAll({
	ChatGenerationChunk: () => ChatGenerationChunk,
	GenerationChunk: () => GenerationChunk,
	RUN_KEY: () => RUN_KEY
});
const RUN_KEY = "__run";
/**
* Chunk of a single generation. Used for streaming.
*/
var GenerationChunk = class GenerationChunk {
	text;
	generationInfo;
	constructor(fields) {
		this.text = fields.text;
		this.generationInfo = fields.generationInfo;
	}
	concat(chunk) {
		return new GenerationChunk({
			text: this.text + chunk.text,
			generationInfo: {
				...this.generationInfo,
				...chunk.generationInfo
			}
		});
	}
};
var ChatGenerationChunk = class ChatGenerationChunk extends GenerationChunk {
	message;
	constructor(fields) {
		super(fields);
		this.message = fields.message;
	}
	concat(chunk) {
		return new ChatGenerationChunk({
			text: this.text + chunk.text,
			generationInfo: {
				...this.generationInfo,
				...chunk.generationInfo
			},
			message: this.message.concat(chunk.message)
		});
	}
};
//#endregion
export { ChatGenerationChunk, GenerationChunk, RUN_KEY, outputs_exports };

//# sourceMappingURL=outputs.js.map