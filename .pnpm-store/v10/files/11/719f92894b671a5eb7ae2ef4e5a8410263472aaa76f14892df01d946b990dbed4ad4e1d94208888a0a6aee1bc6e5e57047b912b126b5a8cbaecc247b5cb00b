const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const __langchain_core_indexing = require_rolldown_runtime.__toESM(require("@langchain/core/indexing"));

//#region src/agents/toolkits/connery/index.ts
var connery_exports = {};
require_rolldown_runtime.__export(connery_exports, { ConneryToolkit: () => ConneryToolkit });
/**
* ConneryToolkit provides access to all the available actions from the Connery Runner.
* @extends Toolkit
*/
var ConneryToolkit = class ConneryToolkit extends __langchain_core_indexing.Toolkit {
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
exports.ConneryToolkit = ConneryToolkit;
Object.defineProperty(exports, 'connery_exports', {
  enumerable: true,
  get: function () {
    return connery_exports;
  }
});
//# sourceMappingURL=index.cjs.map