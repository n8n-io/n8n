import { __export } from "../../_virtual/rolldown_runtime.js";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { DirectoryLoader, UnknownHandling } from "@langchain/classic/document_loaders/fs/directory";

//#region src/document_loaders/fs/notion.ts
var notion_exports = {};
__export(notion_exports, { NotionLoader: () => NotionLoader });
/**
* A class that extends the DirectoryLoader class. It represents a
* document loader that loads documents from a directory in the Notion
* format. It uses the TextLoader for loading '.md' files and ignores
* unknown file types.
*/
var NotionLoader = class extends DirectoryLoader {
	constructor(directoryPath) {
		super(directoryPath, { ".md": (filePath) => new TextLoader(filePath) }, true, UnknownHandling.Ignore);
	}
};

//#endregion
export { NotionLoader, notion_exports };
//# sourceMappingURL=notion.js.map