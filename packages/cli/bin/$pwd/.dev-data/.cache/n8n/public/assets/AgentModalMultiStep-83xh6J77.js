import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Tf as watch, Ud as createSlots, Vf as ref, _p as normalizeClass, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default } from "./app-D5flEmb-.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
//#region src/features/agents/components/modals/AgentModalMultiStep.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["data-step"];
var AgentModalMultiStep_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentModalMultiStep",
	props: {
		open: { type: Boolean },
		step: {},
		title: {},
		editableTitle: {
			type: Boolean,
			default: false
		},
		titlePlaceholder: { default: "" },
		titleMaxLength: { default: 128 },
		titleError: { default: "" },
		showBack: {
			type: Boolean,
			default: false
		},
		showFooter: {
			type: Boolean,
			default: void 0
		},
		showCancel: {
			type: Boolean,
			default: true
		},
		cancelLabel: { default: void 0 },
		headerDivider: {
			type: Boolean,
			default: false
		},
		headerDividerTone: { default: "default" },
		bodyFlush: {
			type: Boolean,
			default: false
		},
		fixedSize: {
			type: Boolean,
			default: false
		},
		stableHeight: {
			type: Boolean,
			default: false
		},
		busy: {
			type: Boolean,
			default: false
		},
		size: { default: "2xlarge" },
		stacked: {
			type: Boolean,
			default: false
		},
		trapFocus: {
			type: Boolean,
			default: true
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"update:open",
		"update:title",
		"back",
		"interactOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const isPickerStep = computed(() => props.step === "select" || props.step === "list");
		const stepChanged = ref(false);
		watch(() => props.step, async () => {
			stepChanged.value = false;
			await nextTick();
			stepChanged.value = true;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: __props.open,
				title: __props.title,
				"editable-title": __props.editableTitle,
				"title-placeholder": __props.titlePlaceholder,
				"title-max-length": __props.titleMaxLength,
				"title-error": __props.titleError,
				"show-back": __props.showBack,
				"show-footer": __props.showFooter,
				"show-cancel": __props.showCancel,
				"cancel-label": __props.cancelLabel,
				"header-divider": __props.headerDivider,
				"header-divider-tone": __props.headerDividerTone,
				"body-scrollable": !isPickerStep.value,
				"body-flush": __props.bodyFlush,
				"fixed-size": __props.fixedSize,
				"stable-height": __props.stableHeight,
				busy: __props.busy,
				size: __props.size,
				stacked: __props.stacked,
				"trap-focus": __props.trapFocus,
				"disable-outside-pointer-events": __props.disableOutsidePointerEvents,
				onInteractOutside: _cache[0] || (_cache[0] = ($event) => emit("interactOutside", $event)),
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event)),
				"onUpdate:title": _cache[2] || (_cache[2] = ($event) => emit("update:title", $event)),
				onBack: _cache[3] || (_cache[3] = ($event) => emit("back"))
			}, createSlots({
				headerActions: withCtx(() => [renderSlot(_ctx.$slots, "headerActions")]),
				default: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass([_ctx.$style.step, stepChanged.value && _ctx.$style.stepChanged]),
					"data-step": __props.step
				}, [renderSlot(_ctx.$slots, "default")], 10, _hoisted_1)]),
				_: 2
			}, [
				_ctx.$slots.titlePrefix ? {
					name: "titlePrefix",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "titlePrefix")]),
					key: "0"
				} : void 0,
				_ctx.$slots.sidePanel ? {
					name: "sidePanel",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "sidePanel")]),
					key: "1"
				} : void 0,
				_ctx.$slots.titleSuffix ? {
					name: "titleSuffix",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "titleSuffix")]),
					key: "2"
				} : void 0,
				_ctx.$slots.footerLeft ? {
					name: "footerLeft",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "footerLeft")]),
					key: "3"
				} : void 0,
				_ctx.$slots.footerBeforeCancel ? {
					name: "footerBeforeCancel",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "footerBeforeCancel")]),
					key: "4"
				} : void 0,
				_ctx.$slots.footerActions ? {
					name: "footerActions",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "footerActions")]),
					key: "5"
				} : void 0,
				_ctx.$slots.footer ? {
					name: "footer",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "footer")]),
					key: "6"
				} : void 0
			]), 1032, [
				"open",
				"title",
				"editable-title",
				"title-placeholder",
				"title-max-length",
				"title-error",
				"show-back",
				"show-footer",
				"show-cancel",
				"cancel-label",
				"header-divider",
				"header-divider-tone",
				"body-scrollable",
				"body-flush",
				"fixed-size",
				"stable-height",
				"busy",
				"size",
				"stacked",
				"trap-focus",
				"disable-outside-pointer-events"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	step: "_step_15fml_450",
	stepChanged: "_stepChanged_15fml_457",
	fadeIn: "_fadeIn_15fml_1",
	shimmer: "_shimmer_15fml_1",
	spin: "_spin_15fml_1",
	"skeleton-pulse": "_skeleton-pulse_15fml_1",
	opacityPulse: "_opacityPulse_15fml_1",
	popoverIn: "_popoverIn_15fml_1",
	collapsibleSlideDown: "_collapsibleSlideDown_15fml_1",
	collapsibleSlideUp: "_collapsibleSlideUp_15fml_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_15fml_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_15fml_1",
	blurSwapIn: "_blurSwapIn_15fml_1",
	blurSwapOut: "_blurSwapOut_15fml_1",
	pulse: "_pulse_15fml_1",
	pulseGlow: "_pulseGlow_15fml_1",
	pulseGlowDelayed: "_pulseGlowDelayed_15fml_1",
	fade: "_fade_15fml_1",
	fadeInUp: "_fadeInUp_15fml_1",
	fadeInDown: "_fadeInDown_15fml_1",
	fadeInLeft: "_fadeInLeft_15fml_1",
	fadeInRight: "_fadeInRight_15fml_1",
	fadeOut: "_fadeOut_15fml_1",
	fadeOutDown: "_fadeOutDown_15fml_1",
	fadeOutUp: "_fadeOutUp_15fml_1",
	fadeOutLeft: "_fadeOutLeft_15fml_1",
	fadeOutRight: "_fadeOutRight_15fml_1",
	ping: "_ping_15fml_1",
	blinkBackground: "_blinkBackground_15fml_1",
	typingBlink: "_typingBlink_15fml_1"
} }]]);
//#endregion
export { AgentModalMultiStep_default as t };
