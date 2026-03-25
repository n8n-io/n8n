const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Tabs_TabsRoot = require('./TabsRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Tabs/TabsIndicator.vue?vue&type=script&setup=true&lang.ts
var TabsIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TabsIndicator",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const context = require_Tabs_TabsRoot.injectTabsRootContext();
		require_shared_useForwardExpose.useForwardExpose();
		const activeTab = (0, vue.ref)();
		const indicatorStyle = (0, vue.ref)({
			size: null,
			position: null
		});
		(0, vue.watch)(() => [context.modelValue.value, context?.dir.value], async () => {
			await (0, vue.nextTick)();
			updateIndicatorStyle();
		}, { immediate: true });
		(0, __vueuse_core.useResizeObserver)([context.tabsList, activeTab], updateIndicatorStyle);
		function updateIndicatorStyle() {
			activeTab.value = context.tabsList.value?.querySelector("[role=\"tab\"][data-state=\"active\"]");
			if (!activeTab.value) return;
			if (context.orientation.value === "horizontal") indicatorStyle.value = {
				size: activeTab.value.offsetWidth,
				position: activeTab.value.offsetLeft
			};
			else indicatorStyle.value = {
				size: activeTab.value.offsetHeight,
				position: activeTab.value.offsetTop
			};
		}
		return (_ctx, _cache) => {
			return typeof indicatorStyle.value.size === "number" ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ key: 0 }, props, { style: {
				"--reka-tabs-indicator-size": `${indicatorStyle.value.size}px`,
				"--reka-tabs-indicator-position": `${indicatorStyle.value.position}px`
			} }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["style"])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Tabs/TabsIndicator.vue
var TabsIndicator_default = TabsIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TabsIndicator_default', {
  enumerable: true,
  get: function () {
    return TabsIndicator_default;
  }
});
//# sourceMappingURL=TabsIndicator.cjs.map