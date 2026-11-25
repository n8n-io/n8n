import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Ai as useInstanceAiSettingsStore, SN as _plugin_vue_export_helper_default, _N as N8nText_default, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, mA as instanceAiApprovalModeSchema, vy as usePostHog, wy as TELEMETRY_EVENT, xE as AI_ASSISTANT_AT_MENTIONS_FLAG, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/composables/useMenuTriggerTooltip.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Turns off the tooltip of a menu trigger while the menu is open, and for a
* moment after it closes. Closing the menu returns focus to the trigger, which
* would show the tooltip at once.
*/
function useMenuTriggerTooltip(open) {
	const isSuppressed = ref(false);
	let suppressTimeout;
	watch(open, (isOpen, wasOpen) => {
		if (isOpen || !wasOpen) return;
		clearTimeout(suppressTimeout);
		isSuppressed.value = true;
		suppressTimeout = setTimeout(() => {
			isSuppressed.value = false;
		}, 600);
	});
	onScopeDispose(() => clearTimeout(suppressTimeout));
	return { isTooltipDisabled: computed(() => open.value || isSuppressed.value) };
}
//#endregion
//#region src/features/ai/instanceAi/components/ApprovalModeSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ApprovalModeSelector_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApprovalModeSelector",
	props: { threadId: {} },
	setup(__props) {
		const props = __props;
		const settingsStore = useInstanceAiSettingsStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const open = ref(false);
		const { isTooltipDisabled } = useMenuTriggerTooltip(open);
		onMounted(() => {
			settingsStore.fetchPreferencesAfterFailure();
		});
		const items = computed(() => [{
			id: "manual",
			label: i18n.baseText("instanceAi.approvalMode.manual"),
			checkbox: true,
			checked: settingsStore.approvalMode === "manual",
			data: { description: i18n.baseText("instanceAi.approvalMode.manual.description") }
		}, {
			id: "auto",
			label: i18n.baseText("instanceAi.approvalMode.auto"),
			checkbox: true,
			checked: settingsStore.approvalMode === "auto",
			data: { description: i18n.baseText("instanceAi.approvalMode.auto.description") }
		}]);
		const currentLabel = computed(() => (items.value.find((item) => item.checked) ?? items.value[0]).label);
		async function onSelect(value) {
			const mode = instanceAiApprovalModeSchema.safeParse(value);
			if (!mode.success) return;
			const previous = settingsStore.approvalMode;
			if (mode.data === previous) return;
			if (!await settingsStore.setApprovalMode(mode.data)) return;
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_MODE_CHANGED, {
				mode: mode.data,
				previous_mode: previous,
				...props.threadId ? { thread_id: props.threadId } : {}
			});
		}
		return (_ctx, _cache) => {
			return unref(settingsStore).approvalModesAvailable ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "instance-ai-approval-mode-selector"
			}, [createVNode(unref(DropdownMenu_default), {
				modelValue: open.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => open.value = $event),
				items: items.value,
				placement: "top-start",
				width: "320px",
				onSelect
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					placement: "top",
					"as-child": "",
					content: unref(i18n).baseText("instanceAi.approvalMode.tooltip"),
					disabled: unref(isTooltipDisabled),
					"show-after": unref(500)
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						class: normalizeClass(_ctx.$style.trigger),
						"aria-label": unref(i18n).baseText("instanceAi.approvalMode.triggerLabel", { interpolate: { mode: currentLabel.value } })
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.triggerLabel) }, toDisplayString(currentLabel.value), 3), createVNode(unref(N8nIcon_default), {
							icon: "chevron-down",
							size: "small",
							class: normalizeClass(_ctx.$style.chevron)
						}, null, 8, ["class"])]),
						_: 1
					}, 8, ["class", "aria-label"])]),
					_: 1
				}, 8, [
					"content",
					"disabled",
					"show-after"
				])]),
				"item-label": withCtx(({ item }) => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.itemStack) }, [createVNode(unref(N8nText_default), {
					tag: "span",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
					_: 2
				}, 1024), createVNode(unref(N8nText_default), {
					tag: "span",
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.data?.description), 1)]),
					_: 2
				}, 1024)], 2)]),
				"item-trailing": withCtx(({ item }) => [item.checked ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: "check",
					size: "small"
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["modelValue", "items"])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1kw2t_1",
	trigger: "_trigger_1kw2t_6",
	triggerLabel: "_triggerLabel_1kw2t_12",
	chevron: "_chevron_1kw2t_16",
	itemStack: "_itemStack_1kw2t_21"
} }]]);
//#endregion
//#region src/features/ai/assistant-at-mentions/composables/useIsAssistantAtMentionsEnabled.ts
init_runtime_core_esm_bundler();
function useIsAssistantAtMentionsEnabled() {
	const posthog = usePostHog();
	return computed(() => posthog.isFeatureEnabled(AI_ASSISTANT_AT_MENTIONS_FLAG));
}
//#endregion
export { ApprovalModeSelector_default as n, useMenuTriggerTooltip as r, useIsAssistantAtMentionsEnabled as t };
