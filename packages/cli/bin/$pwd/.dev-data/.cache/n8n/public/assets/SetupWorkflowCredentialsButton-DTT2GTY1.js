import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Tf as watch, Vd as createCommentVNode, Xf as unref, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, of as onBeforeUnmount } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Jg as useUIStore, SN as _plugin_vue_export_helper_default, VS as TEMPLATE_SETUP_EXPERIENCE, af as doesNodeHaveAllCredentialsFilled, fN as N8nTooltip_default, il as useSetupPanelStore, jN as useI18n, mx as SETUP_CREDENTIALS_MODAL_KEY, rd as useFocusPanelStore, uf as useNodeTypesStore, vy as usePostHog, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useReadyToRunStore } from "./readyToRun.store-CpURRYj-.js";
//#region src/features/workflows/templates/components/SetupWorkflowCredentialsButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SetupWorkflowCredentialsButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SetupWorkflowCredentialsButton",
	props: { collapsible: {
		type: Boolean,
		default: false
	} },
	setup(__props) {
		const readyToRunStore = useReadyToRunStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const nodeTypesStore = useNodeTypesStore();
		const posthogStore = usePostHog();
		const uiStore = useUIStore();
		const focusPanelStore = useFocusPanelStore();
		const setupPanelStore = useSetupPanelStore();
		const i18n = useI18n();
		const route = useRoute();
		const label = computed(() => i18n.baseText("nodeView.setupTemplate"));
		const isTemplateImportRoute = computed(() => {
			return route.query.templateId !== void 0;
		});
		const isTemplateSetupCompleted = computed(() => {
			return !!workflowDocumentStore?.value?.meta?.templateCredsSetupCompleted;
		});
		const allCredentialsFilled = computed(() => {
			if (isTemplateSetupCompleted.value) return true;
			const nodes = (workflowDocumentStore?.value?.allNodes ?? []).filter((node) => !node.disabled);
			if (!nodes.length) return true;
			return nodes.every((node) => doesNodeHaveAllCredentialsFilled(nodeTypesStore, node));
		});
		const isNewTemplatesSetupEnabled = computed(() => {
			return posthogStore.getVariant(TEMPLATE_SETUP_EXPERIENCE.name) === TEMPLATE_SETUP_EXPERIENCE.variant;
		});
		const isSetupPanelFeatureEnabled = computed(() => {
			return setupPanelStore.isFeatureEnabled;
		});
		const showButton = computed(() => {
			if (!!!workflowDocumentStore?.value?.meta?.templateId) return false;
			if (isSetupPanelFeatureEnabled.value) return (workflowDocumentStore?.value?.allNodes ?? []).length > 0 && !allCredentialsFilled.value;
			if (isTemplateSetupCompleted.value) return false;
			return !allCredentialsFilled.value;
		});
		const isButtonDisabled = computed(() => {
			return isSetupPanelFeatureEnabled.value && focusPanelStore.focusPanelActive && focusPanelStore.selectedTab === "setup";
		});
		const unsubscribe = watch(allCredentialsFilled, (newValue) => {
			if (newValue) {
				workflowDocumentStore?.value?.addToMeta({ templateCredsSetupCompleted: true });
				unsubscribe();
			}
		});
		const openSetupPanel = () => {
			focusPanelStore.setSelectedTab("setup");
			focusPanelStore.openFocusPanel();
		};
		const openSetupModal = () => {
			uiStore.openModal(SETUP_CREDENTIALS_MODAL_KEY);
		};
		const handleTemplateSetup = () => {
			if (isSetupPanelFeatureEnabled.value) openSetupPanel();
			else openSetupModal();
		};
		onBeforeUnmount(() => {
			uiStore.closeModal(SETUP_CREDENTIALS_MODAL_KEY);
		});
		const shouldAutoOpenSetup = computed(() => {
			const templateId = workflowDocumentStore?.value?.meta?.templateId;
			return isNewTemplatesSetupEnabled.value && !readyToRunStore.isReadyToRunTemplateId(templateId) && showButton.value && isTemplateImportRoute.value;
		});
		let hasAutoOpened = false;
		watch(shouldAutoOpenSetup, (shouldOpen) => {
			if (hasAutoOpened || !shouldOpen) return;
			hasAutoOpened = true;
			handleTemplateSetup();
		}, { immediate: true });
		return (_ctx, _cache) => {
			return showButton.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.container)
			}, [createVNode(unref(N8nButton_default), {
				variant: "outline",
				label: label.value,
				disabled: isButtonDisabled.value,
				class: normalizeClass({ [_ctx.$style.full]: __props.collapsible }),
				"data-test-id": "setup-credentials-button",
				size: "large",
				icon: "package-open",
				onClick: _cache[0] || (_cache[0] = ($event) => handleTemplateSetup())
			}, null, 8, [
				"label",
				"disabled",
				"class"
			]), __props.collapsible ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: label.value,
				placement: "bottom"
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"icon-only": "",
					"aria-label": label.value,
					disabled: isButtonDisabled.value,
					class: normalizeClass(_ctx.$style.compact),
					"data-test-id": "setup-credentials-button-compact",
					size: "large",
					icon: "package-open",
					onClick: _cache[1] || (_cache[1] = ($event) => handleTemplateSetup())
				}, null, 8, [
					"aria-label",
					"disabled",
					"class"
				])]),
				_: 1
			}, 8, ["content"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_q8v89_1",
	compact: "_compact_q8v89_5",
	full: "_full_q8v89_10"
} }]]);
//#endregion
export { SetupWorkflowCredentialsButton_default as default };
