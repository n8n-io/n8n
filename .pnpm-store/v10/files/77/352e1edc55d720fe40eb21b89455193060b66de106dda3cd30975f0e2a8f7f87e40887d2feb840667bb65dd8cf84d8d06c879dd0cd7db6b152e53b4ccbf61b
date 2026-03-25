const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/web/html.ts
var html_exports = {};
require_rolldown_runtime.__export(html_exports, { HTMLWebBaseLoader: () => HTMLWebBaseLoader });
var HTMLWebBaseLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	timeout;
	caller;
	textDecoder;
	headers;
	constructor(webPath, fields) {
		super();
		this.webPath = webPath;
		const { timeout, textDecoder, headers,...rest } = fields ?? {};
		this.timeout = timeout ?? 1e4;
		this.caller = new __langchain_core_utils_async_caller.AsyncCaller(rest);
		this.textDecoder = textDecoder;
		this.headers = headers;
	}
	async load() {
		const response = await this.caller.call(fetch, this.webPath, {
			signal: this.timeout ? AbortSignal.timeout(this.timeout) : void 0,
			headers: this.headers
		});
		const html = this.textDecoder?.decode(await response.arrayBuffer()) ?? await response.text();
		return [new __langchain_core_documents.Document({ pageContent: html })];
	}
};

//#endregion
exports.HTMLWebBaseLoader = HTMLWebBaseLoader;
Object.defineProperty(exports, 'html_exports', {
  enumerable: true,
  get: function () {
    return html_exports;
  }
});
//# sourceMappingURL=html.cjs.map