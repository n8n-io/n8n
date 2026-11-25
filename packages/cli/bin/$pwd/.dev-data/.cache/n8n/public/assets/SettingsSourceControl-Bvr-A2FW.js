import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Kd as useDocumentTitle, Kj as N8nNotice_default, LM as N8nCallout_default, PA as useMessage, Ru as usePageRedirectionHelper, S as ENVIRONMENTS_UPGRADE_DOCS_URL, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _M as Checkbox_default, _N as N8nText_default, bM as N8nExternalLink_default, bd as useLoadingService, bm as useSourceControlStore, d as useEnvironmentsVersionSwitch, dC as useToast, fN as N8nTooltip_default, f_ as SOURCE_CONTROL_HTTPS_REPO_URL_REGEX, g_ as SOURCE_CONTROL_SSH_REPO_URL_REGEX, jN as useI18n, kM as N8nColorPicker_default, rn as usePromotionsEnabled, uM as N8nFormInput_default, xM as N8nEmptyState_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as CopyInput_default } from "./CopyInput-OmhSMN7b.js";
//#region src/features/integrations/sourceControl.ee/views/SettingsSourceControl.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = {
	key: 0,
	"data-test-id": "source-control-content-licensed"
};
var _hoisted_2 = { for: "connectionType" };
var _hoisted_3 = { for: "repoUrl" };
var _hoisted_4 = { for: "httpsUsername" };
var _hoisted_5 = { for: "httpsPassword" };
var _hoisted_6 = ["href"];
var _hoisted_7 = {
	key: 6,
	"data-test-id": "source-control-connected-content"
};
var _hoisted_8 = ["href"];
var SettingsSourceControl_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsSourceControl",
	setup(__props) {
		const locale = useI18n();
		const sourceControlStore = useSourceControlStore();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const toast = useToast();
		const message = useMessage();
		const documentTitle = useDocumentTitle();
		const loadingService = useLoadingService();
		const { isAvailable: isPromotionsAvailable } = usePromotionsEnabled();
		const { busy: switchBusy, switchTo: switchEnvironmentsVersion } = useEnvironmentsVersionSwitch();
		const title = computed(() => locale.baseText(isPromotionsAvailable.value ? "settings.sourceControl.title.classic" : "settings.sourceControl.title"));
		const isInitializing = ref(true);
		const isConnected = ref(false);
		const connectionType = ref("ssh");
		const httpsUsername = ref("");
		const httpsPassword = ref("");
		const branchNameOptions = computed(() => sourceControlStore.preferences.branches.map((branch) => ({
			value: branch,
			label: branch
		})));
		const connectionTypeOptions = [{
			value: "ssh",
			label: "SSH"
		}, {
			value: "https",
			label: "HTTPS"
		}];
		const onConnect = async () => {
			loadingService.startLoading();
			loadingService.setLoadingText(locale.baseText("settings.sourceControl.loading.connecting"));
			try {
				const connectionData = {
					repositoryUrl: sourceControlStore.preferences.repositoryUrl,
					connectionType: connectionType.value
				};
				if (connectionType.value === "https") {
					connectionData.httpsUsername = httpsUsername.value;
					connectionData.httpsPassword = httpsPassword.value;
				}
				await sourceControlStore.savePreferences(connectionData);
				await sourceControlStore.getBranches();
				isConnected.value = true;
				toast.showMessage({
					title: locale.baseText("settings.sourceControl.toast.connected.title"),
					message: locale.baseText("settings.sourceControl.toast.connected.message"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, locale.baseText("settings.sourceControl.toast.connected.error"));
			}
			loadingService.stopLoading();
		};
		const onDisconnect = async () => {
			try {
				if (await message.confirm(locale.baseText("settings.sourceControl.modals.disconnect.message"), locale.baseText("settings.sourceControl.modals.disconnect.title"), {
					confirmButtonText: locale.baseText("settings.sourceControl.modals.disconnect.confirm"),
					cancelButtonText: locale.baseText("settings.sourceControl.modals.disconnect.cancel")
				}) === "confirm") {
					loadingService.startLoading();
					await sourceControlStore.disconnect(true);
					isConnected.value = false;
					httpsUsername.value = "";
					httpsPassword.value = "";
					toast.showMessage({
						title: locale.baseText("settings.sourceControl.toast.disconnected.title"),
						message: locale.baseText("settings.sourceControl.toast.disconnected.message"),
						type: "success"
					});
				}
			} catch (error) {
				toast.showError(error, locale.baseText("settings.sourceControl.toast.disconnected.error"));
			}
			loadingService.stopLoading();
		};
		const onSave = async () => {
			loadingService.startLoading();
			try {
				await sourceControlStore.updatePreferences({
					branchName: sourceControlStore.preferences.branchName,
					branchReadOnly: sourceControlStore.preferences.branchReadOnly,
					branchColor: sourceControlStore.preferences.branchColor
				});
				toast.showMessage({
					title: locale.baseText("settings.sourceControl.saved.title"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, locale.baseText("settings.sourceControl.saved.error"));
			}
			loadingService.stopLoading();
		};
		const onSelect = (b) => {
			if (b === sourceControlStore.preferences.branchName) return;
			sourceControlStore.preferences.branchName = b;
		};
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("source-control", "upgrade-source-control");
		};
		const initialize = async () => {
			await sourceControlStore.getPreferences();
			if (sourceControlStore.preferences.connected) {
				isConnected.value = true;
				connectionType.value = sourceControlStore.preferences.connectionType || "ssh";
				sourceControlStore.getBranches();
			}
		};
		onMounted(async () => {
			documentTitle.set(title.value);
			if (!sourceControlStore.isEnterpriseSourceControlEnabled) {
				isInitializing.value = false;
				return;
			}
			try {
				await initialize();
			} finally {
				isInitializing.value = false;
			}
		});
		const formValidationStatus = reactive({
			repoUrl: false,
			keyGeneratorType: false,
			httpsUsername: false,
			httpsPassword: false
		});
		function onValidate(key, value) {
			formValidationStatus[key] = value;
		}
		const repoUrlValidationRules = computed(() => {
			const baseRules = [{ name: "REQUIRED" }];
			if (connectionType.value === "ssh") baseRules.push({
				name: "MATCH_REGEX",
				config: {
					regex: SOURCE_CONTROL_SSH_REPO_URL_REGEX,
					message: locale.baseText("settings.sourceControl.repoUrlInvalid")
				}
			});
			else baseRules.push({
				name: "MATCH_REGEX",
				config: {
					regex: SOURCE_CONTROL_HTTPS_REPO_URL_REGEX,
					message: locale.baseText("settings.sourceControl.enterValidHttpsUrl")
				}
			});
			return baseRules;
		});
		const keyGeneratorTypeValidationRules = [{ name: "REQUIRED" }];
		const httpsCredentialValidationRules = [{ name: "REQUIRED" }];
		const validForConnection = computed(() => {
			if (connectionType.value === "ssh") return formValidationStatus.repoUrl;
			else return formValidationStatus.repoUrl && formValidationStatus.httpsUsername && formValidationStatus.httpsPassword;
		});
		const branchNameValidationRules = [{ name: "REQUIRED" }];
		async function refreshSshKey() {
			try {
				if (await message.confirm(locale.baseText("settings.sourceControl.modals.refreshSshKey.message"), locale.baseText("settings.sourceControl.modals.refreshSshKey.title"), {
					confirmButtonText: locale.baseText("settings.sourceControl.modals.refreshSshKey.confirm"),
					cancelButtonText: locale.baseText("settings.sourceControl.modals.refreshSshKey.cancel")
				}) === "confirm") {
					await sourceControlStore.generateKeyPair(sourceControlStore.preferences.keyGeneratorType);
					toast.showMessage({
						title: locale.baseText("settings.sourceControl.refreshSshKey.successful.title"),
						type: "success"
					});
				}
			} catch (error) {
				toast.showError(error, locale.baseText("settings.sourceControl.refreshSshKey.error.title"));
			}
		}
		const refreshBranches = async () => {
			try {
				await sourceControlStore.getBranches();
				toast.showMessage({
					title: locale.baseText("settings.sourceControl.refreshBranches.success"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, locale.baseText("settings.sourceControl.refreshBranches.error"));
			}
		};
		const onSelectSshKeyType = (value) => {
			const sshKeyType = value;
			if (sshKeyType === sourceControlStore.preferences.keyGeneratorType) return;
			sourceControlStore.preferences.keyGeneratorType = sshKeyType;
		};
		watch(connectionType, () => {
			formValidationStatus.repoUrl = false;
			formValidationStatus.httpsUsername = false;
			formValidationStatus.httpsPassword = false;
			if (!isConnected.value) sourceControlStore.preferences.repositoryUrl = "";
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(N8nHeading_default), {
				size: "2xlarge",
				tag: "h1"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(title.value), 1)]),
				_: 1
			}), unref(sourceControlStore).isEnterpriseSourceControlEnabled ? (openBlock(), createElementBlock("div", _hoisted_1, [
				unref(isPromotionsAvailable) ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 0,
					theme: "info",
					iconless: "",
					class: "mt-l"
				}, {
					trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						label: unref(locale).baseText("settings.sourceControl.switch.button"),
						loading: unref(switchBusy),
						"data-test-id": "source-control-switch-to-v2",
						onClick: _cache[0] || (_cache[0] = ($event) => unref(switchEnvironmentsVersion)("v2"))
					}, null, 8, ["label", "loading"])]),
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "settings.sourceControl.switch.callout",
						tag: "span",
						scope: "global"
					}, {
						link: withCtx(() => [createVNode(unref(N8nExternalLink_default), {
							inline: "",
							size: "small",
							href: unref(ENVIRONMENTS_UPGRADE_DOCS_URL)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.switch.link")), 1)]),
							_: 1
						}, 8, ["href"])]),
						_: 1
					})]),
					_: 1
				})) : createCommentVNode("", true),
				createVNode(unref(N8nText_default), {
					tag: "p",
					size: "small",
					color: "text-base",
					class: "mt-l mb-l"
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "settings.sourceControl.description",
						tag: "span",
						scope: "global"
					}, {
						link: withCtx(() => [createVNode(unref(N8nExternalLink_default), {
							inline: "",
							size: "small",
							href: unref(locale).baseText("settings.sourceControl.docs.url")
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.description.link")), 1)]),
							_: 1
						}, 8, ["href"])]),
						_: 1
					})]),
					_: 1
				}),
				createVNode(unref(N8nHeading_default), {
					size: "xlarge",
					tag: "h2",
					class: "mb-s"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.gitConfig")), 1)]),
					_: 1
				}),
				!isConnected.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.group)
				}, [createBaseVNode("label", _hoisted_2, toDisplayString(unref(locale).baseText("settings.sourceControl.connectionType")), 1), createVNode(unref(N8nFormInput_default), {
					id: "connectionType",
					modelValue: connectionType.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => connectionType.value = $event),
					label: "",
					type: "select",
					name: "connectionType",
					options: connectionTypeOptions,
					"data-test-id": "source-control-connection-type-select"
				}, null, 8, ["modelValue"])], 2)) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
					createBaseVNode("label", _hoisted_3, toDisplayString(connectionType.value === "ssh" ? unref(locale).baseText("settings.sourceControl.sshRepoUrl") : unref(locale).baseText("settings.sourceControl.httpsRepoUrl")), 1),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupFlex) }, [createVNode(unref(N8nFormInput_default), {
						id: "repoUrl",
						modelValue: unref(sourceControlStore).preferences.repositoryUrl,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(sourceControlStore).preferences.repositoryUrl = $event),
						label: "",
						class: "ml-0",
						name: "repoUrl",
						"validate-on-blur": "",
						"validation-rules": repoUrlValidationRules.value,
						disabled: isInitializing.value || isConnected.value,
						placeholder: connectionType.value === "ssh" ? unref(locale).baseText("settings.sourceControl.sshRepoUrlPlaceholder") : unref(locale).baseText("settings.sourceControl.httpsRepoUrlPlaceholder"),
						onValidate: _cache[3] || (_cache[3] = (value) => onValidate("repoUrl", value))
					}, null, 8, [
						"modelValue",
						"validation-rules",
						"disabled",
						"placeholder"
					]), isConnected.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						class: normalizeClass(_ctx.$style.disconnectButton),
						size: "large",
						icon: "trash-2",
						"data-test-id": "source-control-disconnect-button",
						onClick: onDisconnect
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.button.disconnect")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)], 2),
					!isConnected.value && connectionType.value === "ssh" ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						type: "info",
						class: "mt-s"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.sshFormatNotice")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					!isConnected.value && connectionType.value === "https" ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 1,
						type: "info",
						class: "mt-s"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.httpsFormatNotice")), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2),
				connectionType.value === "https" && !isConnected.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.group)
				}, [createBaseVNode("label", _hoisted_4, toDisplayString(unref(locale).baseText("settings.sourceControl.httpsUsername")), 1), createVNode(unref(N8nFormInput_default), {
					id: "httpsUsername",
					modelValue: httpsUsername.value,
					"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => httpsUsername.value = $event),
					label: "",
					name: "httpsUsername",
					type: "text",
					"validate-on-blur": "",
					"validation-rules": httpsCredentialValidationRules,
					placeholder: unref(locale).baseText("settings.sourceControl.httpsUsernamePlaceholder"),
					onValidate: _cache[5] || (_cache[5] = (value) => onValidate("httpsUsername", value))
				}, null, 8, ["modelValue", "placeholder"])], 2)) : createCommentVNode("", true),
				connectionType.value === "https" && !isConnected.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.group)
				}, [
					createBaseVNode("label", _hoisted_5, toDisplayString(unref(locale).baseText("settings.sourceControl.httpsPersonalAccessToken")), 1),
					createVNode(unref(N8nFormInput_default), {
						id: "httpsPassword",
						modelValue: httpsPassword.value,
						"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => httpsPassword.value = $event),
						label: "",
						name: "httpsPassword",
						type: "password",
						"validate-on-blur": "",
						"validation-rules": httpsCredentialValidationRules,
						placeholder: unref(locale).baseText("settings.sourceControl.httpsPersonalAccessTokenPlaceholder"),
						onValidate: _cache[7] || (_cache[7] = (value) => onValidate("httpsPassword", value))
					}, null, 8, ["modelValue", "placeholder"]),
					createVNode(unref(N8nNotice_default), {
						type: "warning",
						class: "mt-s"
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "settings.sourceControl.httpsWarningNotice",
							tag: "span",
							scope: "global"
						}, {
							strong: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(locale).baseText("settings.sourceControl.httpsWarningNotice.strong")), 1)]),
							repo: withCtx(() => [..._cache[12] || (_cache[12] = [createBaseVNode("code", null, "repo", -1)])]),
							publicRepo: withCtx(() => [..._cache[13] || (_cache[13] = [createBaseVNode("code", null, "public_repo", -1)])]),
							_: 1
						})]),
						_: 1
					})
				], 2)) : createCommentVNode("", true),
				connectionType.value === "ssh" && unref(sourceControlStore).preferences.publicKey ? (openBlock(), createElementBlock("div", {
					key: 4,
					class: normalizeClass(_ctx.$style.group)
				}, [
					createBaseVNode("label", null, toDisplayString(unref(locale).baseText("settings.sourceControl.sshKey")), 1),
					createBaseVNode("div", { class: normalizeClass({ [_ctx.$style.sshInput]: !isConnected.value }) }, [
						!isConnected.value ? (openBlock(), createBlock(unref(N8nFormInput_default), {
							key: 0,
							id: "keyGeneratorType",
							class: normalizeClass(_ctx.$style.sshKeyTypeSelect),
							label: "",
							type: "select",
							name: "keyGeneratorType",
							"data-test-id": "source-control-ssh-key-type-select",
							"validate-on-blur": "",
							"validation-rules": keyGeneratorTypeValidationRules,
							options: unref(sourceControlStore).sshKeyTypesWithLabel,
							"model-value": unref(sourceControlStore).preferences.keyGeneratorType,
							disabled: isInitializing.value,
							onValidate: _cache[8] || (_cache[8] = (value) => onValidate("keyGeneratorType", value)),
							"onUpdate:modelValue": onSelectSshKeyType
						}, null, 8, [
							"class",
							"options",
							"model-value",
							"disabled"
						])) : createCommentVNode("", true),
						createVNode(CopyInput_default, {
							class: normalizeClass(_ctx.$style.copyInput),
							collapse: "",
							size: "medium",
							value: unref(sourceControlStore).preferences.publicKey,
							"copy-button-text": unref(locale).baseText("generic.clickToCopy")
						}, null, 8, [
							"class",
							"value",
							"copy-button-text"
						]),
						!isConnected.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							variant: "outline",
							size: "large",
							icon: "refresh-cw",
							"data-test-id": "source-control-refresh-ssh-key-button",
							disabled: isInitializing.value,
							onClick: refreshSshKey
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.refreshSshKey")), 1)]),
							_: 1
						}, 8, ["disabled"])) : createCommentVNode("", true)
					], 2),
					createVNode(unref(N8nNotice_default), {
						type: "info",
						class: "mt-s"
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "settings.sourceControl.sshKeyDescription",
							tag: "span",
							scope: "global"
						}, {
							link: withCtx(() => [createBaseVNode("a", {
								href: unref(locale).baseText("settings.sourceControl.docs.setup.ssh.url"),
								target: "_blank"
							}, toDisplayString(unref(locale).baseText("settings.sourceControl.sshKeyDescriptionLink")), 9, _hoisted_6)]),
							_: 1
						})]),
						_: 1
					})
				], 2)) : createCommentVNode("", true),
				!isConnected.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 5,
					size: "large",
					disabled: isInitializing.value || !validForConnection.value,
					class: normalizeClass(_ctx.$style.connect),
					"data-test-id": "source-control-connect-button",
					onClick: onConnect
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.button.connect")), 1)]),
					_: 1
				}, 8, ["disabled", "class"])) : createCommentVNode("", true),
				isConnected.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[14] || (_cache[14] = createBaseVNode("hr", null, null, -1)),
						createVNode(unref(N8nHeading_default), {
							size: "xlarge",
							tag: "h2",
							class: "mb-s"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.instanceSettings")), 1)]),
							_: 1
						}),
						createBaseVNode("label", null, toDisplayString(unref(locale).baseText("settings.sourceControl.branches")), 1),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.branchSelection) }, [createVNode(unref(N8nFormInput_default), {
							id: "branchName",
							label: "",
							type: "select",
							name: "branchName",
							class: "mb-s",
							"data-test-id": "source-control-branch-select",
							"validate-on-blur": "",
							"validation-rules": branchNameValidationRules,
							options: branchNameOptions.value,
							"model-value": unref(sourceControlStore).preferences.branchName,
							onValidate: _cache[9] || (_cache[9] = (value) => onValidate("branchName", value)),
							"onUpdate:modelValue": onSelect
						}, null, 8, ["options", "model-value"]), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
							content: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("settings.sourceControl.refreshBranches.tooltip")), 1)]),
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "outline",
								iconOnly: "",
								size: "xlarge",
								icon: "refresh-cw",
								"aria-label": unref(locale).baseText("generic.refresh"),
								"data-test-id": "source-control-refresh-branches-button",
								class: normalizeClass(_ctx.$style.refreshBranches),
								onClick: refreshBranches
							}, null, 8, ["aria-label", "class"])]),
							_: 1
						})], 2),
						createVNode(unref(Checkbox_default), {
							modelValue: unref(sourceControlStore).preferences.branchReadOnly,
							"onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(sourceControlStore).preferences.branchReadOnly = $event),
							class: normalizeClass(_ctx.$style.readOnly),
							"data-test-id": "source-control-read-only-checkbox"
						}, {
							label: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "settings.sourceControl.protected",
								tag: "span",
								scope: "global"
							}, {
								bold: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(locale).baseText("settings.sourceControl.protected.bold")), 1)]),
								_: 1
							})]),
							_: 1
						}, 8, ["modelValue", "class"])
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createBaseVNode("label", null, toDisplayString(unref(locale).baseText("settings.sourceControl.color")), 1), createBaseVNode("div", null, [createVNode(unref(N8nColorPicker_default), {
						modelValue: unref(sourceControlStore).preferences.branchColor,
						"onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref(sourceControlStore).preferences.branchColor = $event),
						size: "small"
					}, null, 8, ["modelValue"])])], 2),
					createBaseVNode("div", { class: normalizeClass([_ctx.$style.group, "pt-s"]) }, [createVNode(unref(N8nButton_default), {
						size: "large",
						disabled: !unref(sourceControlStore).preferences.branchName,
						"data-test-id": "source-control-save-settings-button",
						onClick: onSave
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.button.save")), 1)]),
						_: 1
					}, 8, ["disabled"])], 2)
				])) : createCommentVNode("", true)
			])) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				"data-test-id": "source-control-content-unlicensed",
				class: normalizeClass(_ctx.$style.actionBox),
				description: unref(locale).baseText("settings.sourceControl.actionBox.description"),
				"button-text": unref(locale).baseText("settings.sourceControl.actionBox.buttonText"),
				"onClick:button": goToUpgrade
			}, {
				heading: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("settings.sourceControl.actionBox.title")), 1)]),
				description: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.sourceControl.actionBox.description")) + " ", 1), createBaseVNode("a", {
					href: unref(locale).baseText("settings.sourceControl.docs.url"),
					target: "_blank"
				}, toDisplayString(unref(locale).baseText("settings.sourceControl.actionBox.description.link")), 9, _hoisted_8)]),
				_: 1
			}, 8, [
				"class",
				"description",
				"button-text"
			]))]);
		};
	}
}), [["__cssModules", { "$style": {
	group: "_group_8qutv_1",
	readOnly: "_readOnly_8qutv_22",
	groupFlex: "_groupFlex_8qutv_26",
	connect: "_connect_8qutv_40",
	disconnectButton: "_disconnectButton_8qutv_44",
	actionBox: "_actionBox_8qutv_49",
	sshInput: "_sshInput_8qutv_53",
	copyInput: "_copyInput_8qutv_64",
	sshKeyTypeSelect: "_sshKeyTypeSelect_8qutv_68",
	branchSelection: "_branchSelection_8qutv_76",
	refreshBranches: "_refreshBranches_8qutv_85"
} }]]);
//#endregion
export { SettingsSourceControl_default as default };
