import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, jN as useI18n, ny as CREDENTIAL_EDIT_MODAL_KEY, tp as useTypeAvailability, uf as useNodeTypesStore, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { l as toolRefToNode } from "./useMcpServerAdapter-xfJVDU-E.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
import { n as AgentToolConfigCredentialPicker_default, r as AgentToolConfigContent_default, t as AgentToolConfigTitleIcon_default } from "./AgentToolConfigTitleIcon-WTbZnqgT.js";
//#region src/features/agents/components/AgentToolConfigModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigModal.vue
var AgentToolConfigModal_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AgentToolConfigModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const nodeTypesStore = useNodeTypesStore();
		useTypeAvailability(() => props.data.projectId);
		const content = ref(null);
		const credentialPicker = ref(null);
		const formTitle = ref(initialTitle());
		const isRestricted = ref(false);
		const isOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const isCustomTool = computed(() => props.data.kind !== "mcpServer" && props.data.kind !== "registryMcpServer" && props.data.toolRef.type === "custom");
		const credentialModalOpen = computed(() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true);
		const saveDisabled = computed(() => credentialModalOpen.value || isRestricted.value || props.data.kind === "registryMcpServer" && (content.value?.saveDisabled ?? true));
		const canRender = computed(() => {
			if (props.data.kind === "registryMcpServer") return true;
			if (props.data.kind === "mcpServer") return Boolean(props.data.initialNode);
			if (props.data.toolRef.type === "custom" || props.data.toolRef.type === "workflow") return true;
			return toolRefToNode(props.data.toolRef) !== null;
		});
		nodeTypesStore.loadNodeTypesIfNotLoaded();
		function initialTitle() {
			if (props.data.kind === "mcpServer" || props.data.kind === "registryMcpServer") return props.data.mcpServer.name;
			if (props.data.toolRef.type === "custom") return props.data.customTool?.descriptor.name ?? props.data.toolRef.id;
			return props.data.toolRef.name ?? "";
		}
		function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onOpenChange(open) {
			if (!open) closeDialog();
		}
		function handleInteractOutside(event) {
			if (credentialModalOpen.value) event.preventDefault();
		}
		function updateTitle(value) {
			formTitle.value = value;
			content.value?.changeTitle(value);
		}
		function handleConfirm() {
			if (content.value?.confirm()) closeDialog();
		}
		async function handleRemove() {
			if (await content.value?.remove()) closeDialog();
		}
		return (_ctx, _cache) => {
			return canRender.value ? (openBlock(), createBlock(AgentModal_default, {
				key: 0,
				open: isOpen.value,
				title: formTitle.value,
				"title-error": content.value?.titleError,
				"editable-title": !isCustomTool.value && !isRestricted.value,
				"stable-height": "",
				"trap-focus": !credentialModalOpen.value,
				"disable-outside-pointer-events": !credentialModalOpen.value,
				"data-testid": "agent-tool-config-modal",
				onInteractOutside: handleInteractOutside,
				"onUpdate:open": onOpenChange,
				"onUpdate:title": updateTitle
			}, createSlots({
				titlePrefix: withCtx(() => [createVNode(AgentToolConfigTitleIcon_default, { data: __props.data }, null, 8, ["data"])]),
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "solid",
					disabled: saveDisabled.value,
					"data-testid": "agent-tool-config-save",
					onClick: handleConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				default: withCtx(() => [isOpen.value ? (openBlock(), createBlock(AgentToolConfigContent_default, {
					key: 0,
					ref_key: "content",
					ref: content,
					data: __props.data,
					onCredentialDeleted: closeDialog,
					"onUpdate:title": _cache[1] || (_cache[1] = ($event) => formTitle.value = $event),
					"onUpdate:restricted": _cache[2] || (_cache[2] = ($event) => isRestricted.value = $event),
					onRequestCredentialPicker: _cache[3] || (_cache[3] = ($event) => credentialPicker.value?.open())
				}, null, 8, ["data"])) : createCommentVNode("", true)]),
				_: 2
			}, [content.value?.headerItem?.credentials?.length ? {
				name: "headerActions",
				fn: withCtx(() => [createVNode(AgentToolConfigCredentialPicker_default, {
					ref_key: "credentialPicker",
					ref: credentialPicker,
					item: content.value.headerItem,
					adapter: content.value.credentialAdapter,
					"show-connected-icon": Boolean(__props.data.onRemove),
					onSelectCredential: _cache[0] || (_cache[0] = (authType, credentialId) => content.value?.selectCredential(authType, credentialId))
				}, null, 8, [
					"item",
					"adapter",
					"show-connected-icon"
				])]),
				key: "0"
			} : void 0, __props.data.onRemove ? {
				name: "footerLeft",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					"data-testid": "agent-tool-config-remove",
					onClick: handleRemove
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "trash-2",
						size: 16
					})]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.tools.remove")), 1)]),
					_: 1
				})]),
				key: "1"
			} : void 0]), 1032, [
				"open",
				"title",
				"title-error",
				"editable-title",
				"trap-focus",
				"disable-outside-pointer-events"
			])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { AgentToolConfigModal_default as default };
