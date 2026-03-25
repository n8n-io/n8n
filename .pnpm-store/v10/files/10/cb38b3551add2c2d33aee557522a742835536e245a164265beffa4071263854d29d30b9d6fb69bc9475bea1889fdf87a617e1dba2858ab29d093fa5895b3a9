import { __export } from "../_virtual/rolldown_runtime.js";
import { formatDocumentsAsString } from "../util/document.js";
import { MemoryVectorStore } from "../vectorstores/memory.js";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { RunnableSequence } from "@langchain/core/runnables";
import { Tool } from "@langchain/core/tools";
import { StringOutputParser } from "@langchain/core/output_parsers";
import * as cheerio from "cheerio";

//#region src/tools/webbrowser.ts
var webbrowser_exports = {};
__export(webbrowser_exports, {
	WebBrowser: () => WebBrowser,
	getText: () => getText,
	parseInputs: () => parseInputs
});
const parseInputs = (inputs) => {
	const [baseUrl, task] = inputs.split(",").map((input) => {
		let t = input.trim();
		t = t.startsWith("\"") ? t.slice(1) : t;
		t = t.endsWith("\"") ? t.slice(0, -1) : t;
		t = t.endsWith("/") ? t.slice(0, -1) : t;
		return t.trim();
	});
	return [baseUrl, task];
};
const getText = (html, baseUrl, summary) => {
	const $ = cheerio.load(html, { scriptingEnabled: true });
	let text = "";
	const rootElement = summary ? "body " : "*";
	$(`${rootElement}:not(style):not(script):not(svg)`).each((_i, elem) => {
		let content = $(elem).clone().children().remove().end().text().trim();
		const $el = $(elem);
		let href = $el.attr("href");
		if ($el.prop("tagName")?.toLowerCase() === "a" && href) {
			if (!href.startsWith("http")) try {
				href = new URL(href, baseUrl).toString();
			} catch {
				href = "";
			}
			const imgAlt = $el.find("img[alt]").attr("alt")?.trim();
			if (imgAlt) content += ` ${imgAlt}`;
			text += ` [${content}](${href})`;
		} else if (content !== "") text += ` ${content}`;
	});
	return text.trim().replace(/\n+/g, " ");
};
const getHtml = async (baseUrl, h, config) => {
	const domain = new URL(baseUrl).hostname;
	const headers = { ...h };
	headers.Host = domain;
	headers["Alt-Used"] = domain;
	let htmlResponse;
	try {
		const fetchOptions = {
			method: "GET",
			headers,
			credentials: config.withCredentials ? "include" : "same-origin",
			...config
		};
		htmlResponse = await fetch(baseUrl, fetchOptions);
		if (!htmlResponse.ok) throw new Error(`http response ${htmlResponse.status}`);
	} catch (e) {
		if (e && typeof e === "object" && "message" in e && typeof e.message === "string" && e.message.includes("http response")) throw e;
		throw e;
	}
	const allowedContentTypes = [
		"text/html",
		"application/json",
		"application/xml",
		"application/javascript",
		"text/plain"
	];
	const contentType = htmlResponse.headers.get("content-type") || "";
	const contentTypeArray = contentType.split(";");
	if (contentTypeArray[0] && !allowedContentTypes.includes(contentTypeArray[0])) throw new Error("returned page was not utf8");
	return htmlResponse.text();
};
const DEFAULT_HEADERS = {
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
	"Accept-Encoding": "gzip, deflate",
	"Accept-Language": "en-US,en;q=0.5",
	"Alt-Used": "LEAVE-THIS-KEY-SET-BY-TOOL",
	Connection: "keep-alive",
	Host: "LEAVE-THIS-KEY-SET-BY-TOOL",
	Referer: "https://www.google.com/",
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "cross-site",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/111.0"
};
/**
* A class designed to interact with web pages, either to extract
* information from them or to summarize their content. It uses the native
* fetch API to send HTTP requests and the cheerio library to parse the
* returned HTML.
* @example
* ```typescript
* const browser = new WebBrowser({
*   model: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*   embeddings: new OpenAIEmbeddings({}),
* });
* const result = await browser.invoke("https:exampleurl.com");
* ```
*/
var WebBrowser = class extends Tool {
	static lc_name() {
		return "WebBrowser";
	}
	get lc_namespace() {
		return [...super.lc_namespace, "webbrowser"];
	}
	model;
	embeddings;
	headers;
	requestConfig;
	textSplitter;
	constructor({ model, headers, embeddings, requestConfig, textSplitter }) {
		super(...arguments);
		this.model = model;
		this.embeddings = embeddings;
		this.headers = headers ?? DEFAULT_HEADERS;
		this.requestConfig = {
			withCredentials: true,
			...requestConfig
		};
		this.textSplitter = textSplitter ?? new RecursiveCharacterTextSplitter({
			chunkSize: 2e3,
			chunkOverlap: 200
		});
	}
	/** @ignore */
	async _call(inputs, runManager) {
		const [baseUrl, task] = parseInputs(inputs);
		const doSummary = !task;
		let text;
		try {
			const html = await getHtml(baseUrl, this.headers, this.requestConfig);
			text = getText(html, baseUrl, doSummary);
		} catch (e) {
			if (e) return e.toString();
			return "There was a problem connecting to the site";
		}
		const texts = await this.textSplitter.splitText(text);
		let context;
		if (doSummary) context = texts.slice(0, 4).join("\n");
		else {
			const docs = texts.map((pageContent) => new Document({
				pageContent,
				metadata: []
			}));
			const vectorStore = await MemoryVectorStore.fromDocuments(docs, this.embeddings);
			const results = await vectorStore.similaritySearch(task, 4, void 0, runManager?.getChild("vectorstore"));
			context = formatDocumentsAsString(results);
		}
		const input = `Text:${context}\n\nI need ${doSummary ? "a summary" : task} from the above text, also provide up to 5 markdown links from within that would be of interest (always including URL and text). Links should be provided, if present, in markdown syntax as a list under the heading "Relevant Links:".`;
		const chain = RunnableSequence.from([this.model, new StringOutputParser()]);
		return chain.invoke(input, runManager?.getChild());
	}
	name = "web-browser";
	description = `useful for when you need to find something on or summarize a webpage. input should be a comma separated list of "ONE valid http URL including protocol","what you want to find on the page or empty string for a summary".`;
};

//#endregion
export { WebBrowser, getText, parseInputs, webbrowser_exports };
//# sourceMappingURL=webbrowser.js.map