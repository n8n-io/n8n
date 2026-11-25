import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Zd as h, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, LM as N8nCallout_default, Lm as getActivatableTriggerNodes, Mp as useCredentialsStore, Od as useWorkflowsStore, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Tx as WORKFLOW_PUBLISH_MODAL_KEY, dC as useToast, hM as N8nLink_default, jM as createEventBus, jN as useI18n, p as telemetry, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as generateVersionLabelFromId } from "./useWorkflowVersionLabel-cYv19BC7.js";
import "./utils-BtEtrbw8.js";
import { t as useWorkflowActivate } from "./useWorkflowActivate-DR1rBXaN.js";
import { t as WorkflowVersionForm_default } from "./WorkflowVersionForm-irlaPXZc.js";
//#region src/features/workflows/components/WorkflowActivationErrorMessage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/workflows/components/WorkflowActivationErrorMessage.vue
var WorkflowActivationErrorMessage_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowActivationErrorMessage",
	props: { message: {} },
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createTextVNode(toDisplayString(unref(i18n).baseText("workflowActivator.showMessage.displayActivationError.message.errorDataNotUndefined")) + " ", 1),
				_cache[0] || (_cache[0] = createBaseVNode("br", null, null, -1)),
				createBaseVNode("i", null, toDisplayString(__props.message), 1)
			]);
		};
	}
});
//#endregion
//#region src/features/workflows/components/WorkflowPublishModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowPublishModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowPublishModal",
	setup(__props) {
		const modalBus = createEventBus();
		const i18n = useI18n();
		const workflowsStore = useWorkflowsStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const credentialsStore = useCredentialsStore();
		const { showMessage, showError } = useToast();
		const workflowActivate = useWorkflowActivate();
		const publishing = ref(false);
		const publishForm = useTemplateRef("publishForm");
		const description = ref("");
		const versionName = ref("");
		const foundTriggers = computed(() => getActivatableTriggerNodes(workflowDocumentStore.value.workflowTriggerNodes));
		const containsTrigger = computed(() => {
			return foundTriggers.value.length > 0;
		});
		const wfHasAnyChanges = computed(() => {
			return workflowDocumentStore.value?.versionId !== workflowDocumentStore.value?.activeVersion?.versionId;
		});
		const isReattempt = computed(() => workflowDocumentStore.value.publicationStatus === "partial" || workflowDocumentStore.value.publicationStatus === "failed");
		const nodesWithValidationIssues = computed(() => workflowDocumentStore.value.publishBlockingNodes);
		const hasNodeIssues = computed(() => workflowDocumentStore.value.hasPublishBlockingIssues);
		const inputsDisabled = computed(() => {
			return !(wfHasAnyChanges.value || isReattempt.value) || !containsTrigger.value || hasNodeIssues.value || publishing.value;
		});
		const isPublishDisabled = computed(() => {
			return inputsDisabled.value || versionName.value.trim().length === 0;
		});
		const activeCalloutId = computed(() => {
			if (!containsTrigger.value) return "noTrigger";
			if (hasNodeIssues.value) return "nodeIssues";
			if (isReattempt.value) return "reattempt";
			if (!wfHasAnyChanges.value && !publishing.value) return "noChanges";
			return null;
		});
		function onModalOpened() {
			publishForm.value?.focusInput();
		}
		onMounted(() => {
			const currentVersionData = workflowDocumentStore.value?.versionData;
			if (!versionName.value) {
				if (currentVersionData?.name) versionName.value = currentVersionData.name;
				else versionName.value = generateVersionLabelFromId(workflowDocumentStore.value?.versionId ?? "");
			}
			if (!description.value && currentVersionData?.description) description.value = currentVersionData.description;
			modalBus.on("opened", onModalOpened);
		});
		onBeforeUnmount(() => {
			modalBus.off("opened", onModalOpened);
		});
		function findManagedOpenAiCredentialId(usedCredentials) {
			return Object.keys(usedCredentials).find((credentialId) => {
				const credential = credentialsStore.state.credentials[credentialId];
				return credential?.isManaged && credential.type === "openAiApi";
			});
		}
		function hasActiveNodeUsingCredential(nodes, credentialId) {
			return nodes.some((node) => node?.credentials?.["openAiApi"]?.id === credentialId && !node.disabled);
		}
		/**
		* Determines if the warning for free AI credits should be shown in the workflow.
		*
		* This computed property evaluates whether to display a warning about free AI credits
		* in the workflow. The warning is shown when both conditions are met:
		* 1. The workflow uses managed OpenAI API credentials
		* 2. Those credentials are associated with at least one enabled node
		*
		*/
		const shouldShowFreeAiCreditsWarning = computed(() => {
			const usedCredentials = workflowDocumentStore.value?.usedCredentials;
			if (!usedCredentials) return false;
			const managedOpenAiCredentialId = findManagedOpenAiCredentialId(usedCredentials);
			if (!managedOpenAiCredentialId) return false;
			return hasActiveNodeUsingCredential(workflowDocumentStore.value?.allNodes ?? [], managedOpenAiCredentialId);
		});
		async function displayActivationError() {
			let errorMessage;
			try {
				const errorData = await workflowsStore.getActivationError(workflowDocumentStore.value.workflowId);
				if (errorData === void 0) errorMessage = i18n.baseText("workflowActivator.showMessage.displayActivationError.message.errorDataUndefined");
				else errorMessage = h(WorkflowActivationErrorMessage_default, { message: errorData });
			} catch {
				errorMessage = i18n.baseText("workflowActivator.showMessage.displayActivationError.message.catchBlock");
			}
			showMessage({
				title: i18n.baseText("workflowActivator.showMessage.displayActivationError.title"),
				message: errorMessage,
				type: "warning",
				duration: 0
			});
		}
		function onPublishSucceeded() {
			publishing.value = false;
			workflowDocumentStore.value?.setVersionData({
				versionId: workflowDocumentStore.value?.versionId ?? "",
				name: versionName.value,
				description: description.value
			});
			if (shouldShowFreeAiCreditsWarning.value) showMessage({
				title: i18n.baseText("freeAi.credits.showWarning.workflow.activation.title"),
				message: i18n.baseText("freeAi.credits.showWarning.workflow.activation.description"),
				type: "warning",
				duration: 0
			});
			telemetry.track("User published version from canvas", { workflow_id: workflowDocumentStore.value.workflowId });
			modalBus.emit("close");
		}
		async function handlePublish() {
			if (isPublishDisabled.value) return;
			const versionId = workflowDocumentStore.value?.versionId ?? "";
			publishing.value = true;
			try {
				const { success, errorHandled } = await workflowActivate.publishWorkflow(workflowDocumentStore.value.workflowId, versionId, {
					name: versionName.value,
					description: description.value
				});
				if (success) onPublishSucceeded();
				else if (!errorHandled) await displayActivationError();
			} catch (error) {
				showError(error, i18n.baseText("workflowActivator.showError.title", { interpolate: { newStateName: "published" } }));
			} finally {
				publishing.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				"max-width": "500px",
				"max-height": "85vh",
				name: unref(WORKFLOW_PUBLISH_MODAL_KEY),
				center: true,
				"show-close": true,
				"close-on-click-modal": false,
				"event-bus": unref(modalBus)
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), { size: "xlarge" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.publishModal.title")), 1)]),
					_: 1
				})]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					activeCalloutId.value === "noTrigger" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "danger",
						icon: "status-error",
						"data-test-id": "workflow-publish-callout-no-trigger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.publishModal.noTriggerMessage")), 1)]),
						_: 1
					})) : activeCalloutId.value === "nodeIssues" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "danger",
						icon: "status-error",
						"data-test-id": "workflow-publish-callout-node-issues"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title", {
							interpolate: { count: nodesWithValidationIssues.value.length },
							adjustToNumber: nodesWithValidationIssues.value.length
						})) + " ", 1), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.nodeLinks) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(nodesWithValidationIssues.value, (node) => {
							return openBlock(), createElementBlock("li", { key: node.id }, [createVNode(unref(N8nLink_default), {
								size: "small",
								to: `/workflow/${unref(workflowDocumentStore).workflowId}/${node.id}`,
								onClick: _cache[0] || (_cache[0] = ($event) => unref(modalBus).emit("close"))
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(node.name), 1)]),
								_: 2
							}, 1032, ["to"])]);
						}), 128))], 2)]),
						_: 1
					})) : activeCalloutId.value === "reattempt" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 2,
						theme: "info",
						"data-test-id": "workflow-publish-callout-reattempt"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.publishModal.reattempt")), 1)]),
						_: 1
					})) : activeCalloutId.value === "noChanges" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 3,
						theme: "warning",
						"data-test-id": "workflow-publish-callout-no-changes"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.publishModal.noChanges")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(WorkflowVersionForm_default, {
						ref_key: "publishForm",
						ref: publishForm,
						"version-name": versionName.value,
						"onUpdate:versionName": _cache[1] || (_cache[1] = ($event) => versionName.value = $event),
						description: description.value,
						"onUpdate:description": _cache[2] || (_cache[2] = ($event) => description.value = $event),
						disabled: inputsDisabled.value,
						"version-name-test-id": "workflow-publish-version-name-input",
						"description-test-id": "workflow-publish-description-input",
						onSubmit: handlePublish
					}, null, 8, [
						"version-name",
						"description",
						"disabled"
					]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						disabled: publishing.value,
						label: unref(i18n).baseText("generic.cancel"),
						"data-test-id": "workflow-publish-cancel-button",
						onClick: _cache[3] || (_cache[3] = ($event) => unref(modalBus).emit("close"))
					}, null, 8, ["disabled", "label"]), createVNode(unref(N8nButton_default), {
						disabled: isPublishDisabled.value,
						loading: publishing.value,
						label: unref(i18n).baseText("workflows.publish"),
						"data-test-id": "workflow-publish-button",
						onClick: handlePublish
					}, null, 8, [
						"disabled",
						"loading",
						"label"
					])], 2)
				], 2)]),
				_: 1
			}, 8, ["name", "event-bus"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_5ppvg_1",
	actions: "_actions_5ppvg_7",
	nodeLinks: "_nodeLinks_5ppvg_13"
} }]]);
//#endregion
export { WorkflowPublishModal_default as default };
