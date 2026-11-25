import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Vd as createCommentVNode, Xf as unref, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
//#region src/features/agents/n8nChatPage/components/RecentChatIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/n8nChatPage/components/RecentChatIcon.vue
var RecentChatIcon_default = /* @__PURE__ */ defineComponent({
	__name: "RecentChatIcon",
	props: {
		item: { default: void 0 },
		size: { default: 16 }
	},
	setup(__props) {
		const props = __props;
		const assistantIconSize = computed(() => Math.round(props.size * .75));
		return (_ctx, _cache) => {
			return __props.item?.kind === "assistant" || __props.item?.kind === "assistant-agent" ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				icon: "n8n-assistant",
				size: assistantIconSize.value
			}, null, 8, ["size"])) : __props.item?.kind === "agent" ? (openBlock(), createBlock(AgentPersonalisationIcon_default, {
				key: 1,
				personalisation: __props.item.thread.agent.personalisation,
				size: __props.size
			}, null, 8, ["personalisation", "size"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { RecentChatIcon_default as t };
