const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collapsible_CollapsibleRoot = require('./CollapsibleRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Collapsible/CollapsibleContent.vue?vue&type=script&setup=true&lang.ts
var CollapsibleContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Collapsible_CollapsibleRoot.injectCollapsibleRootContext();
		rootContext.contentId ||= require_shared_useId.useId(void 0, "reka-collapsible-content");
		const presentRef = (0, vue.ref)();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const width = (0, vue.ref)(0);
		const height = (0, vue.ref)(0);
		const isOpen = (0, vue.computed)(() => rootContext.open.value);
		const isMountAnimationPrevented = (0, vue.ref)(isOpen.value);
		const currentStyle = (0, vue.ref)();
		(0, vue.watch)(() => [isOpen.value, presentRef.value?.present], async () => {
			await (0, vue.nextTick)();
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
		const skipAnimation = (0, vue.computed)(() => isMountAnimationPrevented.value && rootContext.open.value);
		(0, vue.onMounted)(() => {
			requestAnimationFrame(() => {
				isMountAnimationPrevented.value = false;
			});
		});
		(0, __vueuse_core.useEventListener)(currentElement, "beforematch", (ev) => {
			requestAnimationFrame(() => {
				rootContext.onOpenToggle();
				emits("contentFound");
			});
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), {
				ref_key: "presentRef",
				ref: presentRef,
				present: _ctx.forceMount || (0, vue.unref)(rootContext).open.value,
				"force-mount": true
			}, {
				default: (0, vue.withCtx)(({ present }) => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
					id: (0, vue.unref)(rootContext).contentId,
					ref: (0, vue.unref)(forwardRef),
					"as-child": props.asChild,
					as: _ctx.as,
					hidden: !present ? (0, vue.unref)(rootContext).unmountOnHide.value ? "" : "until-found" : void 0,
					"data-state": skipAnimation.value ? void 0 : (0, vue.unref)(rootContext).open.value ? "open" : "closed",
					"data-disabled": (0, vue.unref)(rootContext).disabled?.value ? "" : void 0,
					style: {
						[`--reka-collapsible-content-height`]: `${height.value}px`,
						[`--reka-collapsible-content-width`]: `${width.value}px`
					}
				}), {
					default: (0, vue.withCtx)(() => [((0, vue.unref)(rootContext).unmountOnHide.value ? present : true) ? (0, vue.renderSlot)(_ctx.$slots, "default", { key: 0 }) : (0, vue.createCommentVNode)("v-if", true)]),
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
Object.defineProperty(exports, 'CollapsibleContent_default', {
  enumerable: true,
  get: function () {
    return CollapsibleContent_default;
  }
});
//# sourceMappingURL=CollapsibleContent.cjs.map