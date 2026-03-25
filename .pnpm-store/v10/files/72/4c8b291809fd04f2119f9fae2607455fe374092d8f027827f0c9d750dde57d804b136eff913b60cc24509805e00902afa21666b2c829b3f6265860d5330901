const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_classic_document_loaders_fs_text = require_rolldown_runtime.__toESM(require("@langchain/classic/document_loaders/fs/text"));
const srt_parser_2 = require_rolldown_runtime.__toESM(require("srt-parser-2"));

//#region src/document_loaders/fs/srt.ts
var srt_exports = {};
require_rolldown_runtime.__export(srt_exports, { SRTLoader: () => SRTLoader });
/**
* A class that extends the `TextLoader` class. It represents a document
* loader that loads documents from SRT (SubRip) subtitle files. It has a
* constructor that takes a `filePathOrBlob` parameter representing the
* path to the SRT file or a `Blob` object. The `parse()` method is
* implemented to parse the SRT file and extract the text content of each
* subtitle.
* @example
* ```typescript
* const loader = new SRTLoader("path/to/file.srt");
* const docs = await loader.load();
* console.log({ docs });
* ```
*/
var SRTLoader = class extends __langchain_classic_document_loaders_fs_text.TextLoader {
	constructor(filePathOrBlob) {
		super(filePathOrBlob);
	}
	/**
	* A protected method that takes a `raw` string as a parameter and returns
	* a promise that resolves to an array of strings. It parses the raw SRT
	* string using the `SRTParser2` class from the `srt-parser-2` module. It
	* retrieves the subtitle objects from the parsed SRT data and extracts
	* the text content from each subtitle object. It filters out any empty
	* text content and joins the non-empty text content with a space
	* separator.
	* @param raw The raw SRT string to be parsed.
	* @returns A promise that resolves to an array of strings representing the text content of each subtitle.
	*/
	async parse(raw) {
		const parser = new srt_parser_2.default();
		const srts = parser.fromSrt(raw);
		return [srts.map((srt) => srt.text).filter(Boolean).join(" ")];
	}
};

//#endregion
exports.SRTLoader = SRTLoader;
Object.defineProperty(exports, 'srt_exports', {
  enumerable: true,
  get: function () {
    return srt_exports;
  }
});
//# sourceMappingURL=srt.cjs.map