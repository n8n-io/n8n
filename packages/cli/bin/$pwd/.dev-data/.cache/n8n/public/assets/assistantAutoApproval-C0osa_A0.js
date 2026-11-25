const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/AssistantAutoApprovalStep-BuM3nFIW.js","assets/vendor-Hx42-oQF.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/autoApproval-DF-5zwLk.js","assets/AssistantAutoApprovalStep-C37ow8aH.css"])))=>i.map(i=>d[i]);
import { $d as init_runtime_core_esm_bundler, qd as defineAsyncComponent } from "./vendor-Hx42-oQF.js";
import { DN as __vitePreload, Th as HOST_EVENT_PLACEMENT, pA as autoApprovalPayloadSchema } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/assistantAgent/assistantAutoApproval.ts
init_runtime_core_esm_bundler();
function parseAssistantAutoApproval(event) {
	if (event.name !== "auto-approval") return void 0;
	const parsed = autoApprovalPayloadSchema.safeParse(event.payload);
	return parsed.success ? parsed.data : void 0;
}
/** Shows each action that Auto mode ran without a card right before the step of its call. */
var assistantAutoApprovalExtension = {
	key: "assistant_auto_approval",
	matchHostEvent: (event) => parseAssistantAutoApproval(event) !== void 0,
	hostEventComponent: defineAsyncComponent(async () => await __vitePreload(() => import("./AssistantAutoApprovalStep-BuM3nFIW.js"), __vite__mapDeps([0,1,2,3,4,5,6,7]))),
	hostEventPlacement: HOST_EVENT_PLACEMENT.TOOL_CALL,
	hostEventToolCallId: (event) => parseAssistantAutoApproval(event)?.toolCallId
};
//#endregion
export { parseAssistantAutoApproval as n, assistantAutoApprovalExtension as t };
