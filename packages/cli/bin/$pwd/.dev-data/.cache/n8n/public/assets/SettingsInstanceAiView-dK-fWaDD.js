import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, Bj as SettingsRow_default, ES as INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT, G as useOpenWorkflowInAssistantStore, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, Kd as useDocumentTitle, LM as N8nCallout_default, Lj as SettingsRowConfigure_default, Mp as useCredentialsStore, PA as useMessage, Pj as SettingsSection_default, Rj as SettingsEnableRow_default, SN as _plugin_vue_export_helper_default, TE as DEFAULT_INSTANCE_AI_PERMISSIONS, Uj as SettingsLayout_default, _N as N8nText_default, bM as N8nExternalLink_default, bs as isContextSkillsEnabled, dC as useToast, dM as N8nSwitch_default, hC as useTelemetry, jN as useI18n, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, tN as N8nLoading_default, vy as usePostHog, xM as N8nEmptyState_default, yC as useSettingsStore, yN as N8nButton_default, zj as EnterpriseReadinessBadge_default } from "./app-D5flEmb-.js";
import { a as useInstanceCredentialTest, t as useInstanceAiConfiguration } from "./useInstanceAiConfiguration-cCPtcGs6.js";
import { n as ConnectionDialog_default, t as SandboxSettingsRow_default } from "./SandboxSettingsRow-CKhQr3BF.js";
import { t as useSetupPageViewTelemetry } from "./instanceAiSetup.telemetry-Bw-Pyt0C.js";
//#region src/experiments/openWorkflowInAssistant/components/DefaultEditorSetting.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DefaultEditorSetting_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DefaultEditorSetting",
	setup(__props) {
		const store = useOpenWorkflowInAssistantStore();
		const i18n = useI18n();
		const toast = useToast();
		const rootEl = ref(null);
		const highlighted = ref(false);
		const selected = computed({
			get: () => store.resolvedDefaultEditor,
			set: (value) => {
				store.saveDefaultEditor(value).catch((error) => {
					toast.showError(error, i18n.baseText("experiments.openWorkflowInAssistant.setting.saveError"));
				});
			}
		});
		onMounted(() => {
			if (!store.consumeSettingHighlight()) return;
			rootEl.value?.scrollIntoView({ block: "center" });
			highlighted.value = true;
			setTimeout(() => highlighted.value = false, 2400);
		});
		return (_ctx, _cache) => {
			return unref(store).isTreatment ? (openBlock(), createElementBlock("div", {
				key: 0,
				ref_key: "rootEl",
				ref: rootEl,
				class: normalizeClass({ [_ctx.$style.highlighted]: highlighted.value }),
				"data-test-id": "default-editor-setting"
			}, [createVNode(unref(SettingsSection_default), null, {
				default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
					default: withCtx(() => [createVNode(unref(SettingsRow_default), {
						title: unref(i18n).baseText("experiments.openWorkflowInAssistant.setting.label"),
						description: unref(i18n).baseText("experiments.openWorkflowInAssistant.setting.description")
					}, {
						action: withCtx(() => [createVNode(unref(N8nSelect_default), {
							modelValue: selected.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selected.value = $event),
							size: "small",
							"data-test-id": "default-editor-select"
						}, {
							default: withCtx(() => [createVNode(unref(N8nOption_default), {
								value: "assistant",
								label: unref(i18n).baseText("experiments.openWorkflowInAssistant.setting.assistant")
							}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
								value: "manual",
								label: unref(i18n).baseText("experiments.openWorkflowInAssistant.setting.manual")
							}, null, 8, ["label"])]),
							_: 1
						}, 8, ["modelValue"])]),
						_: 1
					}, 8, ["title", "description"])]),
					_: 1
				})]),
				_: 1
			})], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	highlighted: "_highlighted_mc897_1",
	flash: "_flash_mc897_1"
} }]]);
//#endregion
//#region src/experiments/instanceAiCloudBrowser/useInstanceAiCloudBrowserExperiment.ts
init_runtime_core_esm_bundler();
function useInstanceAiCloudBrowserExperiment() {
	const posthog = usePostHog();
	return { isEnabled: computed(() => posthog.isFeatureEnabled(INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT.name)) };
}
//#endregion
//#region src/features/ai/instanceAi/views/SettingsInstanceAiView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DOCS_URL = "https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant";
var DATA_SHARING_DOCS_URL = "https://docs.n8n.io/build/ways-of-building-workflows/use-the-ai-assistant#ai-usage-settings";
var SettingsInstanceAiView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsInstanceAiView",
	setup(__props) {
		const i18n = useI18n();
		const documentTitle = useDocumentTitle();
		const message = useMessage();
		const toast = useToast();
		const telemetry = useTelemetry();
		const settingsStore = useSettingsStore();
		const credentialsStore = useCredentialsStore();
		const store = useInstanceAiSettingsStore();
		const { isTestingCredential, testSavedCredential } = useInstanceCredentialTest();
		const { modelCredential, modelConfigured: isModelConfigured, sandboxCredentialId, sandboxConfigured: isSandboxConfigured, searchCredential, searchState } = useInstanceAiConfiguration();
		const { isEnabled: isCloudBrowserExperimentEnabled } = useInstanceAiCloudBrowserExperiment();
		const isAdmin = computed(() => store.canManage);
		const isEnabled = computed(() => store.settings?.enabled ?? settingsStore.moduleSettings?.["instance-ai"]?.enabled ?? false);
		const isOff = computed(() => !isEnabled.value);
		const showCloudBrowserRow = computed(() => isCloudBrowserExperimentEnabled.value && settingsStore.isAiGatewayEnabled && settingsStore.isAiGatewayCloudUbbEnabled && !settingsStore.isMultiMain);
		const isMcpAccessEnabled = computed(() => store.settings?.mcpAccessEnabled ?? true);
		const isSelfManaged = computed(() => !store.isProxyEnabled && !store.isCloudManaged);
		const showCredentialsRows = computed(() => isAdmin.value && isSelfManaged.value);
		const showSandboxRow = computed(() => isAdmin.value && !store.isCloudManaged);
		const isModelConnectionEnvManaged = computed(() => isSelfManaged.value && (store.settings?.envManaged?.model.provider ?? store.settings?.modelEnvConfigured ?? false));
		const isModelNameEnvManaged = computed(() => isSelfManaged.value && (store.settings?.envManaged?.model.model ?? false));
		const isModelReadOnly = computed(() => isModelConnectionEnvManaged.value && isModelNameEnvManaged.value);
		const isSandboxEnvManaged = computed(() => isSelfManaged.value && (store.settings?.sandboxEnvConfigured ?? false));
		const isSearchEnvManaged = computed(() => isSelfManaged.value && (store.settings?.searchEnvConfigured ?? false));
		const modelValue = computed(() => {
			if (isModelConnectionEnvManaged.value) return i18n.baseText("instanceAi.onboarding.foundOnServer");
			if (store.settings?.modelCredentialId) return [modelCredential.value ? credentialTypeLabel(modelCredential.value.type) : "", store.settings.modelName ?? ""].filter(Boolean).join(" · ");
			return i18n.baseText("settings.n8nAgent.modelCredential.env.value");
		});
		const modelDescription = computed(() => {
			if (isModelConnectionEnvManaged.value) return {
				key: "settings.n8nAgent.modelCredential.env.description",
				warning: false
			};
			if (store.settings?.modelCredentialId && store.settings.modelName || isOff.value) return null;
			return {
				key: "settings.n8nAgent.modelCredential.missing.description",
				warning: true
			};
		});
		const searchValue = computed(() => {
			if (isSearchEnvManaged.value) return i18n.baseText("instanceAi.onboarding.foundOnServer");
			if (searchState.value === "disabled") return i18n.baseText("instanceAi.onboarding.disabled");
			return searchCredential.value ? credentialTypeLabel(searchCredential.value.type) : "";
		});
		/** Mirrors the backend `setupCompleted`: only a direct self-managed instance needs setup. */
		const isSetupComplete = computed(() => !showCredentialsRows.value || isModelConfigured.value && isSandboxConfigured.value && searchState.value !== "notset");
		const neverConfigured = computed(() => {
			if (isEnabled.value) return false;
			if (!isSelfManaged.value || !store.settings) return true;
			return !isModelConfigured.value && !isSandboxConfigured.value && searchState.value === "notset";
		});
		const emptyStateIcon = {
			type: "cards",
			center: "sparkles",
			sides: [
				"workflow",
				"message-square",
				"search",
				"bot"
			]
		};
		const PERMISSION_OPTIONS = [
			"require_approval",
			"always_allow",
			"blocked"
		];
		const PREFERENCE_PERMISSION_OPTIONS = ["always_allow", "blocked"];
		const PERMISSION_OPTION_LABEL = {
			require_approval: "settings.n8nAgent.permissions.needsApproval",
			always_allow: "settings.n8nAgent.permissions.alwaysAllow",
			blocked: "settings.n8nAgent.permissions.blocked"
		};
		const PERMISSION_GROUPS = [
			{
				id: "workflows",
				labelKey: "settings.n8nAgent.permissions.group.workflows",
				keys: [
					"createWorkflow",
					"updateWorkflow",
					"runWorkflow",
					"publishWorkflow",
					"deleteWorkflow",
					"restoreWorkflowVersion",
					"tagWorkflow",
					"moveWorkflowToFolder"
				]
			},
			{
				id: "nodes",
				labelKey: "settings.n8nAgent.permissions.group.nodes",
				keys: ["executeNode"]
			},
			{
				id: "folders",
				labelKey: "settings.n8nAgent.permissions.group.folders",
				keys: ["createFolder", "deleteFolder"]
			},
			{
				id: "dataTables",
				labelKey: "settings.n8nAgent.permissions.group.dataTables",
				keys: [
					"createDataTable",
					"mutateDataTableSchema",
					"mutateDataTableRows",
					"deleteDataTable"
				]
			},
			{
				id: "credentials",
				labelKey: "settings.n8nAgent.permissions.group.credentials",
				keys: ["createCredential", "deleteCredential"]
			},
			{
				id: "system",
				labelKey: "settings.n8nAgent.permissions.group.system",
				keys: ["cleanupTestExecutions"]
			},
			{
				id: "web",
				labelKey: "settings.n8nAgent.permissions.group.web",
				keys: ["fetchUrl", "webSearch"]
			},
			{
				id: "mcp",
				labelKey: "settings.n8nAgent.permissions.group.mcp",
				descriptionKey: "settings.n8nAgent.permissions.group.mcpDescription",
				keys: ["mcpRead", "mcpWrite"]
			},
			{
				id: "preferences",
				labelKey: "settings.n8nAgent.permissions.group.preferences",
				keys: ["createPreference"]
			}
		];
		const SKILLS_PERMISSION_GROUP = {
			id: "skills",
			labelKey: "settings.n8nAgent.permissions.group.skills",
			keys: [
				"createSkill",
				"updateSkill",
				"deleteSkill"
			]
		};
		const permissionGroups = computed(() => [...PERMISSION_GROUPS, ...isContextSkillsEnabled() ? [SKILLS_PERMISSION_GROUP] : []]);
		const expandedGroups = reactive({});
		function isGroupLocked(group) {
			return isOff.value || group.id === "mcp" && !isMcpAccessEnabled.value;
		}
		function groupSummary(group) {
			if (group.id === "mcp" && !isMcpAccessEnabled.value) return i18n.baseText("settings.n8nAgent.permissions.group.mcpDisabled");
			const exceptions = group.keys.filter((key) => store.getPermission(key) !== DEFAULT_INSTANCE_AI_PERMISSIONS[key]).length;
			if (exceptions === 0) return i18n.baseText("settings.n8nAgent.permissions.group.default");
			if (exceptions === 1) return i18n.baseText("settings.n8nAgent.permissions.group.exception");
			return i18n.baseText("settings.n8nAgent.permissions.group.exceptions", { interpolate: { count: exceptions } });
		}
		function permissionOptionsFor(key) {
			if (key === "createPreference") return PREFERENCE_PERMISSION_OPTIONS;
			return PERMISSION_OPTIONS;
		}
		/** Exactly one dialog can be active; transitions between steps never observe an all-closed state. */
		const activeDialog = ref(null);
		/** True while walking through the missing setup items, so saving one dialog opens the next. */
		const setupChain = ref(false);
		/** The switch shows on while the walkthrough runs; `enabled` is saved only once setup is complete. */
		const isEnabling = ref(false);
		const isSwitchOn = computed(() => isEnabled.value || isEnabling.value);
		/** Saved credentials that turning on still has to test. Each one is tested at most once. */
		let credentialsToTest = /* @__PURE__ */ new Set();
		function setDialogOpen(kind, isOpen) {
			if (isOpen) activeDialog.value = kind;
			else if (activeDialog.value === kind) {
				activeDialog.value = null;
				setupChain.value = false;
				isEnabling.value = false;
			}
		}
		function openModelDialog() {
			if (isModelReadOnly.value) return;
			setupChain.value = false;
			activeDialog.value = "model";
		}
		function openSandboxDialog() {
			if (isSandboxEnvManaged.value) return;
			setupChain.value = false;
			activeDialog.value = "sandbox";
		}
		function openSearchDialog() {
			if (isSearchEnvManaged.value) return;
			setupChain.value = false;
			activeDialog.value = "search";
		}
		/** A saved credential can stop working, so turning on tests it once. Other paths skip the test. */
		async function savedCredentialWorks(kind) {
			if (!isEnabling.value || !credentialsToTest.delete(kind)) return true;
			if (kind === "model") {
				const id = store.settings?.modelCredentialId;
				const credential = modelCredential.value;
				if (!id) return true;
				return !!credential && await testSavedCredential(id, credential.name, credential.type);
			}
			if (!sandboxCredentialId.value) return true;
			const type = store.settings?.sandboxProvider === "daytona" ? "daytonaApi" : "httpHeaderAuth";
			return await testSavedCredential(sandboxCredentialId.value, "n8n Assistant sandbox", type);
		}
		async function nextSetupDialog() {
			if (showCredentialsRows.value && (!isModelConfigured.value || !await savedCredentialWorks("model"))) return "model";
			if (!await enableEnvironmentSandboxIfNeeded()) return null;
			if (showSandboxRow.value && !isSandboxEnvManaged.value && (!isSandboxConfigured.value || !await savedCredentialWorks("sandbox"))) return "sandbox";
			if (showCredentialsRows.value && searchState.value === "notset") return "search";
			return null;
		}
		/**
		* Opens the dialog for the first missing setup item. When none is left, it closes the
		* walkthrough and saves a pending switch-on.
		*/
		async function continueSetup() {
			setupChain.value = true;
			const next = await nextSetupDialog();
			if (!setupChain.value) return;
			setupChain.value = next !== null;
			activeDialog.value = next;
			if (next === "model" || next === "sandbox") credentialsToTest.delete(next);
			if (next !== null || !isEnabling.value) return;
			if (isSetupComplete.value) await store.persistEnabled(true);
			isEnabling.value = false;
		}
		async function handleDialogSaved() {
			if (setupChain.value) await continueSetup();
		}
		function credentialTypeLabel(type) {
			return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
		}
		async function enableEnvironmentSandboxIfNeeded() {
			if (!isSandboxEnvManaged.value || isSandboxConfigured.value) return true;
			store.setField("sandboxEnabled", true);
			return await store.save();
		}
		useSetupPageViewTelemetry("settings");
		const permissionsDescription = computed(() => {
			const description = i18n.baseText("settings.n8nAgent.permissions.description");
			return store.approvalModesAvailable ? `${description} ${i18n.baseText("settings.n8nAgent.permissions.askFirst.description")}` : description;
		});
		onMounted(() => {
			documentTitle.set(i18n.baseText("settings.n8nAgent"));
			store.fetch();
			store.fetchPreferences();
			credentialsStore.fetchCredentialTypes(false);
		});
		async function enable() {
			credentialsToTest = new Set(showCredentialsRows.value && store.canManageInstanceCredentials ? ["model", "sandbox"] : []);
			if (isSetupComplete.value && credentialsToTest.size === 0) {
				await store.persistEnabled(true);
				return;
			}
			isEnabling.value = true;
			await continueSetup();
		}
		function onEnabledChange(value) {
			if (value) {
				enable();
				return;
			}
			confirmDisable();
		}
		async function confirmDisable() {
			if (await message.confirm(i18n.baseText("settings.n8nAgent.status.disable.description"), {
				title: i18n.baseText("settings.n8nAgent.status.disable.title"),
				confirmButtonText: i18n.baseText("settings.n8nAgent.status.disable"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) === "confirm") await store.persistEnabled(false);
		}
		function handleBrowserUseToggle(value) {
			store.setField("browserUseEnabled", value);
			store.save();
		}
		function handleCloudBrowserToggle(value) {
			store.setField("cloudBrowserEnabled", value);
			store.save();
		}
		function handleMcpAccessToggle(value) {
			store.setField("mcpAccessEnabled", value);
			store.save();
		}
		function handlePermissionChange(key, value) {
			store.setPermission(key, value);
			store.save();
		}
		const isDataSharingEnabled = computed(() => settingsStore.isAiDataSharingEnabled);
		const isSavingDataSharing = ref(false);
		const canToggleDataSharing = computed(() => !isOff.value && store.canManageAiUsage && !isDataSharingEnabled.value && !isSavingDataSharing.value);
		async function handleDataSharingToggle(value) {
			if (!value || !canToggleDataSharing.value) return;
			isSavingDataSharing.value = true;
			try {
				await settingsStore.updateAiDataSharingSettings(true);
				toast.showMessage({
					title: i18n.baseText("settings.ai.updated.success"),
					type: "success"
				});
				telemetry.track("User changed AI Usage settings", { allow_sending_parameter_values: true });
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ai.updated.error"));
			} finally {
				isSavingDataSharing.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), { "data-test-id": "n8n-agent-settings" }, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.n8nAgent"),
						description: unref(i18n).baseText("settings.n8nAgent.description"),
						"docs-url": DOCS_URL,
						"docs-label": unref(i18n).baseText("settings.n8nAgent.docsLabel")
					}, createSlots({ _: 2 }, [unref(settingsStore).isEnterprisePlan ? {
						name: "titleTrailing",
						fn: withCtx(() => [createVNode(unref(EnterpriseReadinessBadge_default), {
							size: "xsmall",
							"data-test-id": "n8n-agent-enterprise-readiness-badge"
						})]),
						key: "0"
					} : void 0]), 1032, [
						"title",
						"description",
						"docs-label"
					]),
					unref(store).isLoading ? (openBlock(), createBlock(unref(N8nLoading_default), {
						key: 0,
						rows: 3,
						"shrink-last": false
					})) : neverConfigured.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 1,
						icon: emptyStateIcon,
						heading: unref(i18n).baseText("settings.n8nAgent.empty.title"),
						description: unref(i18n).baseText("settings.n8nAgent.empty.description"),
						"button-text": isAdmin.value ? unref(i18n).baseText("settings.n8nAgent.empty.enable") : void 0,
						"button-disabled": unref(store).isSaving || isEnabling.value || unref(isTestingCredential),
						"button-variant": "solid",
						"onClick:button": enable
					}, createSlots({ _: 2 }, [isAdmin.value ? {
						name: "additionalContent",
						fn: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.empty.footnote")), 1)]),
							_: 1
						})]),
						key: "0"
					} : void 0]), 1032, [
						"heading",
						"description",
						"button-text",
						"button-disabled"
					])) : isAdmin.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
						createVNode(unref(SettingsSection_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [createVNode(unref(SettingsEnableRow_default), {
									title: unref(i18n).baseText("settings.n8nAgent.enable.label"),
									description: unref(i18n).baseText("settings.n8nAgent.enable.description"),
									enabled: isSwitchOn.value,
									disabled: unref(store).isSaving || isEnabling.value || unref(isTestingCredential),
									"switch-test-id": "n8n-agent-enable-toggle",
									"onUpdate:enabled": onEnabledChange
								}, null, 8, [
									"title",
									"description",
									"enabled",
									"disabled"
								])]),
								_: 1
							}), isEnabled.value && (showCredentialsRows.value || showSandboxRow.value) ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 0 }, {
								default: withCtx(() => [showCredentialsRows.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
									key: 0,
									class: normalizeClass({ [_ctx.$style.dim]: isOff.value }),
									clickable: !isOff.value && unref(isModelConfigured) && !isModelReadOnly.value,
									"data-test-id": "n8n-agent-model-row",
									onClick: openModelDialog
								}, createSlots({
									info: withCtx(() => [createVNode(unref(N8nText_default), {
										bold: "",
										size: "medium",
										color: "text-dark"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.modelCredential.label")), 1)]),
										_: 1
									}), modelDescription.value ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: modelDescription.value.warning ? "warning" : "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(modelDescription.value.key)), 1)]),
										_: 1
									}, 8, ["color"])) : createCommentVNode("", true)]),
									_: 2
								}, [!isOff.value ? {
									name: "action",
									fn: withCtx(() => [!unref(isModelConfigured) ? (openBlock(), createBlock(unref(N8nButton_default), {
										key: 0,
										variant: "solid",
										size: "medium",
										label: unref(i18n).baseText("settings.n8nAgent.modelCredential.add"),
										disabled: unref(store).isSaving,
										"data-test-id": "n8n-agent-model-add",
										onClick: continueSetup
									}, null, 8, ["label", "disabled"])) : isModelReadOnly.value ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 1,
										size: "small",
										color: "text-light",
										"data-test-id": "n8n-agent-model-env-value"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(modelValue.value), 1)]),
										_: 1
									})) : (openBlock(), createBlock(unref(SettingsRowConfigure_default), {
										key: 2,
										value: modelValue.value
									}, null, 8, ["value"]))]),
									key: "0"
								} : void 0]), 1032, ["class", "clickable"])) : createCommentVNode("", true), showSandboxRow.value ? (openBlock(), createBlock(SandboxSettingsRow_default, {
									key: 1,
									class: normalizeClass({ [_ctx.$style.dim]: isOff.value }),
									disabled: isOff.value,
									onConfigure: openSandboxDialog,
									onEnable: enableEnvironmentSandboxIfNeeded
								}, null, 8, ["class", "disabled"])) : createCommentVNode("", true)]),
								_: 1
							})) : createCommentVNode("", true)]),
							_: 1
						}),
						isEnabled.value ? (openBlock(), createBlock(DefaultEditorSetting_default, { key: 0 })) : createCommentVNode("", true),
						isEnabled.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
							key: 1,
							title: unref(i18n).baseText("settings.n8nAgent.capabilities.title"),
							description: unref(i18n).baseText("settings.n8nAgent.capabilities.description")
						}, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [
									showCredentialsRows.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
										key: 0,
										clickable: !isOff.value && unref(searchState) !== "notset" && !isSearchEnvManaged.value,
										"data-test-id": "n8n-agent-search-row",
										onClick: openSearchDialog
									}, createSlots({
										info: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.titleWithTag) }, [createVNode(unref(N8nText_default), {
											bold: "",
											size: "medium",
											color: "text-dark"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.search.label")), 1)]),
											_: 1
										}), createVNode(unref(N8nBadge_default), {
											variant: "success",
											size: "xsmall"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.search.recommended")), 1)]),
											_: 1
										})], 2), createVNode(unref(N8nText_default), {
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(searchState) === "env" ? unref(i18n).baseText("settings.n8nAgent.search.env.description") : unref(i18n).baseText("settings.n8nAgent.search.description")), 1)]),
											_: 1
										})]),
										_: 2
									}, [!isOff.value ? {
										name: "action",
										fn: withCtx(() => [unref(searchState) === "notset" ? (openBlock(), createBlock(unref(N8nButton_default), {
											key: 0,
											variant: "outline",
											size: "medium",
											label: unref(i18n).baseText("settings.n8nAgent.search.setup"),
											disabled: unref(store).isSaving,
											"data-test-id": "n8n-agent-search-setup",
											onClick: openSearchDialog
										}, null, 8, ["label", "disabled"])) : isSearchEnvManaged.value ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 1,
											size: "small",
											color: "text-light",
											"data-test-id": "n8n-agent-search-env-value"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(searchValue.value), 1)]),
											_: 1
										})) : (openBlock(), createBlock(unref(SettingsRowConfigure_default), {
											key: 2,
											value: searchValue.value
										}, null, 8, ["value"]))]),
										key: "0"
									} : void 0]), 1032, ["clickable"])) : createCommentVNode("", true),
									createVNode(unref(SettingsRow_default), {
										title: unref(i18n).baseText("settings.n8nAgent.browserUse.label"),
										description: unref(i18n).baseText("settings.n8nAgent.browserUse.description")
									}, {
										action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
											"model-value": !isOff.value && (unref(store).settings?.browserUseEnabled ?? true),
											disabled: unref(store).isSaving || isOff.value,
											"aria-label": unref(i18n).baseText("settings.n8nAgent.browserUse.label"),
											"data-test-id": "n8n-agent-browser-use-toggle",
											"onUpdate:modelValue": handleBrowserUseToggle
										}, null, 8, [
											"model-value",
											"disabled",
											"aria-label"
										])]),
										_: 1
									}, 8, ["title", "description"]),
									showCloudBrowserRow.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
										key: 1,
										class: normalizeClass({ [_ctx.$style.dim]: isOff.value }),
										title: unref(i18n).baseText("settings.n8nAgent.cloudBrowser.label"),
										description: unref(i18n).baseText("settings.n8nAgent.cloudBrowser.description")
									}, {
										action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
											"model-value": !isOff.value && (unref(store).settings?.cloudBrowserEnabled ?? true),
											disabled: unref(store).isSaving || isOff.value,
											"aria-label": unref(i18n).baseText("settings.n8nAgent.cloudBrowser.label"),
											"data-test-id": "n8n-agent-cloud-browser-toggle",
											"onUpdate:modelValue": handleCloudBrowserToggle
										}, null, 8, [
											"model-value",
											"disabled",
											"aria-label"
										])]),
										_: 1
									}, 8, [
										"class",
										"title",
										"description"
									])) : createCommentVNode("", true)
								]),
								_: 1
							})]),
							_: 1
						}, 8, ["title", "description"])) : createCommentVNode("", true),
						isEnabled.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
							key: 2,
							title: unref(i18n).baseText("settings.n8nAgent.mcp.title"),
							description: unref(i18n).baseText("settings.n8nAgent.mcp.description")
						}, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [createVNode(unref(SettingsRow_default), {
									title: unref(i18n).baseText("settings.n8nAgent.mcpAccess.label"),
									description: unref(i18n).baseText("settings.n8nAgent.mcpAccess.description")
								}, {
									action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
										"model-value": !isOff.value && isMcpAccessEnabled.value,
										disabled: unref(store).isSaving || isOff.value,
										"aria-label": unref(i18n).baseText("settings.n8nAgent.mcpAccess.label"),
										"data-test-id": "n8n-agent-mcp-access-toggle",
										"onUpdate:modelValue": handleMcpAccessToggle
									}, null, 8, [
										"model-value",
										"disabled",
										"aria-label"
									])]),
									_: 1
								}, 8, ["title", "description"])]),
								_: 1
							})]),
							_: 1
						}, 8, ["title", "description"])) : createCommentVNode("", true),
						isEnabled.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
							key: 3,
							title: unref(i18n).baseText("settings.n8nAgent.permissions.title"),
							description: permissionsDescription.value
						}, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(permissionGroups.value, (group) => {
									return openBlock(), createBlock(unref(SettingsRow_default), {
										key: group.id,
										modelValue: expandedGroups[group.id],
										"onUpdate:modelValue": ($event) => expandedGroups[group.id] = $event,
										class: normalizeClass({ [_ctx.$style.dim]: !isOff.value && isGroupLocked(group) }),
										title: unref(i18n).baseText(group.labelKey),
										expandable: !isGroupLocked(group),
										"expand-label": groupSummary(group),
										"collapse-label": groupSummary(group),
										"data-test-id": `n8n-agent-permission-group-${group.id}`
									}, createSlots({
										expanded: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.permissionList) }, [group.descriptionKey ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 0,
											class: normalizeClass(_ctx.$style.permissionDescription),
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(group.descriptionKey)), 1)]),
											_: 2
										}, 1032, ["class"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(group.keys, (key) => {
											return openBlock(), createElementBlock("div", {
												key,
												class: normalizeClass(_ctx.$style.permissionRow)
											}, [createVNode(unref(N8nText_default), {
												size: "small",
												color: "text-dark"
											}, {
												default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.n8nAgent.permissions.${key}`)), 1)]),
												_: 2
											}, 1024), createVNode(unref(N8nSelect_default), {
												class: normalizeClass(_ctx.$style.permissionSelect),
												"model-value": unref(store).getPermission(key),
												size: "small",
												disabled: unref(store).isSaving || isGroupLocked(group),
												"data-test-id": `n8n-agent-permission-${key}`,
												"onUpdate:modelValue": ($event) => handlePermissionChange(key, $event)
											}, {
												default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(permissionOptionsFor(key), (option) => {
													return openBlock(), createBlock(unref(N8nOption_default), {
														key: option,
														value: option,
														label: unref(i18n).baseText(PERMISSION_OPTION_LABEL[option])
													}, null, 8, ["value", "label"]);
												}), 128))]),
												_: 2
											}, 1032, [
												"class",
												"model-value",
												"disabled",
												"data-test-id",
												"onUpdate:modelValue"
											])], 2);
										}), 128))], 2)]),
										_: 2
									}, [isGroupLocked(group) ? {
										name: "action",
										fn: withCtx(() => [createVNode(unref(N8nText_default), {
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(groupSummary(group)), 1)]),
											_: 2
										}, 1024)]),
										key: "0"
									} : void 0]), 1032, [
										"modelValue",
										"onUpdate:modelValue",
										"class",
										"title",
										"expandable",
										"expand-label",
										"collapse-label",
										"data-test-id"
									]);
								}), 128))]),
								_: 1
							})]),
							_: 1
						}, 8, ["title", "description"])) : createCommentVNode("", true),
						isEnabled.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
							key: 4,
							title: unref(i18n).baseText("settings.n8nAgent.dataSharing.title")
						}, {
							description: withCtx(() => [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-base"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.dataSharing.description")) + " ", 1), createBaseVNode("span", { class: normalizeClass(_ctx.$style.docsPhrase) }, [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.dataSharing.docsLeadingText")) + " ", 1), createVNode(unref(N8nExternalLink_default), {
									inline: "",
									size: "xsmall",
									href: DATA_SHARING_DOCS_URL,
									"data-test-id": "n8n-agent-data-sharing-docs-link"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.dataSharing.docsLabel")), 1)]),
									_: 1
								})], 2)]),
								_: 1
							})]),
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [createVNode(unref(SettingsRow_default), {
									title: unref(i18n).baseText("settings.ai.allowSendingSchema.label"),
									description: unref(i18n).baseText("settings.ai.allowSendingSchema.description"),
									"data-test-id": "n8n-agent-data-sharing-schema-row"
								}, {
									action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
										"model-value": !isOff.value,
										disabled: "",
										"aria-label": unref(i18n).baseText("settings.ai.allowSendingSchema.label"),
										"data-test-id": "n8n-agent-data-sharing-schema-toggle"
									}, null, 8, ["model-value", "aria-label"])]),
									_: 1
								}, 8, ["title", "description"]), createVNode(unref(SettingsRow_default), {
									title: unref(i18n).baseText("settings.ai.allowSendingParameterValues.label"),
									description: unref(i18n).baseText("settings.n8nAgent.dataSharing.values.description"),
									"data-test-id": "n8n-agent-data-sharing-values-row"
								}, {
									action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
										"model-value": !isOff.value && isDataSharingEnabled.value,
										disabled: !canToggleDataSharing.value,
										"aria-label": unref(i18n).baseText("settings.ai.allowSendingParameterValues.label"),
										"data-test-id": "n8n-agent-data-sharing-values-toggle",
										"onUpdate:modelValue": handleDataSharingToggle
									}, null, 8, [
										"model-value",
										"disabled",
										"aria-label"
									])]),
									_: 1
								}, 8, ["title", "description"])]),
								_: 1
							}), !isDataSharingEnabled.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 0,
								theme: "warning",
								"data-test-id": "n8n-agent-data-sharing-deprecation-notice"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ai.allowSendingParameterValues.deprecated")) + " ", 1), !unref(settingsStore).isCloudDeployment ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ai.allowSendingParameterValues.deprecated.envVar")), 1)], 64)) : createCommentVNode("", true)]),
								_: 1
							})) : createCommentVNode("", true)]),
							_: 1
						}, 8, ["title"])) : createCommentVNode("", true)
					], 64)) : createCommentVNode("", true),
					!isAdmin.value && !unref(store).isLoading && !neverConfigured.value && isEnabled.value ? (openBlock(), createBlock(DefaultEditorSetting_default, { key: 3 })) : createCommentVNode("", true),
					showCredentialsRows.value && !isModelReadOnly.value ? (openBlock(), createBlock(ConnectionDialog_default, {
						key: 4,
						kind: "model",
						open: activeDialog.value === "model",
						setup: setupChain.value,
						"onUpdate:open": _cache[0] || (_cache[0] = ($event) => setDialogOpen("model", $event)),
						onSaved: handleDialogSaved
					}, null, 8, ["open", "setup"])) : createCommentVNode("", true),
					showSandboxRow.value && !isSandboxEnvManaged.value ? (openBlock(), createBlock(ConnectionDialog_default, {
						key: 5,
						kind: "sandbox",
						open: activeDialog.value === "sandbox",
						setup: showCredentialsRows.value && setupChain.value,
						"onUpdate:open": _cache[1] || (_cache[1] = ($event) => setDialogOpen("sandbox", $event)),
						onSaved: handleDialogSaved
					}, null, 8, ["open", "setup"])) : createCommentVNode("", true),
					showCredentialsRows.value && !isSearchEnvManaged.value ? (openBlock(), createBlock(ConnectionDialog_default, {
						key: 6,
						kind: "search",
						open: activeDialog.value === "search",
						setup: setupChain.value,
						"onUpdate:open": _cache[2] || (_cache[2] = ($event) => setDialogOpen("search", $event)),
						onSaved: handleDialogSaved
					}, null, 8, ["open", "setup"])) : createCommentVNode("", true)
				]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	titleWithTag: "_titleWithTag_qkc9h_1",
	dim: "_dim_qkc9h_7",
	docsPhrase: "_docsPhrase_qkc9h_13",
	permissionList: "_permissionList_qkc9h_17",
	permissionDescription: "_permissionDescription_qkc9h_24",
	permissionRow: "_permissionRow_qkc9h_28",
	permissionSelect: "_permissionSelect_qkc9h_35"
} }]]);
//#endregion
export { SettingsInstanceAiView_default as default };
