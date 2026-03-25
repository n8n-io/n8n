const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const html_to_text = require_rolldown_runtime.__toESM(require("html-to-text"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/web/confluence.ts
var confluence_exports = {};
require_rolldown_runtime.__export(confluence_exports, { ConfluencePagesLoader: () => ConfluencePagesLoader });
/**
* Class representing a document loader for loading pages from Confluence.
* @example
* ```typescript
* const loader = new ConfluencePagesLoader({
*   baseUrl: "https:
*   spaceKey: "~EXAMPLE362906de5d343d49dcdbae5dEXAMPLE",
*   username: "your-username",
*   accessToken: "your-access-token",
* });
* const documents = await loader.load();
* console.log(documents);
* ```
*/
var ConfluencePagesLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	baseUrl;
	spaceKey;
	username;
	accessToken;
	limit;
	maxRetries;
	/**
	* expand parameter for confluence rest api
	* description can be found at https://developer.atlassian.com/server/confluence/expansions-in-the-rest-api/
	*/
	expand;
	personalAccessToken;
	constructor({ baseUrl, spaceKey, username, accessToken, limit = 25, expand = "body.storage,version", personalAccessToken, maxRetries = 5 }) {
		super();
		this.baseUrl = baseUrl;
		this.spaceKey = spaceKey;
		this.username = username;
		this.accessToken = accessToken;
		this.limit = limit;
		this.expand = expand;
		this.personalAccessToken = personalAccessToken;
		this.maxRetries = maxRetries;
	}
	/**
	* Returns the authorization header for the request.
	* @returns The authorization header as a string, or undefined if no credentials were provided.
	*/
	get authorizationHeader() {
		if (this.personalAccessToken) return `Bearer ${this.personalAccessToken}`;
		else if (this.username && this.accessToken) {
			const authToken = Buffer.from(`${this.username}:${this.accessToken}`).toString("base64");
			return `Basic ${authToken}`;
		}
		return void 0;
	}
	/**
	* Fetches all the pages in the specified space and converts each page to
	* a Document instance.
	* @param options the extra options of the load function
	* @param options.limit The limit parameter to overwrite the size to fetch pages.
	* @param options.start The start parameter to set inital offset to fetch pages.
	* @returns Promise resolving to an array of Document instances.
	*/
	async load(options) {
		try {
			const pages = await this.fetchAllPagesInSpace(options?.start, options?.limit);
			return pages.map((page) => this.createDocumentFromPage(page));
		} catch (error) {
			console.error("Error:", error);
			return [];
		}
	}
	/**
	* Fetches data from the Confluence API using the provided URL.
	* @param url The URL to fetch data from.
	* @returns Promise resolving to the JSON response from the API.
	*/
	async fetchConfluenceData(url) {
		let retryCounter = 0;
		while (true) {
			retryCounter += 1;
			try {
				const initialHeaders = {
					"Content-Type": "application/json",
					Accept: "application/json"
				};
				const authHeader = this.authorizationHeader;
				if (authHeader) initialHeaders.Authorization = authHeader;
				const response = await fetch(url, { headers: initialHeaders });
				if (!response.ok) throw new Error(`Failed to fetch ${url} from Confluence: ${response.status}. Retrying...`);
				return await response.json();
			} catch (error) {
				if (retryCounter >= this.maxRetries) throw new Error(`Failed to fetch ${url} from Confluence (retry: ${retryCounter}): ${error}`);
			}
		}
	}
	/**
	* Recursively fetches all the pages in the specified space.
	* @param start The start parameter to paginate through the results.
	* @returns Promise resolving to an array of ConfluencePage objects.
	*/
	async fetchAllPagesInSpace(start = 0, limit = this.limit) {
		const url = `${this.baseUrl}/rest/api/content?spaceKey=${this.spaceKey}&limit=${limit}&start=${start}&expand=${this.expand}`;
		const data = await this.fetchConfluenceData(url);
		if (data.size === 0) return [];
		const nextPageStart = start + data.size;
		const nextPageResults = await this.fetchAllPagesInSpace(nextPageStart, limit);
		return data.results.concat(nextPageResults);
	}
	/**
	* Creates a Document instance from a ConfluencePage object.
	* @param page The ConfluencePage object to convert.
	* @returns A Document instance.
	*/
	createDocumentFromPage(page) {
		const htmlContent = page.body.storage.value;
		const htmlWithoutOtherMacros = htmlContent.replace(/<ac:structured-macro\s+ac:name="(attachments|view-file)"[^>]*(?:\/?>|>.*?<\/ac:structured-macro>)/gs, "[ATTACHMENT]");
		const codeBlocks = [];
		const htmlWithPlaceholders = htmlWithoutOtherMacros.replace(/<ac:structured-macro.*?<ac:parameter ac:name="language">(.*?)<\/ac:parameter>.*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body><\/ac:structured-macro>/g, (_, language, code) => {
			const placeholder = `CODE_BLOCK_${codeBlocks.length}`;
			codeBlocks.push({
				language,
				code: code.trim()
			});
			return `\n${placeholder}\n`;
		});
		let plainTextContent = (0, html_to_text.htmlToText)(htmlWithPlaceholders, {
			wordwrap: false,
			preserveNewlines: true
		});
		codeBlocks.forEach(({ language, code }, index) => {
			const placeholder = `CODE_BLOCK_${index}`;
			plainTextContent = plainTextContent.replace(placeholder, `\`\`\`${language}\n${code}\n\`\`\``);
		});
		const textWithoutEmptyLines = plainTextContent.replace(/^\s*[\r\n]/gm, "");
		return new __langchain_core_documents.Document({
			pageContent: textWithoutEmptyLines,
			metadata: {
				id: page.id,
				status: page.status,
				title: page.title,
				type: page.type,
				url: `${this.baseUrl}/spaces/${this.spaceKey}/pages/${page.id}`,
				version: page.version?.number,
				updated_by: page.version?.by?.displayName,
				updated_at: page.version?.when
			}
		});
	}
};

//#endregion
exports.ConfluencePagesLoader = ConfluencePagesLoader;
Object.defineProperty(exports, 'confluence_exports', {
  enumerable: true,
  get: function () {
    return confluence_exports;
  }
});
//# sourceMappingURL=confluence.cjs.map