import { __export } from "../_virtual/rolldown_runtime.js";
import { Tool } from "@langchain/core/tools";

//#region src/tools/ifttt.ts
var ifttt_exports = {};
__export(ifttt_exports, { IFTTTWebhook: () => IFTTTWebhook });
/**
* Represents a tool for creating and managing webhooks with the IFTTT (If
* This Then That) service. The IFTTT service allows users to create
* chains of simple conditional statements, called applets, which are
* triggered based on changes to other web services.
*/
var IFTTTWebhook = class extends Tool {
	static lc_name() {
		return "IFTTTWebhook";
	}
	url;
	name;
	description;
	constructor(url, name, description) {
		super(...arguments);
		this.url = url;
		this.name = name;
		this.description = description;
	}
	/** @ignore */
	async _call(input) {
		const headers = { "Content-Type": "application/json" };
		const body = JSON.stringify({ this: input });
		const response = await fetch(this.url, {
			method: "POST",
			headers,
			body
		});
		if (!response.ok) throw new Error(`HTTP error ${response.status}`);
		const result = await response.text();
		return result;
	}
};

//#endregion
export { IFTTTWebhook, ifttt_exports };
//# sourceMappingURL=ifttt.js.map