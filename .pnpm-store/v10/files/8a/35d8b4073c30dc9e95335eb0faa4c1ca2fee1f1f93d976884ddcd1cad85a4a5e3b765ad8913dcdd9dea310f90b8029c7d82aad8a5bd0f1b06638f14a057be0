const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_openai = require_rolldown_runtime.__toESM(require("@langchain/openai"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_classic_document_loaders_fs_buffer = require_rolldown_runtime.__toESM(require("@langchain/classic/document_loaders/fs/buffer"));

//#region src/document_loaders/fs/openai_whisper_audio.ts
var openai_whisper_audio_exports = {};
require_rolldown_runtime.__export(openai_whisper_audio_exports, { OpenAIWhisperAudio: () => OpenAIWhisperAudio });
const MODEL_NAME = "whisper-1";
/**
* @example
* ```typescript
* const loader = new OpenAIWhisperAudio(
*   "./src/document_loaders/example_data/test.mp3",
* );
* const docs = await loader.load();
* console.log(docs);
* ```
*/
var OpenAIWhisperAudio = class extends __langchain_classic_document_loaders_fs_buffer.BufferLoader {
	openAIClient;
	transcriptionCreateParams;
	constructor(filePathOrBlob, fields) {
		super(filePathOrBlob);
		this.openAIClient = new __langchain_openai.OpenAIClient(fields?.clientOptions);
		this.transcriptionCreateParams = fields?.transcriptionCreateParams ?? {};
	}
	async parse(raw, metadata) {
		const fileName = metadata.source === "blob" ? metadata.blobType : metadata.source;
		const transcriptionResponse = await this.openAIClient.audio.transcriptions.create({
			file: await (0, __langchain_openai.toFile)(raw, fileName),
			model: MODEL_NAME,
			...this.transcriptionCreateParams
		});
		const document = new __langchain_core_documents.Document({
			pageContent: transcriptionResponse.text,
			metadata
		});
		return [document];
	}
};

//#endregion
exports.OpenAIWhisperAudio = OpenAIWhisperAudio;
Object.defineProperty(exports, 'openai_whisper_audio_exports', {
  enumerable: true,
  get: function () {
    return openai_whisper_audio_exports;
  }
});
//# sourceMappingURL=openai_whisper_audio.cjs.map