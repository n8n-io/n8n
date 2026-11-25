import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, mf as renderList, pf as provide, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, LM as N8nCallout_default, OA as MarkdownEditor_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, fN as N8nTooltip_default, jN as useI18n, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { a as TOOL_ICON_AVATAR_RENDERER_KEY } from "./ToolCredentialPicker-Clmo6S9M.js";
import { t as ToolsConnectionModal_default } from "./ToolsConnectionModal-Cq-bWNJX.js";
import { t as AgentModalMultiStep_default } from "./AgentModalMultiStep-83xh6J77.js";
//#region src/features/agents/components/AgentSubAgentsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["aria-label"];
var AgentSubAgentsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSubAgentsModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		provide(TOOL_ICON_AVATAR_RENDERER_KEY, AgentPersonalisationIcon_default);
		const availableAgents = computed(() => "agents" in props.data ? props.data.agents : []);
		const pickerItems = computed(() => availableAgents.value.map((agent) => ({
			id: `agent:${agent.id}`,
			kind: "agent",
			agentId: agent.id,
			title: agent.name,
			iconSource: agent.personalisation ? {
				type: "avatar",
				personalisation: agent.personalisation
			} : void 0,
			status: agent.added ? "connected" : "none",
			category: "agents"
		})));
		const isEditing = computed(() => Boolean(props.data.selectedAgent));
		const selectedAgent = ref(props.data.selectedAgent ?? null);
		const selectedAgentIsAdded = computed(() => isEditing.value || Boolean(selectedAgent.value?.added));
		const invalidReasons = computed(() => {
			if ("invalidReasons" in props.data) return props.data.invalidReasons ?? [];
			return selectedAgent.value?.invalidReasons ?? [];
		});
		const selectedAgentHref = computed(() => {
			if ("agentHref" in props.data) return props.data.agentHref;
			return selectedAgent.value?.agentHref;
		});
		const useWhen = ref(("useWhen" in props.data ? props.data.useWhen : "") ?? "");
		const useWhenTrimmed = computed(() => useWhen.value.trim());
		const useWhenError = computed(() => {
			if (useWhenTrimmed.value.length <= 512) return "";
			return i18n.baseText("agents.builder.subAgents.useWhen.validation.maxLength", { interpolate: { max: String(512) } });
		});
		const canConfirm = computed(() => !useWhenError.value);
		const currentStep = computed(() => selectedAgent.value ? "configure" : "select");
		const title = computed(() => selectedAgent.value?.name ?? i18n.baseText("agents.builder.subAgents.modal.title"));
		function closeModal() {
			uiStore.closeModal(props.modalName);
		}
		function onSelectAgent(agent) {
			selectedAgent.value = agent;
			useWhen.value = agent.useWhen ?? "";
		}
		function onPickerItemActivate(item) {
			if (item.kind !== "agent") return;
			const agent = availableAgents.value.find((candidate) => candidate.id === item.agentId);
			if (agent) onSelectAgent(agent);
		}
		function onCreateAgent() {
			if (!("onCreateAgent" in props.data) || !props.data.onCreateAgent) return;
			closeModal();
			props.data.onCreateAgent();
		}
		function onBack() {
			if (isEditing.value) return;
			selectedAgent.value = null;
			useWhen.value = "";
		}
		function onRemove() {
			if (!selectedAgent.value) return;
			props.data.onRemove?.(selectedAgent.value.id);
			closeModal();
		}
		function onConfirm() {
			if (!selectedAgent.value || !canConfirm.value) return;
			props.data.onConfirm({
				agentId: selectedAgent.value.id,
				...useWhenTrimmed.value ? { useWhen: useWhenTrimmed.value } : {}
			});
			closeModal();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModalMultiStep_default, {
				open: modalOpen.value,
				step: currentStep.value,
				title: title.value,
				"show-back": Boolean(selectedAgent.value) && !isEditing.value,
				"show-footer": Boolean(selectedAgent.value),
				"data-testid": "agent-sub-agents-modal",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => !$event && closeModal()),
				onBack
			}, createSlots({
				headerActions: withCtx(() => [selectedAgent.value && selectedAgentHref.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					icon: "external-link",
					variant: "ghost",
					size: "small",
					href: selectedAgentHref.value,
					target: "_blank",
					rel: "noopener noreferrer",
					title: unref(i18n).baseText("agents.builder.subAgents.open"),
					"aria-label": unref(i18n).baseText("agents.builder.subAgents.open"),
					"data-testid": "agent-sub-agents-modal-open"
				}, null, 8, [
					"href",
					"title",
					"aria-label"
				])) : createCommentVNode("", true)]),
				default: withCtx(() => [withDirectives(createVNode(ToolsConnectionModal_default, {
					open: modalOpen.value,
					items: pickerItems.value,
					categories: ["agents"],
					"detail-item": null,
					"search-placeholder": unref(i18n).baseText("agents.builder.subAgents.modal.search.placeholder"),
					"empty-message": unref(i18n).baseText("agents.builder.subAgents.modal.empty.title"),
					"no-results-message": unref(i18n).baseText("agents.builder.subAgents.modal.noResults.title"),
					"create-action": "onCreateAgent" in __props.data && __props.data.onCreateAgent ? {
						category: "agents",
						label: unref(i18n).baseText("projects.header.create.agent"),
						description: unref(i18n).baseText("projectRoles.agent:create.tooltip"),
						testId: "agent-sub-agents-modal-create"
					} : void 0,
					"connect-label": () => unref(i18n).baseText("agents.builder.subAgents.modal.add"),
					"connect-aria-label": (item) => unref(i18n).baseText("agents.builder.subAgents.modal.addAriaLabel", { interpolate: { name: item.title } }),
					"connected-label": () => unref(i18n).baseText("agents.builder.subAgents.modal.added"),
					embedded: "",
					"show-connect-actions": "",
					"persistent-scrollbar": "",
					onConnect: onPickerItemActivate,
					onOpenDetail: onPickerItemActivate,
					onCreate: onCreateAgent
				}, null, 8, [
					"open",
					"items",
					"search-placeholder",
					"empty-message",
					"no-results-message",
					"create-action",
					"connect-label",
					"connect-aria-label",
					"connected-label"
				]), [[vShow, !selectedAgent.value]]), selectedAgent.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.content, _ctx.$style.configureContent])
				}, [invalidReasons.value.length > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 0,
					theme: "danger",
					"data-testid": "agent-sub-agents-modal-invalid-callout"
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(invalidReasons.value, (reason) => {
						return openBlock(), createElementBlock("div", { key: reason }, toDisplayString(reason), 1);
					}), 128))]),
					_: 1
				})) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
					createBaseVNode("label", { class: normalizeClass(_ctx.$style.label) }, [createVNode(unref(N8nText_default), {
						size: "small",
						bold: true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.subAgents.useWhen.label")), 1)]),
						_: 1
					}), createVNode(unref(N8nTooltip_default), {
						content: unref(i18n).baseText("agents.builder.subAgents.useWhen.hint"),
						placement: "top"
					}, {
						default: withCtx(() => [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.infoIcon),
							"aria-label": unref(i18n).baseText("agents.builder.subAgents.useWhen.hint"),
							tabindex: "0"
						}, [createVNode(unref(N8nIcon_default), {
							icon: "info",
							size: "small"
						})], 10, _hoisted_1)]),
						_: 1
					}, 8, ["content"])], 2),
					createVNode(unref(MarkdownEditor_default), {
						class: normalizeClass(_ctx.$style.useWhenEditor),
						"model-value": useWhen.value,
						placeholder: unref(i18n).baseText("agents.builder.subAgents.useWhen.placeholder"),
						"show-toolbar": "floating",
						"max-height": "100%",
						"data-testid": "agent-sub-agents-modal-use-when",
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => useWhen.value = $event)
					}, null, 8, [
						"class",
						"model-value",
						"placeholder"
					]),
					useWhenError.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "danger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(useWhenError.value), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.subAgents.useWhen.characterCount", { interpolate: {
							count: String(useWhen.value.length),
							max: String(unref(512))
						} })), 1)]),
						_: 1
					})
				], 2)], 2)) : createCommentVNode("", true)]),
				_: 2
			}, [selectedAgent.value && selectedAgentIsAdded.value && __props.data.onRemove ? {
				name: "footerLeft",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					"data-testid": "agent-sub-agents-modal-remove",
					onClick: onRemove
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "trash-2",
						size: 16
					})]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.subAgents.modal.remove")), 1)]),
					_: 1
				})]),
				key: "0"
			} : void 0, selectedAgent.value ? {
				name: "footerActions",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "solid",
					"data-testid": "agent-sub-agents-modal-confirm",
					onClick: onConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				})]),
				key: "1"
			} : void 0]), 1032, [
				"open",
				"step",
				"title",
				"show-back",
				"show-footer"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_gyuq5_1",
	configureContent: "_configureContent_gyuq5_7",
	field: "_field_gyuq5_11",
	label: "_label_gyuq5_19",
	infoIcon: "_infoIcon_gyuq5_25",
	useWhenEditor: "_useWhenEditor_gyuq5_31"
} }]]);
//#endregion
export { AgentSubAgentsModal_default as default };
