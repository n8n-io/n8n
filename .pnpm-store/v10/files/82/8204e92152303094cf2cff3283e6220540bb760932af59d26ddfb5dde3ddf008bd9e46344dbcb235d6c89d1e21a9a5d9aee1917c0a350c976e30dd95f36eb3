const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_classic_document_loaders_fs_text = require_rolldown_runtime.__toESM(require("@langchain/classic/document_loaders/fs/text"));
const __langchain_classic_document_loaders_fs_directory = require_rolldown_runtime.__toESM(require("@langchain/classic/document_loaders/fs/directory"));

//#region src/document_loaders/fs/notion.ts
var notion_exports = {};
require_rolldown_runtime.__export(notion_exports, { NotionLoader: () => NotionLoader });
/**
* A class that extends the DirectoryLoader class. It represents a
* document loader that loads documents from a directory in the Notion
* format. It uses the TextLoader for loading '.md' files and ignores
* unknown file types.
*/
var NotionLoader = class extends __langchain_classic_document_loaders_fs_directory.DirectoryLoader {
	constructor(directoryPath) {
		super(directoryPath, { ".md": (filePath) => new __langchain_classic_document_loaders_fs_text.TextLoader(filePath) }, true, __langchain_classic_document_loaders_fs_directory.UnknownHandling.Ignore);
	}
};

//#endregion
exports.NotionLoader = NotionLoader;
Object.defineProperty(exports, 'notion_exports', {
  enumerable: true,
  get: function () {
    return notion_exports;
  }
});
//# sourceMappingURL=notion.cjs.map