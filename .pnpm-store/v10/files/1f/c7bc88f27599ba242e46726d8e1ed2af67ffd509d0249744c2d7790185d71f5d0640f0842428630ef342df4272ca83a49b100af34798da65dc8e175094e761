const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_RunnableCallable = require('../RunnableCallable.cjs');
const require_utils = require('./utils.cjs');
const require_utils$1 = require('../middleware/utils.cjs');
let _langchain_core_utils_types = require("@langchain/core/utils/types");

//#region src/agents/nodes/middleware.ts
/**
* Named class for context objects to provide better error messages
*/
var AgentContext = class {};
var AgentRuntime = class {};
var MiddlewareNode = class extends require_RunnableCallable.RunnableCallable {
	#options;
	constructor(fields, options) {
		super(fields);
		this.#options = options;
	}
	async invokeMiddleware(invokeState, config) {
		/**
		* Filter context based on middleware's contextSchema
		*/
		let filteredContext = {};
		/**
		* Parse context using middleware's contextSchema to apply defaults and validation
		*/
		if (this.middleware.contextSchema) {
			/**
			* Extract only the fields relevant to this middleware's schema
			*/
			const schemaShape = this.middleware.contextSchema?.shape;
			if (schemaShape) {
				const relevantContext = {};
				const invokeContext = config?.context || {};
				for (const key of Object.keys(schemaShape)) if (key in invokeContext) relevantContext[key] = invokeContext[key];
				/**
				* Parse to apply defaults and validation, even if relevantContext is empty
				* This will throw if required fields are missing and no defaults exist
				*/
				filteredContext = (0, _langchain_core_utils_types.interopParse)(this.middleware.contextSchema, relevantContext);
			}
		}
		const state = {
			...this.#options.getState(),
			...invokeState,
			messages: invokeState.messages
		};
		const runtime = {
			context: filteredContext,
			store: config?.store,
			configurable: config?.configurable,
			writer: config?.writer,
			interrupt: config?.interrupt,
			signal: config?.signal
		};
		const result = await this.runHook(
			state,
			/**
			* assign runtime and context values into empty named class
			* instances to create a better error message.
			*/
			Object.freeze(Object.assign(new AgentRuntime(), {
				...runtime,
				context: Object.freeze(Object.assign(new AgentContext(), filteredContext))
			}))
		);
		/**
		* If result is undefined, the hook made no state changes — return
		* only the jumpTo sentinel so we don't re-emit every input key as
		* a state update.
		*/
		if (!result) return { jumpTo: void 0 };
		/**
		* Verify that the jump target is allowed for the middleware
		*/
		let jumpToConstraint;
		let constraint;
		if (this.name?.startsWith("BeforeAgentNode_")) {
			jumpToConstraint = require_utils$1.getHookConstraint(this.middleware.beforeAgent);
			constraint = "beforeAgent.canJumpTo";
		} else if (this.name?.startsWith("BeforeModelNode_")) {
			jumpToConstraint = require_utils$1.getHookConstraint(this.middleware.beforeModel);
			constraint = "beforeModel.canJumpTo";
		} else if (this.name?.startsWith("AfterAgentNode_")) {
			jumpToConstraint = require_utils$1.getHookConstraint(this.middleware.afterAgent);
			constraint = "afterAgent.canJumpTo";
		} else if (this.name?.startsWith("AfterModelNode_")) {
			jumpToConstraint = require_utils$1.getHookConstraint(this.middleware.afterModel);
			constraint = "afterModel.canJumpTo";
		}
		if (typeof result.jumpTo === "string" && !jumpToConstraint?.includes(result.jumpTo)) {
			const suggestion = jumpToConstraint && jumpToConstraint.length > 0 ? `must be one of: ${jumpToConstraint?.join(", ")}.` : constraint ? `no ${constraint} defined in middleware ${this.middleware.name}` : "";
			throw new Error(`Invalid jump target: ${result.jumpTo}, ${suggestion}.`);
		}
		/**
		* If result is a control action, handle it
		*/
		if (typeof result === "object" && "type" in result) {
			if (result.type === "terminate") {
				if (result.error) throw result.error;
				return {
					...state,
					...result.result || {},
					jumpTo: result.jumpTo
				};
			}
			throw new Error(`Invalid control action: ${JSON.stringify(result)}`);
		}
		/**
		* If result is a state update, merge it with current state
		*/
		return {
			...state,
			...result,
			jumpTo: result.jumpTo
		};
	}
	get nodeOptions() {
		return { input: require_utils.derivePrivateState(this.middleware.stateSchema) };
	}
};

//#endregion
exports.MiddlewareNode = MiddlewareNode;
//# sourceMappingURL=middleware.cjs.map