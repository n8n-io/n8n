const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_document_loaders_fs_directory = require('./directory.cjs');
const node_path = require_rolldown_runtime.__toESM(require("node:path"));
const node_fs_promises = require_rolldown_runtime.__toESM(require("node:fs/promises"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/fs/multi_file.ts
var multi_file_exports = {};
require_rolldown_runtime.__export(multi_file_exports, { MultiFileLoader: () => MultiFileLoader });
/**
* A document loader that loads documents from multiple files. It extends the
* `BaseDocumentLoader` class and implements the `load()` method.
* @example
* ```typescript
*
* const multiFileLoader = new MultiFileLoader(
*   ["path/to/file1.pdf", "path/to/file2.txt"],
*   {
*     ".pdf": (path: string) => new PDFLoader(path),
*   },
* );
*
* const docs = await multiFileLoader.load();
* console.log({ docs });
*
* ```
*/
var MultiFileLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	constructor(filePaths, loaders, unknown = require_document_loaders_fs_directory.UnknownHandling.Warn) {
		super();
		this.filePaths = filePaths;
		this.loaders = loaders;
		this.unknown = unknown;
		if (Object.keys(loaders).length === 0) throw new Error("Must provide at least one loader");
		for (const extension in loaders) if (Object.hasOwn(loaders, extension)) {
			if (extension[0] !== ".") throw new Error(`Extension must start with a dot: ${extension}`);
		}
	}
	/**
	* Loads the documents from the provided file paths. It checks if the file
	* is a directory and ignores it. If a file is a file, it checks if there
	* is a corresponding loader function for the file extension in the `loaders`
	* mapping. If there is, it loads the documents. If there is no
	* corresponding loader function and `unknown` is set to `Warn`, it logs a
	* warning message. If `unknown` is set to `Error`, it throws an error.
	* @returns A promise that resolves to an array of loaded documents.
	*/
	async load() {
		const documents = [];
		for (const filePath of this.filePaths) {
			const fullPath = (0, node_path.resolve)(filePath);
			const fileStat = await (0, node_fs_promises.stat)(fullPath);
			if (fileStat.isDirectory()) {
				console.warn(`Ignoring directory: ${fullPath}`);
				continue;
			}
			const loaderFactory = this.loaders[(0, node_path.extname)(fullPath)];
			if (loaderFactory) {
				const loader = loaderFactory(fullPath);
				documents.push(...await loader.load());
			} else switch (this.unknown) {
				case require_document_loaders_fs_directory.UnknownHandling.Ignore: break;
				case require_document_loaders_fs_directory.UnknownHandling.Warn:
					console.warn(`Unknown file type: ${fullPath}`);
					break;
				case require_document_loaders_fs_directory.UnknownHandling.Error: throw new Error(`Unknown file type: ${fullPath}`);
				default: throw new Error(`Unknown unknown handling: ${this.unknown}`);
			}
		}
		return documents;
	}
};

//#endregion
exports.MultiFileLoader = MultiFileLoader;
Object.defineProperty(exports, 'multi_file_exports', {
  enumerable: true,
  get: function () {
    return multi_file_exports;
  }
});
//# sourceMappingURL=multi_file.cjs.map