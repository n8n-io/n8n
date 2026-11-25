import { $d as init_runtime_core_esm_bundler, Df as withCtx, Hd as createElementBlock, Iu as useEventListener, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Tf as watch, Vf as ref, Xf as unref, _p as normalizeClass, ef as inject, ff as openBlock, ip as init_shared_esm_bundler, yp as normalizeStyle } from "./vendor-Hx42-oQF.js";
import { OM as PopOutWindowKey, QM as useDeviceSupport, SN as _plugin_vue_export_helper_default, by as useDebounce, cN as Input_default, jN as useI18n, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/ndv/runData/components/RunDataSearch.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { "data-test-id": "ndv-search-container" };
var COLLAPSED_WIDTH = "30px";
var OPEN_WIDTH = "204px";
var OPEN_MIN_WIDTH = "120px";
var RunDataSearch_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunDataSearch",
	props: {
		modelValue: {},
		paneType: { default: "output" },
		displayMode: { default: "schema" },
		shortcut: { default: void 0 }
	},
	emits: ["update:modelValue", "focus"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const props = __props;
		const locale = useI18n();
		const { debounce } = useDebounce();
		const { isCtrlKeyPressed, controlKeyText } = useDeviceSupport();
		const popOutWindow = inject(PopOutWindowKey, void 0);
		const keyboardEventTarget = computed(() => popOutWindow?.value?.document ?? window.document);
		const focusReturnTo = ref(null);
		const inputRef = ref(null);
		const search = ref(props.modelValue ?? "");
		const opened = ref(!!search.value);
		const placeholder = computed(() => {
			if (props.shortcut === "ctrl+f") return locale.baseText("ndv.search.placeholder.shortcutHint", { interpolate: { shortcut: `${controlKeyText.value}+F` } });
			if (props.paneType === "output") return locale.baseText("ndv.search.placeholder.output");
			if (props.displayMode === "schema") return locale.baseText("ndv.search.placeholder.input.schema");
			return locale.baseText("ndv.search.placeholder.input");
		});
		const style = computed(() => opened.value ? {
			maxWidth: OPEN_WIDTH,
			minWidth: OPEN_MIN_WIDTH
		} : { maxWidth: COLLAPSED_WIDTH });
		const documentKeyHandler = (event) => {
			const action = getKeyboardActionToTrigger(event);
			if (!action) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			switch (action) {
				case "open":
					focusReturnTo.value = document.activeElement;
					inputRef.value?.focus();
					inputRef.value?.select();
					break;
				case "cancel":
					inputRef.value?.blur();
					opened.value = false;
					emit("update:modelValue", "");
					if (focusReturnTo.value instanceof HTMLElement) focusReturnTo.value.focus();
			}
		};
		const debouncedEmitUpdate = debounce(async (value) => emit("update:modelValue", value), {
			debounceTime: 300,
			trailing: true
		});
		const onSearchUpdate = (value) => {
			search.value = value;
			debouncedEmitUpdate(value);
		};
		const onFocus = () => {
			opened.value = true;
			inputRef.value?.select();
			emit("focus");
		};
		const onBlur = () => {
			if (!props.modelValue) opened.value = false;
		};
		function isTargetEditable(target) {
			if (!(target instanceof HTMLElement)) return false;
			return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.getAttribute("contentEditable") === "true";
		}
		function getKeyboardActionToTrigger(event) {
			if (opened.value && event.key === "Escape") return "cancel";
			switch (props.shortcut) {
				case "/": return event.key === "/" && !isTargetEditable(event.target) ? "open" : void 0;
				case "ctrl+f": return event.key === "f" && isCtrlKeyPressed(event) ? "open" : void 0;
				case void 0: return;
			}
		}
		useEventListener(keyboardEventTarget, "keydown", documentKeyHandler, { capture: true });
		watch(() => props.modelValue, (value) => {
			const searchClearedFromOutside = search.value && !value;
			search.value = value;
			if (searchClearedFromOutside) opened.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(Input_default), {
				ref_key: "inputRef",
				ref: inputRef,
				"data-test-id": "ndv-search",
				class: normalizeClass({
					[_ctx.$style.ioSearch]: true,
					[_ctx.$style.ioSearchOpened]: opened.value
				}),
				style: normalizeStyle(style.value),
				"model-value": search.value,
				placeholder: placeholder.value,
				size: "small",
				"onUpdate:modelValue": onSearchUpdate,
				onFocus,
				onBlur
			}, {
				prefix: withCtx(() => [createVNode(unref(N8nIcon_default), {
					class: normalizeClass(_ctx.$style.ioSearchIcon),
					icon: "search",
					size: "large"
				}, null, 8, ["class"])]),
				_: 1
			}, 8, [
				"class",
				"style",
				"model-value",
				"placeholder"
			])]);
		};
	}
}), [["__cssModules", { "$style": {
	ioSearch: "_ioSearch_1wk21_1",
	ioSearchIcon: "_ioSearchIcon_1wk21_8",
	ioSearchOpened: "_ioSearchOpened_1wk21_18"
} }]]);
//#endregion
export { RunDataSearch_default as default };
