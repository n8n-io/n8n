import { __export } from "../_virtual/rolldown_runtime.js";
import { Tool } from "@langchain/core/tools";

//#region src/tools/wolframalpha.ts
var wolframalpha_exports = {};
__export(wolframalpha_exports, { WolframAlphaTool: () => WolframAlphaTool });
/**
* @example
* ```typescript
* const tool = new WolframAlphaTool({
*   appid: "YOUR_APP_ID",
* });
* const res = await tool.invoke("What is 2 * 2?");
* ```
*/
var WolframAlphaTool = class extends Tool {
	appid;
	name = "wolfram_alpha";
	description = `A wrapper around Wolfram Alpha. Useful for when you need to answer questions about Math, Science, Technology, Culture, Society and Everyday Life. Input should be a search query.`;
	constructor(fields) {
		super(fields);
		this.appid = fields.appid;
	}
	static lc_name() {
		return "WolframAlphaTool";
	}
	async _call(query) {
		const url = `https://www.wolframalpha.com/api/v1/llm-api?appid=${this.appid}&input=${encodeURIComponent(query)}`;
		const res = await fetch(url);
		return res.text();
	}
};

//#endregion
export { WolframAlphaTool, wolframalpha_exports };
//# sourceMappingURL=wolframalpha.js.map