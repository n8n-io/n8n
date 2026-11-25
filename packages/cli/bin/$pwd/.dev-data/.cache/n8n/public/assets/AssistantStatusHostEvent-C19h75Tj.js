import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Vd as createCommentVNode, Xf as unref, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { uj as AiActivityStep_default } from "./app-D5flEmb-.js";
import { r as parseStatusHostEvent } from "./assistantHostEvents-CVB8sHqW.js";
//#region src/features/ai/instanceAi/assistantAgent/AssistantStatusHostEvent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/AssistantStatusHostEvent.vue
var AssistantStatusHostEvent_default = /* @__PURE__ */ defineComponent({
	__name: "AssistantStatusHostEvent",
	props: { event: {} },
	setup(__props) {
		const props = __props;
		const message = computed(() => parseStatusHostEvent(props.event));
		return (_ctx, _cache) => {
			return message.value ? (openBlock(), createBlock(unref(AiActivityStep_default), {
				key: 0,
				label: message.value,
				"has-content": false,
				"data-test-id": "assistant-agent-status"
			}, null, 8, ["label"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { AssistantStatusHostEvent_default as default };
