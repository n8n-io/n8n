const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/chain.ts
var chain_exports = {};
require_rolldown_runtime.__export(chain_exports, { ChainTool: () => ChainTool });
/**
* Class that extends DynamicTool for creating tools that can run chains.
* Takes an instance of a class that extends BaseChain as a parameter in
* its constructor and uses it to run the chain when its 'func' method is
* called.
*/
var ChainTool = class extends __langchain_core_tools.DynamicTool {
	static lc_name() {
		return "ChainTool";
	}
	chain;
	constructor({ chain,...rest }) {
		super({
			...rest,
			func: async (input, runManager) => chain.run(input, runManager?.getChild())
		});
		this.chain = chain;
	}
};

//#endregion
exports.ChainTool = ChainTool;
Object.defineProperty(exports, 'chain_exports', {
  enumerable: true,
  get: function () {
    return chain_exports;
  }
});
//# sourceMappingURL=chain.cjs.map