import { getHookFunction } from "../middleware/utils.js";
import { MiddlewareNode } from "./middleware.js";

//#region src/agents/nodes/BeforeModelNode.ts
/**
* Node for executing a single middleware's beforeModel hook.
*/
var BeforeModelNode = class extends MiddlewareNode {
	lc_namespace = [
		"langchain",
		"agents",
		"beforeModelNodes"
	];
	constructor(middleware, options) {
		super({
			name: `BeforeModelNode_${middleware.name}`,
			func: async (state, config) => this.invokeMiddleware(state, config)
		}, options);
		this.middleware = middleware;
	}
	runHook(state, runtime) {
		return getHookFunction(this.middleware.beforeModel)(state, runtime);
	}
};

//#endregion
export { BeforeModelNode };
//# sourceMappingURL=BeforeModelNode.js.map