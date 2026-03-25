Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/outputs.ts
var outputs_exports = /* @__PURE__ */ require("./_virtual/_rolldown/runtime.cjs").__exportAll({
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
exports.ChatGenerationChunk = ChatGenerationChunk;
exports.GenerationChunk = GenerationChunk;
exports.RUN_KEY = RUN_KEY;
Object.defineProperty(exports, "outputs_exports", {
	enumerable: true,
	get: function() {
		return outputs_exports;
	}
});

//# sourceMappingURL=outputs.cjs.map