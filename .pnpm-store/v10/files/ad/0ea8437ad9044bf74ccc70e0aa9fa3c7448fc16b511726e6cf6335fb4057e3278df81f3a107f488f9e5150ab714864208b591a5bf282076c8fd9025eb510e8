import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Presence_default } from "../Presence/Presence.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectCollapsibleRootContext } from "./CollapsibleRoot.js";
import { computed, createBlock, createCommentVNode, createVNode, defineComponent, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, unref, watch, withCtx } from "vue";
import { useEventListener } from "@vueuse/core";

//#region src/Collapsible/CollapsibleContent.vue?vue&type=script&setup=true&lang.ts
var CollapsibleContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "CollapsibleContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["contentFound"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectCollapsibleRootContext();
		rootContext.contentId ||= useId(void 0, "reka-collapsible-content");
		const presentRef = ref();
		const { forwardRef, currentElement } = useForwardExpose();
		const width = ref(0);
		const height = ref(0);
		const isOpen = computed(() => rootContext.open.value);
		const isMountAnimationPrevented = ref(isOpen.value);
		const currentStyle = ref();
		watch(() => [isOpen.value, presentRef.value?.present], async () => {
			await nextTick();
			const node = currentElement.value;
			if (!node) return;
			currentStyle.value = currentStyle.value || {
				transitionDuration: node.style.transitionDuration,
				animationName: node.style.animationName
			};
			node.style.transitionDuration = "0s";
			node.style.animationName = "none";
			const rect = node.getBoundingClientRect();
			height.value = rect.height;
			width.value = rect.width;
			if (!isMountAnimationPrevented.value) {
				node.style.transitionDuration = currentStyle.value.transitionDuration;
				node.style.animationName = currentStyle.value.animationName;
			}
		}, { immediate: true });
		const skipAnimation = computed(() => isMountAnimationPrevented.value && rootContext.open.value);
		onMounted(() => {
			requestAnimationFrame(() => {
				isMountAnimationPrevented.value = false;
			});
		});
		useEventListener(currentElement, "beforematch", (ev) => {
			requestAnimationFrame(() => {
				rootContext.onOpenToggle();
				emits("contentFound");
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), {
				ref_key: "presentRef",
				ref: presentRef,
				present: _ctx.forceMount || unref(rootContext).open.value,
				"force-mount": true
			}, {
				default: withCtx(({ present }) => [createVNode(unref(Primitive), mergeProps(_ctx.$attrs, {
					id: unref(rootContext).contentId,
					ref: unref(forwardRef),
					"as-child": props.asChild,
					as: _ctx.as,
					hidden: !present ? unref(rootContext).unmountOnHide.value ? "" : "until-found" : void 0,
					"data-state": skipAnimation.value ? void 0 : unref(rootContext).open.value ? "open" : "closed",
					"data-disabled": unref(rootContext).disabled?.value ? "" : void 0,
					style: {
						[`--reka-collapsible-content-height`]: `${height.value}px`,
						[`--reka-collapsible-content-width`]: `${width.value}px`
					}
				}), {
					default: withCtx(() => [(unref(rootContext).unmountOnHide.value ? present : true) ? renderSlot(_ctx.$slots, "default", { key: 0 }) : createCommentVNode("v-if", true)]),
					_: 2
				}, 1040, [
					"id",
					"as-child",
					"as",
					"hidden",
					"data-state",
					"data-disabled",
					"style"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Collapsible/CollapsibleContent.vue
var CollapsibleContent_default = CollapsibleContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CollapsibleContent_default };
//# sourceMappingURL=CollapsibleContent.js.map