const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/AssistantInstanceContextHostEvent--9kknsw1.js","assets/vendor-Hx42-oQF.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/instanceContextLabels-C2EvhBog.js","assets/AssistantStatusHostEvent-C19h75Tj.js"])))=>i.map(i=>d[i]);
import { $d as init_runtime_core_esm_bundler, qd as defineAsyncComponent } from "./vendor-Hx42-oQF.js";
import { DN as __vitePreload, KE as statusPayloadSchema, Th as HOST_EVENT_PLACEMENT, UE as instanceContextPayloadSchema } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/assistantAgent/assistantHostEvents.ts
init_runtime_core_esm_bundler();
/**
* The host event names of the Assistant turn events that the chat shows. The
* backend sends each event under the type that it has in the Assistant runtime.
*/
var ASSISTANT_HOST_EVENT = {
	INSTANCE_CONTEXT: "instance-context",
	STATUS: "status"
};
/** The instance context summary of a turn, or `undefined` for another event. */
function parseInstanceContextHostEvent(event) {
	if (event.name !== ASSISTANT_HOST_EVENT.INSTANCE_CONTEXT) return void 0;
	const parsed = instanceContextPayloadSchema.safeParse(event.payload);
	return parsed.success ? parsed.data : void 0;
}
/**
* The status text of a turn, or `undefined` for another event. An empty text
* clears the status, so it gives `undefined` too.
*/
function parseStatusHostEvent(event) {
	if (event.name !== ASSISTANT_HOST_EVENT.STATUS) return void 0;
	const parsed = statusPayloadSchema.safeParse(event.payload);
	return parsed.success && parsed.data.message ? parsed.data.message : void 0;
}
var assistantHostEventExtensions = [{
	key: "assistant_instance_context",
	matchHostEvent: (event) => parseInstanceContextHostEvent(event) !== void 0,
	hostEventComponent: defineAsyncComponent(async () => await __vitePreload(() => import("./AssistantInstanceContextHostEvent--9kknsw1.js"), __vite__mapDeps([0,1,2,3,4,5,6]))),
	hostEventPlacement: HOST_EVENT_PLACEMENT.THINKING
}, {
	key: "assistant_status",
	matchHostEvent: (event) => parseStatusHostEvent(event) !== void 0,
	hostEventComponent: defineAsyncComponent(async () => await __vitePreload(() => import("./AssistantStatusHostEvent-C19h75Tj.js"), __vite__mapDeps([7,1,2,3,4,5]))),
	hostEventPlacement: HOST_EVENT_PLACEMENT.START
}];
//#endregion
export { parseInstanceContextHostEvent as n, parseStatusHostEvent as r, assistantHostEventExtensions as t };
