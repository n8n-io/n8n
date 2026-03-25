//#region src/agents/state.ts
/**
* The StateManager is responsible for managing the state of the agent.
* The `createAgent` maintains different nodes with their own state. For the user
* however, they only see the combined state of all nodes. This class is helps
* to share the state between different nodes.
*
* @internal
*/
var StateManager = class {
	#nodes = /* @__PURE__ */ new Map();
	/**
	* Add node to middleware group.
	* @param name - The name of the middleware group.
	* @param node - The node to add.
	*/
	addNode(middleware, node) {
		this.#nodes.set(middleware.name, [...this.#nodes.get(middleware.name) ?? [], node]);
	}
	/**
	* Get the state of a middleware group.
	* @param name - The name of the middleware group.
	* @returns The state of the middleware group.
	*/
	getState(name) {
		const state = (this.#nodes.get(name) ?? []).reduce((prev, node) => {
			return {
				...prev,
				...node.getState() ?? {}
			};
		}, {});
		/**
		* we internally reset the jumpTo property and shouldn't propagate this value
		* to the middleware hooks.
		*/
		delete state.jumpTo;
		return state;
	}
};

//#endregion
export { StateManager };
//# sourceMappingURL=state.js.map