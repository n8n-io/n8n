import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, Bj as SettingsRow_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, Kd as useDocumentTitle, Mp as useCredentialsStore, Pj as SettingsSection_default, Rj as SettingsEnableRow_default, So as getAgentsSettings, Uj as SettingsLayout_default, Zj as PreviewBadge_default, _N as N8nText_default, bC as useRootStore, dC as useToast, fs as updateAgentsSettings, hM as N8nLink_default, jN as useI18n, tN as N8nLoading_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { n as ConnectionDialog_default, t as SandboxSettingsRow_default } from "./SandboxSettingsRow-CKhQr3BF.js";
//#region src/features/agents/components/AgentsSandboxSettings.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentsSandboxSettings.vue
var AgentsSandboxSettings_default = /* @__PURE__ */ defineComponent({
	__name: "AgentsSandboxSettings",
	setup(__props) {
		const i18n = useI18n();
		const toast = useToast();
		const settingsStore = useSettingsStore();
		const credentialsStore = useCredentialsStore();
		const sandboxStore = useInstanceAiSettingsStore();
		const isLoading = ref(true);
		const hasLoaded = ref(false);
		const dialogOpen = ref(false);
		const hasSettingsModule = computed(() => settingsStore.isModuleActive("instance-ai"));
		const isCloudManaged = computed(() => settingsStore.isCloudDeployment || sandboxStore.isCloudManaged);
		const connectionDescription = computed(() => {
			if (isCloudManaged.value) return i18n.baseText("instanceAi.onboarding.sandbox.description");
			if (!hasSettingsModule.value) return i18n.baseText("settings.agents.sandbox.moduleDisabled");
			return i18n.baseText("settings.agents.sandbox.loadError");
		});
		async function loadSettings() {
			isLoading.value = true;
			try {
				if (hasSettingsModule.value && !isCloudManaged.value) {
					const [settingsLoaded] = await Promise.all([sandboxStore.fetch(), credentialsStore.fetchCredentialTypes(false)]);
					hasLoaded.value = settingsLoaded && sandboxStore.settings !== null;
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.agents.sandbox.loadError"));
			} finally {
				isLoading.value = false;
			}
		}
		async function enableEnvironmentSandbox() {
			sandboxStore.setField("sandboxEnabled", true);
			await sandboxStore.save();
		}
		onMounted(loadSettings);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsSection_default), {
				title: unref(i18n).baseText("settings.agents.sandbox.title"),
				description: unref(i18n).baseText("settings.agents.sandbox.description")
			}, {
				default: withCtx(() => [isLoading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 0,
					rows: 1,
					"shrink-last": false
				})) : (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 1 }, {
					default: withCtx(() => [hasSettingsModule.value && !isCloudManaged.value && hasLoaded.value ? (openBlock(), createBlock(SandboxSettingsRow_default, {
						key: 0,
						onConfigure: _cache[0] || (_cache[0] = ($event) => dialogOpen.value = true),
						onEnable: enableEnvironmentSandbox
					})) : (openBlock(), createBlock(unref(SettingsRow_default), {
						key: 1,
						title: unref(i18n).baseText("settings.n8nAgent.sandbox.label"),
						description: connectionDescription.value,
						"max-description-lines": 3
					}, {
						action: withCtx(() => [isCloudManaged.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.agents.sandbox.cloudManaged")), 1)]),
							_: 1
						})) : !hasSettingsModule.value ? (openBlock(), createBlock(unref(N8nLink_default), {
							key: 1,
							href: "https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant#enable-agents",
							target: "_blank"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.agents.docsLabel")), 1)]),
							_: 1
						})) : (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							variant: "outline",
							onClick: loadSettings
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
							_: 1
						}))]),
						_: 1
					}, 8, ["title", "description"]))]),
					_: 1
				})), dialogOpen.value ? (openBlock(), createBlock(ConnectionDialog_default, {
					key: 2,
					open: dialogOpen.value,
					"onUpdate:open": _cache[1] || (_cache[1] = ($event) => dialogOpen.value = $event),
					kind: "sandbox"
				}, null, 8, ["open"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["title", "description"]);
		};
	}
});
//#endregion
//#region src/features/agents/views/SettingsAgentsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/agents/views/SettingsAgentsView.vue
var SettingsAgentsView_default = /* @__PURE__ */ defineComponent({
	__name: "SettingsAgentsView",
	setup(__props) {
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const documentTitle = useDocumentTitle();
		const settings = ref(null);
		const isLoading = ref(true);
		const isSaving = ref(false);
		function applySettings(value) {
			settings.value = value;
			if (settingsStore.moduleSettings.agents) settingsStore.moduleSettings.agents.enabled = value.enabled;
		}
		async function loadSettings() {
			isLoading.value = true;
			try {
				applySettings(await getAgentsSettings(rootStore.restApiContext));
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.agents.loadError"));
			} finally {
				isLoading.value = false;
			}
		}
		async function saveEnabled(enabled) {
			isSaving.value = true;
			try {
				applySettings(await updateAgentsSettings(rootStore.restApiContext, { enabled }));
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.agents.saveError"));
			} finally {
				isSaving.value = false;
			}
		}
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.agents"));
			await loadSettings();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), { "data-test-id": "agents-settings" }, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.agents"),
						description: unref(i18n).baseText("settings.agents.description"),
						"docs-url": "https://docs.n8n.io/build/build-and-manage-agents",
						"docs-label": unref(i18n).baseText("settings.agents.docsLabel"),
						"docs-leading-text": unref(i18n).baseText("settings.agents.docsLeadingText")
					}, {
						titleTrailing: withCtx(() => [createVNode(unref(PreviewBadge_default), { size: "xsmall" })]),
						_: 1
					}, 8, [
						"title",
						"description",
						"docs-label",
						"docs-leading-text"
					]),
					isLoading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
						key: 0,
						rows: 1,
						"shrink-last": false
					})) : settings.value ? (openBlock(), createBlock(unref(SettingsSection_default), { key: 1 }, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsEnableRow_default), {
								title: unref(i18n).baseText("settings.agents.enable.label"),
								description: unref(i18n).baseText("settings.agents.enable.description"),
								enabled: settings.value.enabled,
								disabled: isSaving.value,
								"onUpdate:enabled": saveEnabled
							}, null, 8, [
								"title",
								"description",
								"enabled",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						variant: "outline",
						onClick: loadSettings
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
						_: 1
					})),
					settings.value?.enabled ? (openBlock(), createBlock(AgentsSandboxSettings_default, { key: 3 })) : createCommentVNode("", true)
				]),
				_: 1
			});
		};
	}
});
//#endregion
export { SettingsAgentsView_default as default };
