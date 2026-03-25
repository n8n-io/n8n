import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { Innertube } from "youtubei.js";

//#region src/document_loaders/web/youtube.ts
var youtube_exports = {};
__export(youtube_exports, { YoutubeLoader: () => YoutubeLoader });
/**
* A document loader for loading data from YouTube videos. It uses the
* youtubei.js library to fetch the transcript and video metadata.
* @example
* ```typescript
* const loader = new YoutubeLoader(
*   "https:
*   "en",
*   true,
* );
* const docs = await loader.load();
* ```
*/
var YoutubeLoader = class YoutubeLoader extends BaseDocumentLoader {
	videoId;
	language;
	addVideoInfo;
	constructor(config) {
		super();
		this.videoId = config.videoId;
		this.language = config?.language;
		this.addVideoInfo = config?.addVideoInfo ?? false;
	}
	/**
	* Extracts the videoId from a YouTube video URL.
	* @param url The URL of the YouTube video.
	* @returns The videoId of the YouTube video.
	*/
	static getVideoID(url) {
		const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})(?:[?&#]|$)/);
		if (match !== null) return match[1];
		else throw new Error("Failed to get youtube video id from the url");
	}
	/**
	* Creates a new instance of the YoutubeLoader class from a YouTube video
	* URL.
	* @param url The URL of the YouTube video.
	* @param config Optional configuration options for the YoutubeLoader instance, excluding the videoId.
	* @returns A new instance of the YoutubeLoader class.
	*/
	static createFromUrl(url, config) {
		const videoId = YoutubeLoader.getVideoID(url);
		return new YoutubeLoader({
			...config,
			videoId
		});
	}
	/**
	* Loads the transcript and video metadata from the specified YouTube
	* video. It uses the youtubei.js library to fetch the video metadata and transcripts.
	* @returns An array of Documents representing the retrieved data.
	*/
	async load() {
		let transcript;
		const metadata = { source: this.videoId };
		try {
			const youtube = await Innertube.create({
				lang: this.language,
				retrieve_player: false
			});
			const info = await youtube.getInfo(this.videoId);
			const transcriptData = await info.getTranscript();
			transcript = transcriptData.transcript.content?.body?.initial_segments.map((segment) => segment.snippet.text).join(" ") ?? "";
			if (transcript === void 0) throw new Error("Transcription not found");
			if (this.addVideoInfo) {
				const basicInfo = info.basic_info;
				metadata.description = basicInfo.short_description;
				metadata.title = basicInfo.title;
				metadata.view_count = basicInfo.view_count;
				metadata.author = basicInfo.author;
			}
		} catch (e) {
			throw new Error(`Failed to get YouTube video transcription: ${e.message}`);
		}
		const document = new Document({
			pageContent: transcript,
			metadata
		});
		return [document];
	}
};

//#endregion
export { YoutubeLoader, youtube_exports };
//# sourceMappingURL=youtube.js.map