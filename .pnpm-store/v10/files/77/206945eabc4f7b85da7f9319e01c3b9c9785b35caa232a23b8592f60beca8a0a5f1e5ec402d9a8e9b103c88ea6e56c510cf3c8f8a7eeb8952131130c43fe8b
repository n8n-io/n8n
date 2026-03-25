import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnv } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { DirectoryLoader, UnknownHandling } from "@langchain/classic/document_loaders/fs/directory";
import yaml from "js-yaml";

//#region src/document_loaders/fs/obsidian.ts
var obsidian_exports = {};
__export(obsidian_exports, { ObsidianLoader: () => ObsidianLoader });
/**
* Represents a loader for Obsidian markdown files. This loader extends the BaseDocumentLoader
* and provides functionality to parse and extract metadata, tags, and dataview fields from
* Obsidian markdown files.
*/
var ObsidianFileLoader = class ObsidianFileLoader extends BaseDocumentLoader {
	filePath;
	encoding;
	collectMetadata;
	/**
	* Initializes a new instance of the ObsidianFileLoader class.
	* @param filePath The path to the Obsidian markdown file.
	* @param encoding The character encoding to use when reading the file. Defaults to 'utf-8'.
	* @param collectMetadata Determines whether metadata should be collected from the file. Defaults to true.
	*/
	constructor(filePath, { encoding = "utf-8", collectMetadata = true } = {}) {
		super();
		this.filePath = filePath;
		this.encoding = encoding;
		this.collectMetadata = collectMetadata;
	}
	static FRONT_MATTER_REGEX = /^---\n(.*?)\n---\n/s;
	/**
	* Parses the YAML front matter from the given content string.
	* @param content The string content of the markdown file.
	* @returns An object representing the parsed front matter.
	*/
	parseFrontMatter(content) {
		if (!this.collectMetadata) return {};
		const match = content.match(ObsidianFileLoader.FRONT_MATTER_REGEX);
		if (!match) return {};
		try {
			const frontMatter = yaml.load(match[1]);
			if (frontMatter.tags && typeof frontMatter.tags === "string") frontMatter.tags = frontMatter.tags.split(", ");
			return frontMatter;
		} catch {
			console.warn("Encountered non-yaml frontmatter");
			return {};
		}
	}
	/**
	* Removes YAML front matter from the given content string.
	* @param content The string content of the markdown file.
	* @returns The content string with the front matter removed.
	*/
	removeFrontMatter(content) {
		if (!this.collectMetadata) return content;
		return content.replace(ObsidianFileLoader.FRONT_MATTER_REGEX, "");
	}
	static TAG_REGEX = /(?:\s|^)#([a-zA-Z_][\w/-]*)/g;
	/**
	* Parses Obsidian-style tags from the given content string.
	* @param content The string content of the markdown file.
	* @returns A set of parsed tags.
	*/
	parseObsidianTags(content) {
		if (!this.collectMetadata) return /* @__PURE__ */ new Set();
		const matches = content.matchAll(ObsidianFileLoader.TAG_REGEX);
		const tags = /* @__PURE__ */ new Set();
		for (const match of matches) tags.add(match[1]);
		return tags;
	}
	static DATAVIEW_LINE_REGEX = /^\s*(\w+)::\s*(.*)$/gm;
	static DATAVIEW_INLINE_BRACKET_REGEX = /\[(\w+)::\s*(.*)\]/gm;
	static DATAVIEW_INLINE_PAREN_REGEX = /\((\w+)::\s*(.*)\)/gm;
	/**
	* Parses dataview fields from the given content string.
	* @param content The string content of the markdown file.
	* @returns A record object containing key-value pairs of dataview fields.
	*/
	parseObsidianDataviewFields(content) {
		if (!this.collectMetadata) return {};
		const fields = {};
		const lineMatches = content.matchAll(ObsidianFileLoader.DATAVIEW_LINE_REGEX);
		for (const [, key, value] of lineMatches) fields[key] = value;
		const bracketMatches = content.matchAll(ObsidianFileLoader.DATAVIEW_INLINE_BRACKET_REGEX);
		for (const [, key, value] of bracketMatches) fields[key] = value;
		const parenMatches = content.matchAll(ObsidianFileLoader.DATAVIEW_INLINE_PAREN_REGEX);
		for (const [, key, value] of parenMatches) fields[key] = value;
		return fields;
	}
	/**
	* Converts metadata to a format compatible with Langchain.
	* @param metadata The metadata object to convert.
	* @returns A record object containing key-value pairs of Langchain-compatible metadata.
	*/
	toLangchainCompatibleMetadata(metadata) {
		const result = {};
		for (const [key, value] of Object.entries(metadata)) if (typeof value === "string" || typeof value === "number") result[key] = value;
		else result[key] = JSON.stringify(value);
		return result;
	}
	/**
	* It loads the Obsidian file, parses it, and returns a `Document` instance.
	* @returns An array of `Document` instances to comply with the BaseDocumentLoader interface.
	*/
	async load() {
		const documents = [];
		const { basename, readFile, stat } = await ObsidianFileLoader.imports();
		const fileName = basename(this.filePath);
		const stats = await stat(this.filePath);
		let content = await readFile(this.filePath, this.encoding);
		const frontMatter = this.parseFrontMatter(content);
		const tags = this.parseObsidianTags(content);
		const dataviewFields = this.parseObsidianDataviewFields(content);
		content = this.removeFrontMatter(content);
		const metadata = {
			source: fileName,
			path: this.filePath,
			created: stats.birthtimeMs,
			lastModified: stats.mtimeMs,
			lastAccessed: stats.atimeMs,
			...this.toLangchainCompatibleMetadata(frontMatter),
			...dataviewFields
		};
		if (tags.size || frontMatter.tags) metadata.tags = Array.from(new Set([...tags, ...frontMatter.tags ?? []])).join(",");
		documents.push(new Document({
			pageContent: content,
			metadata
		}));
		return documents;
	}
	/**
	* Imports the necessary functions from the `node:path` and
	* `node:fs/promises` modules. It is used to dynamically import the
	* functions when needed. If the import fails, it throws an error
	* indicating that the modules failed to load.
	* @returns A promise that resolves to an object containing the imported functions.
	*/
	static async imports() {
		try {
			const { basename } = await import("node:path");
			const { readFile, stat } = await import("node:fs/promises");
			return {
				basename,
				readFile,
				stat
			};
		} catch (e) {
			console.error(e);
			throw new Error(`Failed to load fs/promises. ObsidianFileLoader available only on environment 'node'. It appears you are running environment '${getEnv()}'. See https://<link to docs> for alternatives.`);
		}
	}
};
/**
* Represents a loader for directories containing Obsidian markdown files. This loader extends
* the DirectoryLoader and provides functionality to load and parse '.md' files with YAML frontmatter,
* Obsidian tags, and Dataview fields.
*/
var ObsidianLoader = class extends DirectoryLoader {
	/**
	* Initializes a new instance of the ObsidianLoader class.
	* @param directoryPath The path to the directory containing Obsidian markdown files.
	* @param encoding The character encoding to use when reading files. Defaults to 'utf-8'.
	* @param collectMetadata Determines whether metadata should be collected from the files. Defaults to true.
	*/
	constructor(directoryPath, options) {
		super(directoryPath, { ".md": (filePath) => new ObsidianFileLoader(filePath, options) }, true, UnknownHandling.Ignore);
	}
};

//#endregion
export { ObsidianLoader, obsidian_exports };
//# sourceMappingURL=obsidian.js.map