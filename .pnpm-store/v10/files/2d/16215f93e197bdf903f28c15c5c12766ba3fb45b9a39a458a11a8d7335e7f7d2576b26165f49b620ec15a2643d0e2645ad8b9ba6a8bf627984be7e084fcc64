import { __export } from "../../_virtual/rolldown_runtime.js";
import { extname } from "../../utils/extname.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { UnknownHandling } from "@langchain/classic/document_loaders/fs/directory";
import ignore from "ignore";
import binaryExtensions from "binary-extensions";

//#region src/document_loaders/web/github.ts
var github_exports = {};
__export(github_exports, { GithubRepoLoader: () => GithubRepoLoader });
const extensions = /* @__PURE__ */ new Set(binaryExtensions);
/**
* A function that checks if a file path is a binary file based on its
* extension.
* @param name The file path to check.
* @returns A boolean indicating whether the file path is a binary file.
*/
function isBinaryPath(name) {
	return extensions.has(extname(name).slice(1).toLowerCase());
}
/**
* A class that extends the BaseDocumentLoader and implements the
* GithubRepoLoaderParams interface. It represents a document loader for
* loading files from a GitHub repository.
*/
var GithubRepoLoader = class GithubRepoLoader extends BaseDocumentLoader {
	baseUrl;
	apiUrl;
	owner;
	repo;
	initialPath;
	headers = {};
	branch;
	recursive;
	processSubmodules;
	unknown;
	accessToken;
	ignoreFiles;
	ignore;
	verbose;
	maxConcurrency;
	maxRetries;
	caller;
	ignorePaths;
	submoduleInfos;
	constructor(githubUrl, { accessToken = getEnvironmentVariable("GITHUB_ACCESS_TOKEN"), baseUrl = "https://github.com", apiUrl = "https://api.github.com", branch = "main", recursive = true, processSubmodules = false, unknown = UnknownHandling.Warn, ignoreFiles = [], ignorePaths, verbose = false, maxConcurrency = 2, maxRetries = 2,...rest } = {}) {
		super();
		this.baseUrl = baseUrl;
		this.apiUrl = apiUrl;
		const { owner, repo, path } = this.extractOwnerAndRepoAndPath(githubUrl);
		this.owner = owner;
		this.repo = repo;
		this.initialPath = path;
		this.branch = branch;
		this.recursive = recursive;
		if (processSubmodules && !recursive) throw new Error(`Input property "recursive" must be true if "processSubmodules" is true.`);
		this.processSubmodules = processSubmodules;
		this.unknown = unknown;
		this.accessToken = accessToken;
		this.ignoreFiles = ignoreFiles;
		this.verbose = verbose;
		this.maxConcurrency = maxConcurrency;
		this.maxRetries = maxRetries;
		this.headers = { "User-Agent": "langchain" };
		this.caller = new AsyncCaller({
			maxConcurrency,
			maxRetries,
			...rest
		});
		this.ignorePaths = ignorePaths;
		if (ignorePaths) this.ignore = ignore().add(ignorePaths);
		if (this.accessToken) this.headers = {
			...this.headers,
			Authorization: `Bearer ${this.accessToken}`
		};
	}
	/**
	* Extracts the owner, repository, and path from a GitHub URL.
	* @param url The GitHub URL to extract information from.
	* @returns An object containing the owner, repository, and path extracted from the GitHub URL.
	*/
	extractOwnerAndRepoAndPath(url) {
		const match = url.match(new RegExp(`${this.baseUrl}/([^/]+)/([^/]+)(/tree/[^/]+/(.+))?`, "i"));
		if (!match) throw new Error("Invalid GitHub URL format.");
		return {
			owner: match[1],
			repo: match[2],
			path: match[4] || ""
		};
	}
	/**
	* Fetches the files from the GitHub repository and creates Document
	* instances for each file. It also handles error handling based on the
	* unknown handling option.
	* @returns A promise that resolves to an array of Document instances.
	*/
	async load() {
		this.log(`Loading documents from ${this.baseUrl}/${this.owner}/${this.repo}/${this.initialPath}...`);
		const documents = (await this.processRepo()).map((fileResponse) => new Document({
			pageContent: fileResponse.contents,
			metadata: fileResponse.metadata
		}));
		if (this.processSubmodules) {
			await this.getSubmoduleInfo();
			for (const submoduleInfo of this.submoduleInfos) documents.push(...await this.loadSubmodule(submoduleInfo));
		}
		return documents;
	}
	/**
	* Asynchronously streams documents from the entire GitHub repository.
	* It is suitable for situations where processing large repositories in a memory-efficient manner is required.
	* @yields Yields a Promise that resolves to a Document object for each file or submodule content found in the repository.
	*/
	async *loadAsStream() {
		this.log(`Loading documents from ${this.baseUrl}/${this.owner}/${this.repo}/${this.initialPath}...`);
		yield* await this.processRepoAsStream(this.initialPath);
		if (!this.processSubmodules) return;
		await this.getSubmoduleInfo();
		for (const submoduleInfo of this.submoduleInfos) yield* await this.loadSubmoduleAsStream(submoduleInfo);
	}
	/**
	* Loads the information about Git submodules from the repository, if available.
	*/
	async getSubmoduleInfo() {
		this.log("Loading info about submodules...");
		const repoFiles = await this.fetchRepoFiles("");
		const gitmodulesFile = repoFiles.filter(({ name }) => name === ".gitmodules")?.[0];
		if (gitmodulesFile) {
			const gitmodulesContent = await this.fetchFileContent({ download_url: gitmodulesFile.download_url });
			this.submoduleInfos = await this.parseGitmodules(gitmodulesContent);
		} else this.submoduleInfos = [];
		this.log(`Found ${this.submoduleInfos.length} submodules:`);
		for (const submoduleInfo of this.submoduleInfos) this.log(JSON.stringify(submoduleInfo));
	}
	/**
	* Parses the given content of a .gitmodules file. Furthermore, queries the current SHA ref of all submodules.
	* Returns the submodule information as array.
	* @param gitmodulesContent the content of a .gitmodules file
	*/
	async parseGitmodules(gitmodulesContent) {
		let validGitmodulesContent = gitmodulesContent;
		if (!validGitmodulesContent.endsWith("\n")) validGitmodulesContent += "\n";
		const submodulePattern = /\[submodule "(.*?)"]\n((\s+.*?\s*=\s*.*?\n)*)/g;
		const keyValuePattern = /\s+(.*?)\s*=\s*(.*?)\s/g;
		const submoduleInfos = [];
		for (const [, name, propertyLines] of validGitmodulesContent.matchAll(submodulePattern)) {
			if (!name || !propertyLines) throw new Error("Could not parse submodule entry");
			const submodulePropertyLines = propertyLines.matchAll(keyValuePattern);
			let path;
			let url;
			for (const [, key, value] of submodulePropertyLines) {
				if (!key || !value) throw new Error(`Could not parse key/value pairs for submodule ${name}`);
				switch (key) {
					case "path":
						path = value;
						break;
					case "url":
						url = value;
						if (url.endsWith(".git")) url = url.substring(0, url.length - 4);
						break;
					default:
				}
			}
			if (!path || !url) throw new Error(`Missing properties for submodule ${name}`);
			const files = await this.fetchRepoFiles(path);
			const submoduleInfo = {
				name,
				path,
				url,
				ref: files[0].sha
			};
			submoduleInfos.push(submoduleInfo);
		}
		return submoduleInfos;
	}
	/**
	* Loads the documents of the given submodule. Uses the same parameters as for the current repository.
	* External submodules, i.e. submodules pointing to another GitHub instance, are ignored.
	* @param submoduleInfo the info about the submodule to be loaded
	*/
	async loadSubmodule(submoduleInfo) {
		if (!submoduleInfo.url.startsWith(this.baseUrl)) {
			this.log(`Ignoring external submodule ${submoduleInfo.url}.`);
			return [];
		} else if (!submoduleInfo.path.startsWith(this.initialPath)) {
			this.log(`Ignoring submodule ${submoduleInfo.url}, as it is not on initial path.`);
			return [];
		} else {
			this.log(`Accessing submodule ${submoduleInfo.name} (${submoduleInfo.url})...`);
			return new GithubRepoLoader(submoduleInfo.url, {
				accessToken: this.accessToken,
				apiUrl: this.apiUrl,
				baseUrl: this.baseUrl,
				branch: submoduleInfo.ref,
				recursive: this.recursive,
				processSubmodules: this.processSubmodules,
				unknown: this.unknown,
				ignoreFiles: this.ignoreFiles,
				ignorePaths: this.ignorePaths,
				verbose: this.verbose,
				maxConcurrency: this.maxConcurrency,
				maxRetries: this.maxRetries
			}).load();
		}
	}
	/**
	* Asynchronously processes and streams the contents of a specified submodule in the GitHub repository.
	* @param submoduleInfo the info about the submodule to be loaded
	* @yields Yields a Promise that resolves to a Document object for each file found in the submodule.
	*/
	async *loadSubmoduleAsStream(submoduleInfo) {
		if (!submoduleInfo.url.startsWith(this.baseUrl)) {
			this.log(`Ignoring external submodule ${submoduleInfo.url}.`);
			yield* [];
		}
		if (!submoduleInfo.path.startsWith(this.initialPath)) {
			this.log(`Ignoring submodule ${submoduleInfo.url}, as it is not on initial path.`);
			yield* [];
		}
		this.log(`Accessing submodule ${submoduleInfo.name} (${submoduleInfo.url})...`);
		const submoduleLoader = new GithubRepoLoader(submoduleInfo.url, {
			accessToken: this.accessToken,
			baseUrl: this.baseUrl,
			apiUrl: this.apiUrl,
			branch: submoduleInfo.ref,
			recursive: this.recursive,
			processSubmodules: this.processSubmodules,
			unknown: this.unknown,
			ignoreFiles: this.ignoreFiles,
			ignorePaths: this.ignorePaths,
			verbose: this.verbose,
			maxConcurrency: this.maxConcurrency,
			maxRetries: this.maxRetries
		});
		yield* await submoduleLoader.processRepoAsStream(submoduleInfo.path);
	}
	/**
	* Determines whether a file or directory should be ignored based on its
	* path and type.
	* @param path The path of the file or directory.
	* @param fileType The type of the file or directory.
	* @returns A boolean indicating whether the file or directory should be ignored.
	*/
	shouldIgnore(path, fileType) {
		if (fileType !== "dir" && isBinaryPath(path)) return true;
		if (this.ignore !== void 0) return this.ignore.ignores(path);
		return fileType !== "dir" && this.ignoreFiles.some((pattern) => {
			if (typeof pattern === "string") return path === pattern;
			try {
				return pattern.test(path);
			} catch {
				throw new Error(`Unknown ignore file pattern: ${pattern}`);
			}
		});
	}
	/**
	* Takes the file info and wrap it in a promise that will resolve to the file content and metadata
	* @param file
	* @returns
	*/
	async fetchFileContentWrapper(file) {
		const fileContent = await this.fetchFileContent(file).catch((error) => {
			this.handleError(`Failed wrap file content: ${file}, ${error}`);
		});
		return {
			contents: fileContent || "",
			metadata: {
				source: file.path,
				repository: `${this.baseUrl}/${this.owner}/${this.repo}`,
				branch: this.branch
			}
		};
	}
	/**
	* Maps a list of files / directories to a list of promises that will fetch the file / directory contents
	*/
	async getCurrentDirectoryFilePromises(files) {
		const currentDirectoryFilePromises = [];
		const currentDirectoryDirectoryPromises = [];
		for (const file of files) {
			if (file.type !== "dir" && this.shouldIgnore(file.path, file.type)) continue;
			if (file.type === "file" && file.size === 0) continue;
			if (file.type !== "dir") try {
				currentDirectoryFilePromises.push(this.fetchFileContentWrapper(file));
			} catch (e) {
				this.handleError(`Failed to fetch file content: ${file.path}, ${e}`);
			}
			else if (this.recursive) currentDirectoryDirectoryPromises.push(this.processDirectory(file.path));
		}
		const curDirDirectories = await Promise.all(currentDirectoryDirectoryPromises);
		return [...currentDirectoryFilePromises, ...curDirDirectories.flat()];
	}
	/**
	* Begins the process of fetching the contents of the repository
	*/
	async processRepo() {
		try {
			const files = await this.fetchRepoFiles(this.initialPath);
			const currentDirectoryFilePromises = await this.getCurrentDirectoryFilePromises(files);
			return Promise.all(currentDirectoryFilePromises);
		} catch (error) {
			this.handleError(`Failed to process directory: ${this.initialPath}, ${error}`);
			return Promise.reject(error);
		}
	}
	/**
	* Asynchronously processes the contents of the entire GitHub repository,
	* streaming each file as a Document object.
	* @param path The path of the directory to process.
	* @yields Yields a Promise that resolves to a Document object for each file found in the repository.
	*/
	async *processRepoAsStream(path) {
		const files = await this.fetchRepoFiles(path);
		for (const file of files) {
			if (file.type !== "dir" && this.shouldIgnore(file.path, file.type)) continue;
			if (file.type === "file") try {
				const fileResponse = await this.fetchFileContentWrapper(file);
				yield new Document({
					pageContent: fileResponse.contents,
					metadata: fileResponse.metadata
				});
			} catch (error) {
				this.handleError(`Failed to fetch file content: ${file.path}, ${error}`);
			}
			else if (this.recursive) yield* await this.processDirectoryAsStream(file.path);
		}
	}
	/**
	* Fetches the contents of a directory and maps the file / directory paths
	* to promises that will fetch the file / directory contents.
	* @param path The path of the directory to process.
	* @returns A promise that resolves to an array of promises that will fetch the file / directory contents.
	*/
	async processDirectory(path) {
		try {
			const files = await this.fetchRepoFiles(path);
			return this.getCurrentDirectoryFilePromises(files);
		} catch (error) {
			this.handleError(`Failed to process directory: ${path}, ${error}`);
			return Promise.reject(error);
		}
	}
	/**
	* Asynchronously processes the contents of a given directory in the GitHub repository,
	* streaming each file as a Document object.
	* @param path The path of the directory to process.
	* @yields Yields a Promise that resolves to a Document object for each file in the directory.
	*/
	async *processDirectoryAsStream(path) {
		const files = await this.fetchRepoFiles(path);
		for (const file of files) {
			if (file.type !== "dir" && this.shouldIgnore(file.path, file.type)) continue;
			if (file.type === "file") try {
				const fileResponse = await this.fetchFileContentWrapper(file);
				yield new Document({
					pageContent: fileResponse.contents,
					metadata: fileResponse.metadata
				});
			} catch {
				this.handleError(`Failed to fetch file content: ${file.path}`);
			}
			else if (this.recursive) yield* await this.processDirectoryAsStream(file.path);
		}
	}
	/**
	* Fetches the files from a GitHub repository.
	* If the path denotes a single file, the resulting array contains only one element.
	* @param path The path of the repository to fetch the files from.
	* @returns A promise that resolves to an array of GithubFile instances.
	*/
	async fetchRepoFiles(path) {
		const url = `${this.apiUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}?ref=${this.branch}`;
		return this.caller.call(async () => {
			this.log(`Fetching ${url}`);
			const response = await fetch(url, { headers: this.headers });
			const data = await response.json();
			if (!response.ok) throw new Error(`Unable to fetch repository files: ${response.status} ${JSON.stringify(data)}`);
			if (Array.isArray(data)) return data;
			else return [data];
		});
	}
	/**
	* Fetches the content of a file from a GitHub repository.
	* @param file The file to fetch the content from.
	* @returns A promise that resolves to the content of the file.
	*/
	async fetchFileContent(file) {
		return this.caller.call(async () => {
			this.log(`Fetching ${file.download_url}`);
			const response = await fetch(file.download_url, { headers: this.headers });
			return response.text();
		});
	}
	/**
	* Handles errors based on the unknown handling option.
	* @param message The error message.
	* @returns void
	*/
	handleError(message) {
		switch (this.unknown) {
			case UnknownHandling.Ignore: break;
			case UnknownHandling.Warn:
				console.warn(message);
				break;
			case UnknownHandling.Error: throw new Error(message);
			default: throw new Error(`Unknown unknown handling: ${this.unknown}`);
		}
	}
	/**
	* Logs the given message to the console, if parameter 'verbose' is set to true.
	* @param message the message to be logged.
	*/
	log(message) {
		if (this.verbose) console.log(message);
	}
};

//#endregion
export { GithubRepoLoader, github_exports };
//# sourceMappingURL=github.js.map