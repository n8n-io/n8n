const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/web/sort_xyz_blockchain.ts
var sort_xyz_blockchain_exports = {};
require_rolldown_runtime.__export(sort_xyz_blockchain_exports, { SortXYZBlockchainLoader: () => SortXYZBlockchainLoader });
/**
* Class representing a document loader for loading data from the SortXYZ
* blockchain using the SortXYZ API.
* @example
* ```typescript
* const blockchainLoader = new SortXYZBlockchainLoader({
*   apiKey: "YOUR_SORTXYZ_API_KEY",
*   query: {
*     type: "NFTMetadata",
*     blockchain: "ethereum",
*     contractAddress: "0x887F3909C14DAbd9e9510128cA6cBb448E932d7f".toLowerCase(),
*   },
* });
*
* const blockchainData = await blockchainLoader.load();
*
* const prompt =
*   "Describe the character with the attributes from the following json document in a 4 sentence story. ";
* const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 })
* const response = await model.invoke(
*   prompt + JSON.stringify(blockchainData[0], null, 2),
* );
* console.log(`user > ${prompt}`);
* console.log(`chatgpt > ${response}`);
* ```
*/
var SortXYZBlockchainLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	contractAddress;
	blockchain;
	apiKey;
	queryType;
	sql;
	limit;
	constructor({ apiKey, query }) {
		super();
		if (!apiKey) throw new Error(`apiKey is required! Head over to https://docs.sort.xyz/docs/api-keys to get your free Sort API key.`);
		this.apiKey = apiKey;
		if (typeof query === "string") this.sql = query;
		else {
			this.contractAddress = query.contractAddress.toLowerCase();
			this.blockchain = query.blockchain;
			this.queryType = query.type;
			this.limit = query.limit ?? 100;
		}
	}
	/**
	* Method that loads the data from the SortXYZ blockchain based on the
	* specified query parameters. It makes requests to the SortXYZ API and
	* returns an array of Documents representing the retrieved data.
	* @returns Promise<Document[]> - An array of Documents representing the retrieved data.
	*/
	async load() {
		if (this.limit > 1e3) throw new Error(`Limit is set too high. Please set limit to 1000 or lower.`);
		const docs = [];
		let queryOffset = 0;
		while (true) {
			let query = "";
			if (this.sql) query = this.sql;
			else if (this.queryType === "NFTMetadata") query = `SELECT * FROM ${this.blockchain}.nft_metadata WHERE contract_address = '${this.contractAddress}' ORDER BY token_id DESC LIMIT ${this.limit} OFFSET ${queryOffset}`;
			else if (this.queryType === "latestTransactions") query = `SELECT * FROM ${this.blockchain}.transaction t, ethereum.block b WHERE t.to_address = '${this.contractAddress}' AND b.id=t.block_id ORDER BY b.timestamp DESC LIMIT ${this.limit} OFFSET ${queryOffset}`;
			try {
				const response = await fetch("https://api.sort.xyz/v1/queries/run", {
					method: "POST",
					headers: {
						"x-api-key": this.apiKey,
						Accept: "application/json",
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ query })
				});
				const fullResponse = await response.json();
				if (fullResponse && fullResponse.data && fullResponse.data.records.length === 0) break;
				const data = fullResponse?.data || [];
				for (let i = 0; i < data.records.length; i += 1) {
					const doc = new __langchain_core_documents.Document({
						pageContent: JSON.stringify(data.records[i], null, 2),
						metadata: { row: i }
					});
					docs.push(doc);
				}
				queryOffset += this.limit;
				if (queryOffset >= this.limit || this.sql) break;
			} catch (error) {
				console.error("Error:", error);
			}
		}
		return docs;
	}
};

//#endregion
exports.SortXYZBlockchainLoader = SortXYZBlockchainLoader;
Object.defineProperty(exports, 'sort_xyz_blockchain_exports', {
  enumerable: true,
  get: function () {
    return sort_xyz_blockchain_exports;
  }
});
//# sourceMappingURL=sort_xyz_blockchain.cjs.map