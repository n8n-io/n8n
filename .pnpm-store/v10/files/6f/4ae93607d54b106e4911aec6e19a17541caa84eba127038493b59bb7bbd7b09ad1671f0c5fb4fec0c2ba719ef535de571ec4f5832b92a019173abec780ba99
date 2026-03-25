import { v4 } from "uuid";

//#region src/react-ui/server/server.ts
/**
* Helper to send and persist UI messages. Accepts a map of component names to React components
* as type argument to provide type safety. Will also write to the `options?.stateKey` state.
*
* @param config LangGraphRunnableConfig
* @param options
* @returns
*/
const typedUi = (config, options) => {
	const items = [];
	const stateKey = options?.stateKey ?? "ui";
	const runId = config.metadata?.run_id ?? config.runId;
	if (!runId) throw new Error("run_id is required");
	function handlePush(message, options$1) {
		const evt = {
			type: "ui",
			id: message?.id ?? v4(),
			name: message?.name,
			props: message?.props,
			metadata: {
				merge: options$1?.merge || void 0,
				run_id: runId,
				tags: config.tags,
				name: config.runName,
				...message?.metadata,
				...options$1?.message ? { message_id: options$1.message.id } : null
			}
		};
		items.push(evt);
		config.writer?.(evt);
		config.configurable?.__pregel_send?.([[stateKey, evt]]);
		return evt;
	}
	const handleDelete = (id) => {
		const evt = {
			type: "remove-ui",
			id
		};
		items.push(evt);
		config.writer?.(evt);
		config.configurable?.__pregel_send?.([[stateKey, evt]]);
		return evt;
	};
	return {
		push: handlePush,
		delete: handleDelete,
		items
	};
};

//#endregion
export { typedUi };
//# sourceMappingURL=server.js.map