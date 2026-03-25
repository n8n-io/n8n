const require_utils = require('../middleware/utils.cjs');
const require_middleware = require('./middleware.cjs');

//#region src/agents/nodes/AfterModelNode.ts
/**
* Node for executing a single middleware's afterModel hook.
*/
var AfterModelNode = class extends require_middleware.MiddlewareNode {
	lc_namespace = [
		"langchain",
		"agents",
		"afterModelNodes"
	];
	constructor(middleware, options) {
		super({
			name: `AfterModelNode_${middleware.name}`,
			func: async (state, config) => this.invokeMiddleware(state, config)
		}, options);
		this.middleware = middleware;
	}
	runHook(state, runtime) {
		return require_utils.getHookFunction(this.middleware.afterModel)(state, runtime);
	}
};

//#endregion
exports.AfterModelNode = AfterModelNode;
//# sourceMappingURL=AfterModelNode.cjs.map