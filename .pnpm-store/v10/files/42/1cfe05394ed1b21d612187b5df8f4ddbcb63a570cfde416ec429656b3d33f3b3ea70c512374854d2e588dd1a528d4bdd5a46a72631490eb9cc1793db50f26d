import { getHookFunction } from "../middleware/utils.js";
import { MiddlewareNode } from "./middleware.js";

//#region src/agents/nodes/AfterModelNode.ts
/**
* Node for executing a single middleware's afterModel hook.
*/
var AfterModelNode = class extends MiddlewareNode {
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
		return getHookFunction(this.middleware.afterModel)(state, runtime);
	}
};

//#endregion
export { AfterModelNode };
//# sourceMappingURL=AfterModelNode.js.map