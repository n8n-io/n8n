import { getHookFunction } from "../middleware/utils.js";
import { MiddlewareNode } from "./middleware.js";

//#region src/agents/nodes/AfterAgentNode.ts
/**
* Node for executing a single middleware's afterAgent hook.
*/
var AfterAgentNode = class extends MiddlewareNode {
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
		return getHookFunction(this.middleware.afterAgent)(state, runtime);
	}
};

//#endregion
export { AfterAgentNode };
//# sourceMappingURL=AfterAgentNode.js.map