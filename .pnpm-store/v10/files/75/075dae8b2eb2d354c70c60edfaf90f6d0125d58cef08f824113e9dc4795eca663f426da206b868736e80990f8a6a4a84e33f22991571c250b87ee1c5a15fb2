const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));
const assemblyai = require_rolldown_runtime.__toESM(require("assemblyai"));

//#region src/document_loaders/web/assemblyai.ts
var assemblyai_exports = {};
require_rolldown_runtime.__export(assemblyai_exports, {
	AudioSubtitleLoader: () => AudioSubtitleLoader,
	AudioTranscriptLoader: () => AudioTranscriptLoader,
	AudioTranscriptParagraphsLoader: () => AudioTranscriptParagraphsLoader,
	AudioTranscriptSentencesLoader: () => AudioTranscriptSentencesLoader
});
const defaultOptions = { userAgent: { integration: {
	name: "LangChainJS",
	version: "1.0.1"
} } };
/**
* Base class for AssemblyAI loaders.
*/
var AssemblyAILoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	client;
	/**
	* Create a new AssemblyAI loader.
	* @param assemblyAIOptions The options to configure the AssemblyAI loader.
	* Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
	*/
	constructor(assemblyAIOptions) {
		super();
		let options = assemblyAIOptions;
		if (!options) options = {};
		if (!options.apiKey) options.apiKey = (0, __langchain_core_utils_env.getEnvironmentVariable)("ASSEMBLYAI_API_KEY");
		if (!options.apiKey) throw new Error("No AssemblyAI API key provided");
		this.client = new assemblyai.AssemblyAI({
			...defaultOptions,
			...options
		});
	}
};
var CreateTranscriptLoader = class extends AssemblyAILoader {
	transcribeParams;
	transcriptId;
	/**
	* Transcribe audio or retrieve an existing transcript by its ID.
	* @param params The parameters to transcribe audio, or the ID of the transcript to retrieve.
	* @param assemblyAIOptions The options to configure the AssemblyAI loader.
	* Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
	*/
	constructor(params, assemblyAIOptions) {
		super(assemblyAIOptions);
		if (typeof params === "string") this.transcriptId = params;
		else this.transcribeParams = params;
	}
	async transcribeOrGetTranscript() {
		if (this.transcriptId) return await this.client.transcripts.get(this.transcriptId);
		if (this.transcribeParams) {
			let transcribeParams;
			if ("audio_url" in this.transcribeParams) transcribeParams = {
				...this.transcribeParams,
				audio: this.transcribeParams.audio_url
			};
			else transcribeParams = this.transcribeParams;
			return await this.client.transcripts.transcribe(transcribeParams);
		} else throw new Error("No transcript ID or transcribe parameters provided");
	}
};
/**
* Transcribe audio and load the transcript as a document using AssemblyAI.
*/
var AudioTranscriptLoader = class extends CreateTranscriptLoader {
	/**
	* Transcribe audio and load the transcript as a document using AssemblyAI.
	* @returns A promise that resolves to a single document containing the transcript text
	* as the page content, and the transcript object as the metadata.
	*/
	async load() {
		const transcript = await this.transcribeOrGetTranscript();
		return [new __langchain_core_documents.Document({
			pageContent: transcript.text,
			metadata: transcript
		})];
	}
};
/**
* Transcribe audio and load the paragraphs of the transcript, creating a document for each paragraph.
*/
var AudioTranscriptParagraphsLoader = class extends CreateTranscriptLoader {
	/**
	* Transcribe audio and load the paragraphs of the transcript, creating a document for each paragraph.
	* @returns A promise that resolves to an array of documents, each containing a paragraph of the transcript.
	*/
	async load() {
		const transcript = await this.transcribeOrGetTranscript();
		const paragraphsResponse = await this.client.transcripts.paragraphs(transcript.id);
		return paragraphsResponse.paragraphs.map((p) => new __langchain_core_documents.Document({
			pageContent: p.text,
			metadata: p
		}));
	}
};
/**
* Transcribe audio and load the sentences of the transcript, creating a document for each sentence.
*/
var AudioTranscriptSentencesLoader = class extends CreateTranscriptLoader {
	/**
	* Transcribe audio and load the sentences of the transcript, creating a document for each sentence.
	* @returns A promise that resolves to an array of documents, each containing a sentence of the transcript.
	*/
	async load() {
		const transcript = await this.transcribeOrGetTranscript();
		const sentencesResponse = await this.client.transcripts.sentences(transcript.id);
		return sentencesResponse.sentences.map((p) => new __langchain_core_documents.Document({
			pageContent: p.text,
			metadata: p
		}));
	}
};
/**
* Transcribe audio and load subtitles for the transcript as `srt` or `vtt` format.
*/
var AudioSubtitleLoader = class extends CreateTranscriptLoader {
	/**
	* Create a new AudioSubtitleLoader.
	* @param params The parameters to transcribe audio, or the ID of the transcript to retrieve.
	* @param subtitleFormat The format of the subtitles, either `srt` or `vtt`.
	* @param assemblyAIOptions The options to configure the AssemblyAI loader.
	* Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
	*/
	constructor(params, subtitleFormat = "srt", assemblyAIOptions) {
		super(params, assemblyAIOptions);
		this.subtitleFormat = subtitleFormat;
		this.subtitleFormat = subtitleFormat;
	}
	/**
	* Transcribe audio and load subtitles for the transcript as `srt` or `vtt` format.
	* @returns A promise that resolves a document containing the subtitles as the page content.
	*/
	async load() {
		const transcript = await this.transcribeOrGetTranscript();
		const subtitles = await this.client.transcripts.subtitles(transcript.id, this.subtitleFormat);
		return [new __langchain_core_documents.Document({ pageContent: subtitles })];
	}
};

//#endregion
exports.AudioSubtitleLoader = AudioSubtitleLoader;
exports.AudioTranscriptLoader = AudioTranscriptLoader;
exports.AudioTranscriptParagraphsLoader = AudioTranscriptParagraphsLoader;
exports.AudioTranscriptSentencesLoader = AudioTranscriptSentencesLoader;
Object.defineProperty(exports, 'assemblyai_exports', {
  enumerable: true,
  get: function () {
    return assemblyai_exports;
  }
});
//# sourceMappingURL=assemblyai.cjs.map