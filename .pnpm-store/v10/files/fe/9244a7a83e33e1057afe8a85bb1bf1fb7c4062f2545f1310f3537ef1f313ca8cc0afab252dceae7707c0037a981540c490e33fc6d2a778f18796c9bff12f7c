import { __export } from "../../../_virtual/rolldown_runtime.js";
import { Toolkit } from "@langchain/core/indexing";

//#region src/agents/toolkits/connery/index.ts
var connery_exports = {};
__export(connery_exports, { ConneryToolkit: () => ConneryToolkit });
/**
* ConneryToolkit provides access to all the available actions from the Connery Runner.
* @extends Toolkit
*/
var ConneryToolkit = class ConneryToolkit extends Toolkit {
	tools;
	/**
	* Creates a ConneryToolkit instance based on the provided ConneryService instance.
	* It populates the tools property of the ConneryToolkit instance with the list of
	* available tools from the Connery Runner.
	* @param conneryService The ConneryService instance.
	* @returns A Promise that resolves to a ConneryToolkit instance.
	*/
	static async createInstance(conneryService) {
		const toolkit = new ConneryToolkit();
		toolkit.tools = [];
		const actions = await conneryService.listActions();
		toolkit.tools.push(...actions);
		return toolkit;
	}
};

//#endregion
export { ConneryToolkit, connery_exports };
//# sourceMappingURL=index.js.map