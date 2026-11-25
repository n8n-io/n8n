import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Xf as unref, Yo as useRoute, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { vm as useProjectsStore } from "./app-D5flEmb-.js";
import { t as PageViewLayout_default } from "./PageViewLayout-BBSbPiAB.js";
import { t as ResourcesListSkeleton_default } from "./ResourcesListSkeleton-76OYbWaI.js";
import { t as ProjectHeader_default } from "./ProjectHeader-D25_B2LW.js";
import { n as ProjectSelfHealingSection_default } from "./src-LSY8Q0f-.js";
//#region src/features/collaboration/projects/views/PersonalSelfHealingView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/collaboration/projects/views/PersonalSelfHealingView.vue
var PersonalSelfHealingView_default = /* @__PURE__ */ defineComponent({
	__name: "PersonalSelfHealingView",
	setup(__props) {
		const route = useRoute();
		const projectsStore = useProjectsStore();
		const projectId = computed(() => {
			const id = projectsStore.currentProject?.id;
			return id && id === route.params.projectId ? id : void 0;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(PageViewLayout_default, null, {
				header: withCtx(() => [createVNode(ProjectHeader_default, { "main-button": "selfHealing" })]),
				default: withCtx(() => [projectId.value ? (openBlock(), createBlock(unref(ProjectSelfHealingSection_default), {
					key: 0,
					"project-id": projectId.value,
					variant: "personalTab"
				}, {
					loading: withCtx(() => [createVNode(ResourcesListSkeleton_default)]),
					_: 1
				}, 8, ["project-id"])) : (openBlock(), createBlock(ResourcesListSkeleton_default, { key: 1 }))]),
				_: 1
			});
		};
	}
});
//#endregion
export { PersonalSelfHealingView_default as default };
