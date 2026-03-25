const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));
const js_yaml = require_rolldown_runtime.__toESM(require("js-yaml"));
const __notionhq_client = require_rolldown_runtime.__toESM(require("@notionhq/client"));
const notion_to_md = require_rolldown_runtime.__toESM(require("notion-to-md"));
const notion_to_md_build_utils_notion_js = require_rolldown_runtime.__toESM(require("notion-to-md/build/utils/notion.js"));

//#region src/document_loaders/web/notionapi.ts
var notionapi_exports = {};
require_rolldown_runtime.__export(notionapi_exports, {
	NotionAPILoader: () => NotionAPILoader,
	isDatabase: () => isDatabase,
	isDatabaseResponse: () => isDatabaseResponse,
	isErrorResponse: () => isErrorResponse,
	isPage: () => isPage,
	isPageResponse: () => isPageResponse
});
const isPageResponse = (res) => !(0, __notionhq_client.isNotionClientError)(res) && res.object === "page";
const isDatabaseResponse = (res) => !(0, __notionhq_client.isNotionClientError)(res) && res.object === "database";
const isErrorResponse = (res) => (0, __notionhq_client.isNotionClientError)(res);
const isPage = (res) => isPageResponse(res) && (0, __notionhq_client.isFullPage)(res);
const isDatabase = (res) => isDatabaseResponse(res) && (0, __notionhq_client.isFullDatabase)(res);
/**
* A class that extends the BaseDocumentLoader class. It represents a
* document loader for loading documents from Notion using the Notion API.
* @example
* ```typescript
* const pageLoader = new NotionAPILoader({
*   clientOptions: { auth: "<NOTION_INTEGRATION_TOKEN>" },
*   id: "<PAGE_ID>",
*   type: "page",
* });
* const pageDocs = await pageLoader.load();
* const splitDocs = await splitter.splitDocuments(pageDocs);
*
* const dbLoader = new NotionAPILoader({
*   clientOptions: { auth: "<NOTION_INTEGRATION_TOKEN>" },
*   id: "<DATABASE_ID>",
*   type: "database",
*   propertiesAsHeader: true,
* });
* const dbDocs = await dbLoader.load();
* ```
*/
var NotionAPILoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	caller;
	notionClient;
	n2mClient;
	id;
	pageQueue;
	pageCompleted;
	pageQueueTotal;
	documents;
	rootTitle;
	onDocumentLoaded;
	propertiesAsHeader;
	constructor(options) {
		super();
		this.caller = new __langchain_core_utils_async_caller.AsyncCaller({
			maxConcurrency: 64,
			...options.callerOptions
		});
		this.notionClient = new __notionhq_client.Client({
			logger: () => {},
			...options.clientOptions
		});
		this.n2mClient = new notion_to_md.NotionToMarkdown({
			notionClient: this.notionClient,
			config: {
				parseChildPages: false,
				convertImagesToBase64: false
			}
		});
		this.id = options.id;
		this.pageQueue = [];
		this.pageCompleted = [];
		this.pageQueueTotal = 0;
		this.documents = [];
		this.rootTitle = "";
		this.onDocumentLoaded = options.onDocumentLoaded ?? ((_ti, _cu) => {});
		this.propertiesAsHeader = options.propertiesAsHeader || false;
	}
	/**
	* Adds a selection of page ids to the pageQueue and removes duplicates.
	* @param items An array of string ids
	*/
	addToQueue(...items) {
		const deDuped = items.filter((item) => !this.pageCompleted.concat(this.pageQueue).includes(item));
		this.pageQueue.push(...deDuped);
		this.pageQueueTotal += deDuped.length;
	}
	/**
	* Parses a Notion GetResponse object (page or database) and returns a string of the title.
	* @param obj The Notion GetResponse object to parse.
	* @returns The string of the title.
	*/
	getTitle(obj) {
		if (isPage(obj)) {
			const titleProp = Object.values(obj.properties).find((prop) => prop.type === "title");
			if (titleProp) return this.getPropValue(titleProp);
		}
		if (isDatabase(obj)) return obj.title.map((v) => this.n2mClient.annotatePlainText(v.plain_text, v.annotations)).join("");
		return null;
	}
	/**
	* Parses the property type and returns a string
	* @param page The Notion page property to parse.
	* @returns A string of parsed property.
	*/
	getPropValue(prop) {
		switch (prop.type) {
			case "number": {
				const propNumber = prop[prop.type];
				return propNumber !== null ? propNumber.toString() : "";
			}
			case "url": return prop[prop.type] || "";
			case "select": return prop[prop.type]?.name ?? "";
			case "multi_select": return `[${prop[prop.type].map((v) => `"${v.name}"`).join(", ")}]`;
			case "status": return prop[prop.type]?.name ?? "";
			case "date": return `${prop[prop.type]?.start ?? ""}${prop[prop.type]?.end ? ` - ${prop[prop.type]?.end}` : ""}`;
			case "email": return prop[prop.type] || "";
			case "phone_number": return prop[prop.type] || "";
			case "checkbox": return prop[prop.type].toString();
			case "files": return `[${prop[prop.type].map((v) => `"${v.name}"`).join(", ")}]`;
			case "created_by": return `["${prop[prop.type].object}", "${prop[prop.type].id}"]`;
			case "created_time": return prop[prop.type];
			case "last_edited_by": return `["${prop[prop.type].object}", "${prop[prop.type].id}"]`;
			case "last_edited_time": return prop[prop.type];
			case "title": return prop[prop.type].map((v) => this.n2mClient.annotatePlainText(v.plain_text, v.annotations)).join("");
			case "rich_text": return prop[prop.type].map((v) => this.n2mClient.annotatePlainText(v.plain_text, v.annotations)).join("");
			case "people": return `[${prop[prop.type].map((v) => `["${v.object}", "${v.id}"]`).join(", ")}]`;
			case "unique_id": return `${prop[prop.type].prefix || ""}${prop[prop.type].number}`;
			case "relation": return `[${prop[prop.type].map((v) => `"${v.id}"`).join(", ")}]`;
			default: return `Unsupported type: ${prop.type}`;
		}
	}
	/**
	* Parses the properties of a Notion page and returns them as key-value
	* pairs.
	* @param page The Notion page to parse.
	* @returns An object containing the parsed properties as key-value pairs.
	*/
	parsePageProperties(page) {
		return Object.entries(page.properties).reduce((accum, [propName, prop]) => {
			const value = this.getPropValue(prop);
			const props = {
				...accum,
				[propName]: value
			};
			return prop.type === "title" ? {
				...props,
				_title: value
			} : props;
		}, {});
	}
	/**
	* Parses the details of a Notion page and returns them as an object.
	* @param page The Notion page to parse.
	* @returns An object containing the parsed details of the page.
	*/
	parsePageDetails(page) {
		const { id,...rest } = page;
		return {
			...rest,
			notionId: id,
			properties: this.parsePageProperties(page)
		};
	}
	/**
	* Loads a Notion block and returns it as an MdBlock object.
	* @param block The Notion block to load.
	* @returns A Promise that resolves to an MdBlock object.
	*/
	async loadBlock(block) {
		const mdBlock = {
			type: block.type,
			blockId: block.id,
			parent: await this.caller.call(() => this.n2mClient.blockToMarkdown(block)),
			children: []
		};
		if (block.has_children) {
			const block_id = block.type === "synced_block" && block.synced_block?.synced_from?.block_id ? block.synced_block.synced_from.block_id : block.id;
			const childBlocks = await this.loadBlocks(await this.caller.call(() => (0, notion_to_md_build_utils_notion_js.getBlockChildren)(this.notionClient, block_id, null)));
			mdBlock.children = childBlocks;
		}
		return mdBlock;
	}
	/**
	* Loads Notion blocks and their children recursively.
	* @param blocksResponse The response from the Notion API containing the blocks to load.
	* @returns A Promise that resolves to an array containing the loaded MdBlocks.
	*/
	async loadBlocks(blocksResponse) {
		const blocks = blocksResponse.filter(__notionhq_client.isFullBlock);
		const childPages = blocks.filter((block) => block.type.includes("child_page")).map((block) => block.id);
		if (childPages.length > 0) this.addToQueue(...childPages);
		const childDatabases = blocks.filter((block) => block.type.includes("child_database")).map((block) => this.caller.call(() => this.loadDatabase(block.id)));
		const loadingMdBlocks = blocks.filter((block) => !["child_page", "child_database"].includes(block.type)).map((block) => this.loadBlock(block));
		const [mdBlocks] = await Promise.all([Promise.all(loadingMdBlocks), Promise.all(childDatabases)]);
		return mdBlocks;
	}
	/**
	* Loads a Notion page and its child documents, then adds it to the completed documents array.
	* @param page The Notion page or page ID to load.
	*/
	async loadPage(page) {
		const [pageData, pageId] = typeof page === "string" ? [this.caller.call(() => this.notionClient.pages.retrieve({ page_id: page })), page] : [page, page.id];
		const [pageDetails, pageBlocks] = await Promise.all([pageData, this.caller.call(() => (0, notion_to_md_build_utils_notion_js.getBlockChildren)(this.notionClient, pageId, null))]);
		if (!(0, __notionhq_client.isFullPage)(pageDetails)) {
			this.pageCompleted.push(pageId);
			return;
		}
		const mdBlocks = await this.loadBlocks(pageBlocks);
		const mdStringObject = this.n2mClient.toMarkdownString(mdBlocks);
		let pageContent = mdStringObject.parent;
		const metadata = this.parsePageDetails(pageDetails);
		if (this.propertiesAsHeader) pageContent = `---\n${js_yaml.default.dump(metadata.properties)}---\n\n${pageContent ?? ""}`;
		if (!pageContent) {
			this.pageCompleted.push(pageId);
			return;
		}
		const pageDocument = new __langchain_core_documents.Document({
			pageContent,
			metadata
		});
		this.documents.push(pageDocument);
		this.pageCompleted.push(pageId);
		this.onDocumentLoaded(this.documents.length, this.pageQueueTotal, this.getTitle(pageDetails) || void 0, this.rootTitle);
	}
	/**
	* Loads a Notion database and adds it's pages to the queue.
	* @param id The ID of the Notion database to load.
	*/
	async loadDatabase(id) {
		try {
			for await (const page of (0, __notionhq_client.iteratePaginatedAPI)(this.notionClient.databases.query, {
				database_id: id,
				page_size: 50
			})) this.addToQueue(page.id);
		} catch (e) {
			console.log(e);
		}
	}
	/**
	* Loads the documents from Notion based on the specified options.
	* @returns A Promise that resolves to an array of Documents.
	*/
	async load() {
		const resPagePromise = this.notionClient.pages.retrieve({ page_id: this.id }).then((res) => {
			this.addToQueue(this.id);
			return res;
		}).catch((error) => error);
		const resDatabasePromise = this.notionClient.databases.retrieve({ database_id: this.id }).then(async (res) => {
			await this.loadDatabase(this.id);
			return res;
		}).catch((error) => error);
		const [resPage, resDatabase] = await Promise.all([resPagePromise, resDatabasePromise]);
		const errors = [resPage, resDatabase].filter(isErrorResponse);
		if (errors.length === 2) {
			if (errors.every((e) => e.code === __notionhq_client.APIErrorCode.ObjectNotFound)) throw new AggregateError([Error(`Could not find object with ID: ${this.id}. Make sure the relevant pages and databases are shared with your integration.`), ...errors]);
			throw new AggregateError(errors);
		}
		this.rootTitle = this.getTitle(resPage) || this.getTitle(resDatabase) || this.id;
		let pageId = this.pageQueue.shift();
		while (pageId) {
			await this.loadPage(pageId);
			pageId = this.pageQueue.shift();
		}
		return this.documents;
	}
};

//#endregion
exports.NotionAPILoader = NotionAPILoader;
exports.isDatabase = isDatabase;
exports.isDatabaseResponse = isDatabaseResponse;
exports.isErrorResponse = isErrorResponse;
exports.isPage = isPage;
exports.isPageResponse = isPageResponse;
Object.defineProperty(exports, 'notionapi_exports', {
  enumerable: true,
  get: function () {
    return notionapi_exports;
  }
});
//# sourceMappingURL=notionapi.cjs.map