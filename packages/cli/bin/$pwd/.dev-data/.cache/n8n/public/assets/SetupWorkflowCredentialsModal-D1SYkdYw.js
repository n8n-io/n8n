import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, uf as onUnmounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Jg as useUIStore, Mp as useCredentialsStore, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, dd as useNodeHelpers, hC as useTelemetry, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { n as AppsRequiringCredsNotice_default, r as useCredentialSetupState, t as SetupTemplateFormStep_default } from "./SetupTemplateFormStep-DDtJVfdQ.js";
//#region src/features/workflows/templates/composables/useSetupWorkflowCredentialsModalState.ts
init_runtime_core_esm_bundler();
var useSetupWorkflowCredentialsModalState = () => {
	const credentialsStore = useCredentialsStore();
	const nodeHelpers = useNodeHelpers();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowNodes = computed(() => {
		return workflowDocumentStore.value?.allNodes ?? [];
	});
	const { appCredentials, credentialOverrides, credentialUsages, credentialsByKey, numFilledCredentials, selectedCredentialIdByKey, setSelectedCredentialId, unsetSelectedCredential } = useCredentialSetupState(workflowNodes);
	/**
	* Selects initial credentials. For existing workflows this means using
	* the credentials that are already set on the nodes.
	*/
	const setInitialCredentialSelection = () => {
		selectedCredentialIdByKey.value = {};
		for (const credUsage of credentialUsages.value) {
			const credential = credentialsStore.getCredentialsByType(credUsage.credentialType).find((cred) => cred.name === credUsage.credentialName);
			if (!credential) continue;
			selectedCredentialIdByKey.value[credUsage.key] = credential.id;
		}
	};
	/**
	* Sets the given credential to all nodes that use it.
	*/
	const setCredential = (credentialKey, credentialId) => {
		setSelectedCredentialId(credentialKey, credentialId);
		const usages = credentialsByKey.value.get(credentialKey);
		if (!usages) return;
		const credential = {
			id: credentialId,
			name: credentialsStore.getCredentialById(credentialId)?.name
		};
		usages.usedBy.forEach((node) => {
			workflowDocumentStore.value?.updateNodeProperties({
				name: node.name,
				properties: { credentials: {
					...node.credentials,
					[usages.credentialType]: credential
				} }
			});
			nodeHelpers.updateNodeCredentialIssuesByName(node.name);
		});
		setInitialCredentialSelection();
	};
	/**
	* Removes given credential from all nodes that use it.
	*/
	const unsetCredential = (credentialKey) => {
		unsetSelectedCredential(credentialKey);
		const usages = credentialsByKey.value.get(credentialKey);
		if (!usages) return;
		usages.usedBy.forEach((node) => {
			const credentials = { ...node.credentials };
			delete credentials[usages.credentialType];
			workflowDocumentStore.value?.updateNodeProperties({
				name: node.name,
				properties: { credentials }
			});
			nodeHelpers.updateNodeCredentialIssuesByName(node.name);
		});
		setInitialCredentialSelection();
	};
	return {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setInitialCredentialSelection,
		setCredential,
		unsetCredential
	};
};
//#endregion
//#region src/features/workflows/templates/components/SetupWorkflowCredentialsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var SetupWorkflowCredentialsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SetupWorkflowCredentialsModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const uiStore = useUIStore();
		const props = __props;
		const modalTitle = computed(() => {
			if (props.data?.source === "builder") return i18n.baseText("setupCredentialsModal.title.builder");
			return i18n.baseText("setupCredentialsModal.title");
		});
		const { appCredentials, credentialUsages, numFilledCredentials, selectedCredentialIdByKey, setInitialCredentialSelection, setCredential, unsetCredential } = useSetupWorkflowCredentialsModalState();
		onMounted(() => {
			setInitialCredentialSelection();
			telemetry.track("User opened cred setup", { source: props.data?.source ?? "canvas" });
		});
		onUnmounted(() => {
			telemetry.track("User closed cred setup", {
				completed: numFilledCredentials.value === credentialUsages.value.length,
				creds_filled: numFilledCredentials.value,
				creds_needed: credentialUsages.value.length,
				workflow_id: workflowDocumentStore.value.workflowId,
				source: props.data?.source ?? "canvas"
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				width: "700px",
				"max-height": "90%",
				name: props.modalName
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(modalTitle.value), 1)]),
					_: 1
				})]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.grid) }, [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.notice),
					"data-test-id": "info-callout"
				}, [createVNode(AppsRequiringCredsNotice_default, {
					"app-credentials": unref(appCredentials),
					source: props.data?.source
				}, null, 8, ["app-credentials", "source"])], 2), createBaseVNode("div", null, [createBaseVNode("ol", { class: normalizeClass(_ctx.$style.appCredentialsContainer) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(credentialUsages), (credentials, index) => {
					return openBlock(), createBlock(SetupTemplateFormStep_default, {
						key: credentials.key,
						class: normalizeClass(_ctx.$style.appCredential),
						order: index + 1,
						credentials,
						"selected-credential-id": unref(selectedCredentialIdByKey)[credentials.key],
						source: props.data?.source,
						onCredentialSelected: _cache[0] || (_cache[0] = ($event) => unref(setCredential)($event.credentialUsageKey, $event.credentialId)),
						onCredentialDeselected: _cache[1] || (_cache[1] = ($event) => unref(unsetCredential)($event.credentialUsageKey))
					}, null, 8, [
						"class",
						"order",
						"credentials",
						"selected-credential-id",
						"source"
					]);
				}), 128))], 2)])], 2)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					size: "large",
					label: unref(i18n).baseText("templateSetup.continue.button"),
					disabled: unref(numFilledCredentials) === 0,
					"data-test-id": "continue-button",
					onClick: _cache[2] || (_cache[2] = ($event) => unref(uiStore).closeModal(props.modalName))
				}, null, 8, ["label", "disabled"])], 2)]),
				_: 1
			}, 8, ["name"]);
		};
	}
}), [["__cssModules", { "$style": {
	grid: "_grid_1a6i4_1",
	notice: "_notice_1a6i4_9",
	appCredentialsContainer: "_appCredentialsContainer_1a6i4_13",
	appCredential: "_appCredential_1a6i4_13",
	footer: "_footer_1a6i4_25"
} }]]);
//#endregion
export { SetupWorkflowCredentialsModal_default as default };
