import { getHookFunction } from "../middleware/utils.js";
import { MiddlewareNode } from "./middleware.js";

//#region src/agents/nodes/BeforeAgentNode.ts
/**
* Node for executing a single middleware's beforeAgent hook.
*/
var BeforeAgentNode = class extends MiddlewareNode {
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
		return getHookFunction(this.middleware.beforeAgent)(state, runtime);
	}
};

//#endregion
export { BeforeAgentNode };
//# sourceMappingURL=BeforeAgentNode.js.map