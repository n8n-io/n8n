const require_utils = require('../middleware/utils.cjs');
const require_middleware = require('./middleware.cjs');

//#region src/agents/nodes/AfterAgentNode.ts
/**
* Node for executing a single middleware's afterAgent hook.
*/
var AfterAgentNode = class extends require_middleware.MiddlewareNode {
	lc_namespace = [
		"langchain",
		"agents",
		"afterAgentNodes"
	];
	constructor(middleware, options) {
		super({
			name: `AfterAgentNode_${middleware.name}`,
			func: async (state, config) => this.invokeMiddleware(state, config)
		}, options);
		this.middleware = middleware;
	}
	runHook(state, runtime) {
		return require_utils.getHookFunction(this.middleware.afterAgent)(state, runtime);
	}
};

//#endregion
exports.AfterAgentNode = AfterAgentNode;
//# sourceMappingURL=AfterAgentNode.cjs.map