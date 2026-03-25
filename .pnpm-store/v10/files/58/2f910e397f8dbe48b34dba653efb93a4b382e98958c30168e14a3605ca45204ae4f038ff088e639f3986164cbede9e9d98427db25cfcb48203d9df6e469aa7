import { __export } from "../../_virtual/rolldown_runtime.js";
import { OpenAIClient, toFile } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { BufferLoader } from "@langchain/classic/document_loaders/fs/buffer";

//#region src/document_loaders/fs/openai_whisper_audio.ts
var openai_whisper_audio_exports = {};
__export(openai_whisper_audio_exports, { OpenAIWhisperAudio: () => OpenAIWhisperAudio });
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
var OpenAIWhisperAudio = class extends BufferLoader {
	openAIClient;
	transcriptionCreateParams;
	constructor(filePathOrBlob, fields) {
		super(filePathOrBlob);
		this.openAIClient = new OpenAIClient(fields?.clientOptions);
		this.transcriptionCreateParams = fields?.transcriptionCreateParams ?? {};
	}
	async parse(raw, metadata) {
		const fileName = metadata.source === "blob" ? metadata.blobType : metadata.source;
		const transcriptionResponse = await this.openAIClient.audio.transcriptions.create({
			file: await toFile(raw, fileName),
			model: MODEL_NAME,
			...this.transcriptionCreateParams
		});
		const document = new Document({
			pageContent: transcriptionResponse.text,
			metadata
		});
		return [document];
	}
};

//#endregion
export { OpenAIWhisperAudio, openai_whisper_audio_exports };
//# sourceMappingURL=openai_whisper_audio.js.map