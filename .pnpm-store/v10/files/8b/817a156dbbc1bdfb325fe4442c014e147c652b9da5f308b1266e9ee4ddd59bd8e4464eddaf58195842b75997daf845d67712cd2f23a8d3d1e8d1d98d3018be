import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { SonixSpeechRecognitionService } from "sonix-speech-recognition";

//#region src/document_loaders/web/sonix_audio.ts
var sonix_audio_exports = {};
__export(sonix_audio_exports, { SonixAudioTranscriptionLoader: () => SonixAudioTranscriptionLoader });
/**
* A class that represents a document loader for transcribing audio files
* using the Sonix Speech Recognition service.
* @example
* ```typescript
* const loader = new SonixAudioTranscriptionLoader({
*   sonixAuthKey: "SONIX_AUTH_KEY",
*   request: {
*     audioFilePath: "LOCAL_AUDIO_FILE_PATH",
*     fileName: "FILE_NAME",
*     language: "en",
*   },
* });
* const docs = await loader.load();
* ```
*/
var SonixAudioTranscriptionLoader = class extends BaseDocumentLoader {
	sonixSpeechRecognitionService;
	speechToTextRequest;
	constructor({ sonixAuthKey, request: speechToTextRequest }) {
		super();
		this.sonixSpeechRecognitionService = new SonixSpeechRecognitionService(sonixAuthKey);
		this.speechToTextRequest = speechToTextRequest;
	}
	/**
	* Performs the speech-to-text transcription using the
	* SonixSpeechRecognitionService and returns the transcribed text as a
	* Document object.
	* @returns An array of Document objects containing the transcribed text.
	*/
	async load() {
		const { text, status, error } = await this.sonixSpeechRecognitionService.speechToText(this.speechToTextRequest);
		if (status === "failed") throw new Error(`Failed to transcribe audio file. Error: ${error}`);
		const document = new Document({
			pageContent: text,
			metadata: { fileName: this.speechToTextRequest.fileName }
		});
		return [document];
	}
};

//#endregion
export { SonixAudioTranscriptionLoader, sonix_audio_exports };
//# sourceMappingURL=sonix_audio.js.map