const require_utils = require('../middleware/utils.cjs');
const require_middleware = require('./middleware.cjs');

//#region src/agents/nodes/BeforeAgentNode.ts
/**
* Node for executing a single middleware's beforeAgent hook.
*/
var BeforeAgentNode = class extends require_middleware.MiddlewareNode {
	lc_namespace = [
		"langchain",
		"agents",
		"beforeAgentNodes"
	];
	constructor(middleware, options) {
		super({
			name: `BeforeAgentNode_${middleware.name}`,
			func: async (state, config) => this.invokeMiddleware(state, config)
		}, options);
		this.middleware = middleware;
	}
	runHook(state, runtime) {
		return require_utils.getHookFunction(this.middleware.beforeAgent)(state, runtime);
	}
};

//#endregion
exports.BeforeAgentNode = BeforeAgentNode;
//# sourceMappingURL=BeforeAgentNode.cjs.map