import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Eu as useActiveElement, Gd as createTextVNode, Hd as createElementBlock, Hu as useMediaQuery, Iu as useEventListener, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nf as init_reactivity_esm_bundler, Oa as v4, Pd as Fragment, Pu as useElementSize, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, af as onBeforeMount, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $l as AGENT_EDITOR_MODAL_KEY, EM as Select_default, Ej as useResizablePanel, Fa as unflattenModel, Fx as LOCAL_STORAGE_CHAT_HUB_HAD_CONVERSATION_BEFORE, GS as EnterpriseEditionFeature, Hc as CredentialIcon_default, Ix as LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL, Jg as useUIStore, Kd as useDocumentTitle, NM as N8nCard_default, Nr as openOAuthPopup, Oa as isLlmProvider, Pr as waitForOAuthCallback, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Tj as N8nResizeWrapper_default, Ua as fetchWorkflowExecutionStatus, Wa as revokeDynamicCredential, Yh as shouldIgnoreCanvasShortcut, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, bN as N8nSpinner_default, ba as findOneFromModelsResponse, dC as useToast, eu as CHAT_CONVERSATION_VIEW, fC as VIEWS, fN as N8nTooltip_default, fT as ROLE, fd as usePrivateCredentials, gT as chatHubConversationModelSchema, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, kr as getTrustedOAuthOrigins, lu as MOBILE_MEDIA_QUERY, ou as CHAT_VIEW, pT as PROVIDER_CREDENTIAL_TYPE_MAP, pa as collectChatArtifacts, sj as N8nScrollArea_default, ua as useChatStore, uv as INVITE_USER_MODAL_KEY, vN as N8nIconButton_default, wm as hasRole, xN as N8nIcon_default, xa as flattenModel, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default, za as authorizeDynamicCredential } from "./app-D5flEmb-.js";
import { a as useChatSession, i as ChatMarkdownChunk_default, n as ChatPrompt_default, r as ChatMessage_default, t as ChatGreetings_default } from "./ChatGreetings-C05g-xD1.js";
import { t as useFileDrop } from "./useFileDrop-DXIUwF1i.js";
import { t as useFreeAiCredits } from "./useFreeAiCredits-D2CXiIAV.js";
import { n as useChatCredentials, r as chatHubConversationModelWithCachedDisplayNameSchema, t as ChatLayout_default } from "./ChatLayout--OXCoEkA.js";
import { n as ModelSelector_default, t as useCustomAgent } from "./useCustomAgent-BPq3mtvM.js";
//#region src/features/ai/chatHub/components/ChatConversationHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatConversationHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatConversationHeader",
	props: {
		selectedModel: {},
		credentials: {},
		readyToShowModelSelector: { type: Boolean },
		showArtifactIcon: { type: Boolean },
		hasDynamicCredentials: { type: Boolean }
	},
	emits: [
		"selectModel",
		"renameConversation",
		"editCustomAgent",
		"createCustomAgent",
		"selectCredential",
		"openWorkflow",
		"reopenArtifact",
		"toggleDynamicCredentials"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const modelSelectorRef = useTemplateRef("modelSelectorRef");
		const i18n = useI18n();
		const chatStore = useChatStore();
		const isLoadingAgents = ref(false);
		const showOpenWorkflow = computed(() => {
			return __props.selectedModel?.model.provider === "n8n" && __props.selectedModel.metadata.scopes?.includes("workflow:read");
		});
		function onOpenWorkflow() {
			if (__props.selectedModel?.model.provider === "n8n") emit("openWorkflow", __props.selectedModel.model.workflowId);
		}
		function onModelChange(selection) {
			emit("selectModel", selection);
		}
		watch(() => __props.credentials, async (creds) => {
			if (creds) {
				isLoadingAgents.value = true;
				try {
					await chatStore.fetchAgents(creds);
				} finally {
					isLoadingAgents.value = false;
				}
			}
		}, { immediate: true });
		__expose({
			openModelSelector: () => modelSelectorRef.value?.open(),
			openCredentialSelector: (provider) => modelSelectorRef.value?.openCredentialSelector(provider)
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.component) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.grow) }, [__props.readyToShowModelSelector ? (openBlock(), createBlock(ModelSelector_default, {
				key: 0,
				ref_key: "modelSelectorRef",
				ref: modelSelectorRef,
				"selected-agent": __props.selectedModel,
				credentials: __props.credentials,
				"show-border": false,
				agents: unref(chatStore).agents,
				"is-loading": isLoadingAgents.value,
				onChange: onModelChange,
				onCreateCustomAgent: _cache[0] || (_cache[0] = ($event) => emit("createCustomAgent")),
				onSelectCredential: _cache[1] || (_cache[1] = (provider, credentialId) => emit("selectCredential", provider, credentialId))
			}, null, 8, [
				"selected-agent",
				"credentials",
				"agents",
				"is-loading"
			])) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.buttons) }, [
				__props.selectedModel?.model.provider === "custom-agent" ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					size: "small",
					icon: "settings",
					label: unref(i18n).baseText("chatHub.chat.header.button.editAgent"),
					onClick: _cache[2] || (_cache[2] = ($event) => emit("editCustomAgent", __props.selectedModel.model.agentId))
				}, null, 8, ["label"])) : createCommentVNode("", true),
				__props.showArtifactIcon ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 1,
					variant: "outline",
					size: "small",
					icon: "panel-right",
					onClick: _cache[3] || (_cache[3] = ($event) => emit("reopenArtifact"))
				})) : createCommentVNode("", true),
				__props.hasDynamicCredentials ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 2,
					variant: "outline",
					size: "small",
					icon: "key-round",
					title: unref(i18n).baseText("chatHub.chat.header.button.manageConnections"),
					"aria-label": unref(i18n).baseText("chatHub.chat.header.button.manageConnections"),
					"data-testid": "manage-dynamic-credentials-button",
					onClick: _cache[4] || (_cache[4] = ($event) => emit("toggleDynamicCredentials"))
				}, null, 8, ["title", "aria-label"])) : createCommentVNode("", true),
				showOpenWorkflow.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 3,
					variant: "outline",
					size: "small",
					icon: "settings",
					label: unref(i18n).baseText("chatHub.chat.header.button.openWorkflow"),
					onClick: onOpenWorkflow
				}, null, 8, ["label"])) : createCommentVNode("", true)
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	component: "_component_10qzg_1",
	menuButton: "_menuButton_10qzg_12",
	grow: "_grow_10qzg_16",
	title: "_title_10qzg_23",
	buttons: "_buttons_10qzg_27"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatStarter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var CHAT_USERS_DOCS_URL = "https://docs.n8n.io/advanced-ai/chat-hub/#chat-user-role";
var ChatStarter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatStarter",
	props: { showWelcomeScreen: { type: Boolean } },
	emits: ["startNewChat"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const uiStore = useUIStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const { goToUpgrade } = usePageRedirectionHelper();
		const isAdvancedPermissionsEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions]);
		const hasInvitePermission = computed(() => hasPermission(["rbac"], { rbac: { scope: "user:create" } }));
		const showInviteButton = computed(() => hasInvitePermission.value);
		const isInviteDisabled = computed(() => !isAdvancedPermissionsEnabled.value);
		function handleStartNewChat() {
			emit("startNewChat");
		}
		function handleInviteUsers() {
			uiStore.openModalWithData({
				name: INVITE_USER_MODAL_KEY,
				data: { initialRole: ROLE.ChatUser }
			});
		}
		function handleUpgradeClick() {
			goToUpgrade("chat-hub", "upgrade-advanced-permissions");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Transition, {
				name: "welcome-fade",
				mode: "out-in"
			}, {
				default: withCtx(() => [__props.showWelcomeScreen ? (openBlock(), createElementBlock("div", {
					key: "welcome",
					class: normalizeClass(_ctx.$style.welcomeContent)
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nHeading_default), {
						tag: "h2",
						bold: "",
						size: "xlarge"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.header")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "large",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.subtitle")), 1)]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardGrid) }, [
						createBaseVNode("div", {
							"data-test-id": "welcome-card-workflow-agents",
							class: normalizeClass([_ctx.$style.cardWrapper, _ctx.$style.cardFirst])
						}, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createVNode(unref(N8nIcon_default), {
								icon: "robot",
								size: "large",
								color: "text-dark"
							}), createVNode(unref(N8nText_default), { bold: "" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.card.workflowAgents.title")), 1)]),
								_: 1
							})], 2), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.card.workflowAgents.description")), 1)]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"])], 2),
						createBaseVNode("div", {
							class: normalizeClass([_ctx.$style.cardWrapper, _ctx.$style.cardMiddle]),
							"data-test-id": "welcome-card-personal-agents"
						}, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createVNode(unref(N8nIcon_default), {
								icon: "message-square",
								size: "large",
								color: "text-dark"
							}), createVNode(unref(N8nText_default), { bold: "" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.card.personalAgents.title")), 1)]),
								_: 1
							})], 2), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.card.personalAgents.description")), 1)]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"])], 2),
						createBaseVNode("div", {
							class: normalizeClass([_ctx.$style.cardWrapper, _ctx.$style.cardLast]),
							"data-test-id": "welcome-card-base-models"
						}, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.providerIcons) }, [
								createVNode(CredentialIcon_default, {
									"credential-type-name": "openAiApi",
									size: 20
								}),
								createVNode(CredentialIcon_default, {
									"credential-type-name": "anthropicApi",
									size: 20
								}),
								createVNode(CredentialIcon_default, {
									"credential-type-name": "googlePalmApi",
									size: 20
								})
							], 2), createVNode(unref(N8nText_default), { bold: "" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.card.baseModels.title")), 1)]),
								_: 1
							})], 2), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.card.baseModels.description")), 1)]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"])], 2)
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.buttonGroup) }, [createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "medium",
						icon: "plus",
						"data-test-id": "welcome-start-new-chat",
						onClick: handleStartNewChat
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.button.startNewChat")), 1)]),
						_: 1
					}), showInviteButton.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						disabled: !isInviteDisabled.value
					}, {
						content: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "chatHub.welcome.inviteUpgrade.tooltip",
							scope: "global"
						}, {
							link: withCtx(() => [createVNode(unref(N8nLink_default), {
								size: "small",
								onClick: handleUpgradeClick
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
								_: 1
							})]),
							docsLink: withCtx(() => [createVNode(unref(N8nLink_default), {
								size: "small",
								href: CHAT_USERS_DOCS_URL,
								target: "_blank",
								rel: "noopener"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.inviteUpgrade.here")), 1)]),
								_: 1
							})]),
							_: 1
						})]),
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "medium",
							icon: "users",
							disabled: isInviteDisabled.value,
							"data-test-id": "welcome-invite-chat-users",
							onClick: handleInviteUsers
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.welcome.button.inviteChatUsers")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					}, 8, ["disabled"])) : createCommentVNode("", true)], 2)
				], 2)) : createCommentVNode("", true)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1yh1n_113",
	cardGrid: "_cardGrid_1yh1n_121",
	cardWrapper: "_cardWrapper_1yh1n_131",
	card: "_card_1yh1n_121",
	cardFirst: "_cardFirst_1yh1n_154",
	cardMiddle: "_cardMiddle_1yh1n_163",
	cardLast: "_cardLast_1yh1n_167",
	cardHeader: "_cardHeader_1yh1n_176",
	providerIcons: "_providerIcons_1yh1n_184",
	buttonGroup: "_buttonGroup_1yh1n_189",
	welcomeContent: "_welcomeContent_1yh1n_195"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatArtifactViewer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["srcdoc", "title"];
var ChatArtifactViewer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatArtifactViewer",
	props: {
		artifacts: {},
		selectedIndex: {}
	},
	emits: [
		"close",
		"selectArtifact",
		"download"
	],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const props = __props;
		const emit = __emit;
		const selectedArtifact = computed(() => props.artifacts[props.selectedIndex] ?? props.artifacts[0]);
		const downloadTooltip = computed(() => i18n.baseText("chatHub.artifact.download", { interpolate: { fileType: selectedArtifact.value?.type.toUpperCase() ?? "" } }));
		const options = computed(() => props.artifacts.map((artifact, index) => ({
			value: index,
			label: artifact.title
		})));
		function onSelectArtifact(value) {
			if (typeof value === "number") emit("selectArtifact", value);
		}
		const isHtml = computed(() => selectedArtifact.value?.type === "html");
		const isMarkdown = computed(() => selectedArtifact.value?.type === "md");
		const markdownContent = computed(() => ({
			type: "text",
			content: isMarkdown.value ? selectedArtifact.value?.content : `\`\`\`${selectedArtifact.value?.type}\n${selectedArtifact.value?.content}\n\`\`\``
		}));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.viewer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [(openBlock(), createBlock(unref(Select_default), {
				key: selectedArtifact.value?.title ?? "",
				"model-value": __props.selectedIndex,
				size: "medium",
				variant: "ghost",
				items: options.value,
				class: normalizeClass(_ctx.$style.title),
				"onUpdate:modelValue": onSelectArtifact
			}, null, 8, [
				"model-value",
				"items",
				"class"
			])), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [createVNode(unref(N8nTooltip_default), {
				content: downloadTooltip.value,
				placement: "bottom"
			}, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "ghost",
					text: "",
					icon: "arrow-circle-down",
					"aria-label": downloadTooltip.value,
					onClick: _cache[0] || (_cache[0] = ($event) => emit("download"))
				}, null, 8, ["aria-label"])]),
				_: 1
			}, 8, ["content"]), createVNode(unref(N8nIconButton_default), {
				variant: "ghost",
				text: "",
				icon: "x",
				onClick: _cache[1] || (_cache[1] = ($event) => emit("close"))
			})], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [isHtml.value ? (openBlock(), createElementBlock("iframe", {
				key: 0,
				srcdoc: selectedArtifact.value?.content,
				class: normalizeClass(_ctx.$style.iframe),
				sandbox: "",
				title: selectedArtifact.value?.title
			}, null, 10, _hoisted_1)) : markdownContent.value ? (openBlock(), createBlock(ChatMarkdownChunk_default, {
				key: 1,
				ref: "markdownChunk",
				class: normalizeClass(isMarkdown.value ? _ctx.$style.markdown : ""),
				"single-pre": !isMarkdown.value,
				source: markdownContent.value,
				"footnote-style": "normal"
			}, null, 8, [
				"class",
				"single-pre",
				"source"
			])) : createCommentVNode("", true)], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_98c8s_1",
	viewer: "_viewer_98c8s_11",
	header: "_header_98c8s_18",
	markdown: "_markdown_98c8s_32",
	title: "_title_98c8s_36",
	headerActions: "_headerActions_98c8s_45",
	type: "_type_98c8s_52",
	content: "_content_98c8s_57",
	iframe: "_iframe_98c8s_65"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/DynamicCredentialsDrawer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DynamicCredentialsDrawer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DynamicCredentialsDrawer",
	props: {
		credentials: {},
		connectedCount: {},
		totalCount: {}
	},
	emits: [
		"close",
		"authorize",
		"revoke"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.panel) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					bold: "",
					size: "large"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nIconButton_default), {
					type: "tertiary",
					text: "",
					icon: "x",
					"data-testid": "dynamic-credentials-drawer-close",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.subtitle) }, [createVNode(unref(N8nText_default), { bold: "" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.subtitle")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.description")), 1)]),
					_: 1
				})], 2), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.credentialList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.credentials, (cred) => {
					return openBlock(), createElementBlock("li", {
						key: cred.credentialId,
						class: normalizeClass(_ctx.$style.credentialRow),
						"data-testid": "dynamic-credential-row"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialInfo) }, [
						createVNode(unref(N8nText_default), { bold: "" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(cred.credentialName), 1)]),
							_: 2
						}, 1024),
						cred.credentialStatus === "configured" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.status.connected")), 1)]),
							_: 1
						})) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.status.notConnected")), 1)]),
							_: 1
						})),
						cred.error ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 2,
							size: "small",
							color: "danger"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(cred.error), 1)]),
							_: 2
						}, 1024)) : createCommentVNode("", true)
					], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialAction) }, [cred.isConnecting ? (openBlock(), createBlock(unref(N8nSpinner_default), {
						key: 0,
						size: "small"
					})) : cred.credentialStatus === "configured" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						size: "small",
						"data-testid": "dynamic-credential-disconnect",
						onClick: ($event) => emit("revoke", cred.credentialId)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.disconnect")), 1)]),
						_: 1
					}, 8, ["onClick"])) : (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						size: "small",
						"data-testid": "dynamic-credential-connect",
						onClick: ($event) => emit("authorize", cred.credentialId)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.connect")), 1)]),
						_: 1
					}, 8, ["onClick"]))], 2)], 2);
				}), 128))], 2)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.dynamicCredentials.drawer.footer", { interpolate: {
						connected: String(__props.connectedCount),
						total: String(__props.totalCount)
					} })), 1)]),
					_: 1
				})], 2)
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_17sfl_1",
	panel: "_panel_17sfl_11",
	header: "_header_17sfl_18",
	body: "_body_17sfl_29",
	subtitle: "_subtitle_17sfl_35",
	credentialList: "_credentialList_17sfl_42",
	credentialRow: "_credentialRow_17sfl_51",
	credentialInfo: "_credentialInfo_17sfl_61",
	credentialAction: "_credentialAction_17sfl_69",
	footer: "_footer_17sfl_75"
} }]]);
//#endregion
//#region src/features/ai/chatHub/composables/useChatArtifacts.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useChatArtifacts(container, chatMessages) {
	const isViewerCollapsed = ref(false);
	const selectedIndex = ref(0);
	const allArtifacts = computed(() => collectChatArtifacts(chatMessages.value.flatMap((message) => message.content)));
	const selectedArtifact = computed(() => {
		const artifacts = allArtifacts.value;
		if (artifacts.length === 0) return null;
		return artifacts[Math.min(selectedIndex.value, artifacts.length - 1)];
	});
	const isViewerVisible = computed(() => allArtifacts.value.length > 0 && !isViewerCollapsed.value);
	const panelResizer = useResizablePanel({
		container,
		width: {
			localStorageKey: "N8N_CHAT_ARTIFACT_VIEWER_WIDTH",
			defaultSize: function getDefaultWidth(size) {
				return size * .6;
			},
			minSize: 300,
			maxSize: function getMaxWidth(size) {
				return size - 300;
			},
			allowFullSize: true,
			snap: true
		}
	});
	watch(allArtifacts, (newArtifacts, oldArtifacts) => {
		if (newArtifacts.length > 0 && newArtifacts.length !== oldArtifacts?.length) {
			isViewerCollapsed.value = false;
			selectedIndex.value = newArtifacts.length - 1;
		}
	});
	function handleViewerResizeEnd() {
		if (panelResizer.isFullSize.value) isViewerCollapsed.value = true;
	}
	function handleCloseViewer() {
		isViewerCollapsed.value = true;
	}
	function handleSelect(index) {
		selectedIndex.value = index;
	}
	function handleOpenViewer(title) {
		if (title) selectedIndex.value = allArtifacts.value.findIndex((d) => d.title === title);
		isViewerCollapsed.value = false;
	}
	function handleDownload() {
		const artifact = selectedArtifact.value;
		if (!artifact) return;
		const blob = new Blob([artifact.content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${artifact.title}.${artifact.type}`;
		a.click();
		URL.revokeObjectURL(url);
	}
	return {
		selectedIndex,
		allArtifacts,
		isViewerVisible,
		isViewerCollapsed,
		viewerSize: panelResizer.width,
		isViewerResizing: panelResizer.isResizing,
		handleOpenViewer,
		panelResizer,
		handleViewerResizeEnd,
		handleCloseViewer,
		handleDownload,
		handleSelect
	};
}
//#endregion
//#region src/features/ai/chatHub/composables/useChatInputFocus.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useChatInputFocus(inputRef, options) {
	const uiStore = useUIStore();
	const activeElement = useActiveElement();
	const isDisabled = computed(() => toValue(options?.disabled) ?? false);
	const shouldIgnoreKeypress = computed(() => {
		if (isDisabled.value) return true;
		if (uiStore.isAnyModalOpen) return true;
		if (activeElement.value && shouldIgnoreCanvasShortcut(activeElement.value)) return true;
		return false;
	});
	const RESERVED_SHORTCUT_KEYS = ["["];
	const isPrintableKey = (event) => {
		return event.key.length === 1;
	};
	const isReservedShortcut = (event) => {
		return RESERVED_SHORTCUT_KEYS.includes(event.key);
	};
	const hasModifierKey = (event) => {
		return event.ctrlKey || event.metaKey || event.altKey;
	};
	const onKeyDown = (event) => {
		if (shouldIgnoreKeypress.value) return;
		if (event.isComposing) return;
		if (event.repeat) return;
		if (hasModifierKey(event)) return;
		if (!isPrintableKey(event)) return;
		if (isReservedShortcut(event)) return;
		const input = inputRef.value;
		if (!input) return;
		event.preventDefault();
		input.appendText(event.key);
		input.focus();
	};
	useEventListener(document, "keydown", onKeyDown);
}
//#endregion
//#region src/features/ai/chatHub/composables/useDynamicCredentialsStatus.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function parseResolverId(authorizationUrl) {
	if (!authorizationUrl) return "";
	try {
		return new URL(authorizationUrl).searchParams.get("resolverId") ?? "";
	} catch {
		return "";
	}
}
function useDynamicCredentialsStatus(workflowId) {
	const rootStore = useRootStore();
	const credentials = ref([]);
	const isLoading = ref(false);
	const hasDynamicCredentials = computed(() => credentials.value.length > 0);
	const allAuthenticated = computed(() => hasDynamicCredentials.value && credentials.value.every((c) => c.credentialStatus === "configured"));
	const connectedCount = computed(() => credentials.value.filter((c) => c.credentialStatus === "configured").length);
	const totalCount = computed(() => credentials.value.length);
	async function fetchStatus() {
		const id = workflowId.value;
		if (!id) {
			credentials.value = [];
			return;
		}
		isLoading.value = true;
		try {
			const status = await fetchWorkflowExecutionStatus(rootStore.restApiContext, id);
			const connecting = new Set(credentials.value.filter((c) => c.isConnecting).map((c) => c.credentialId));
			credentials.value = (status.credentials ?? []).map((c) => ({
				credentialId: c.credentialId,
				credentialName: c.credentialName,
				credentialType: c.credentialType,
				credentialStatus: c.credentialStatus,
				resolverId: parseResolverId(c.authorizationUrl),
				isConnecting: connecting.has(c.credentialId),
				error: null
			}));
		} catch {
			credentials.value = [];
		} finally {
			isLoading.value = false;
		}
	}
	function updateCredentialState(credentialId, update) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (cred) Object.assign(cred, update);
	}
	async function pollUntilConfigured(credentialId, maxAttempts = 10, intervalMs = 1e3) {
		for (let i = 0; i < maxAttempts; i++) {
			await fetchStatus();
			if (credentials.value.find((c) => c.credentialId === credentialId)?.credentialStatus === "configured") return;
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}
	async function authorize(credentialId) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (!cred || cred.isConnecting) return;
		updateCredentialState(credentialId, {
			isConnecting: true,
			error: null
		});
		let oauthPopup = null;
		try {
			oauthPopup = openOAuthPopup();
			if (!oauthPopup) {
				updateCredentialState(credentialId, {
					error: "Failed to start authorization",
					isConnecting: false
				});
				return;
			}
			const oauthUrl = await authorizeDynamicCredential(rootStore.restApiContext, credentialId, cred.resolverId);
			const allowedProtocols = ["http:", "https:"];
			try {
				const parsedUrl = new URL(oauthUrl);
				if (!allowedProtocols.includes(parsedUrl.protocol)) {
					updateCredentialState(credentialId, {
						error: "Invalid authorization URL",
						isConnecting: false
					});
					return;
				}
			} catch {
				updateCredentialState(credentialId, {
					error: "Invalid authorization URL",
					isConnecting: false
				});
				return;
			}
			oauthPopup.location.href = oauthUrl;
			const outcome = await waitForOAuthCallback({
				popup: oauthPopup,
				trustedOrigins: getTrustedOAuthOrigins(rootStore.urlBaseEditor),
				verifyConnected: async () => {
					await fetchStatus();
					return credentials.value.find((c) => c.credentialId === credentialId)?.credentialStatus === "configured";
				}
			});
			oauthPopup.close();
			oauthPopup = null;
			if (outcome === "success") await pollUntilConfigured(credentialId);
			else await fetchStatus();
			updateCredentialState(credentialId, { isConnecting: false });
		} catch {
			updateCredentialState(credentialId, {
				error: "Failed to start authorization",
				isConnecting: false
			});
		} finally {
			oauthPopup?.close();
		}
	}
	async function revoke(credentialId) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (!cred || cred.isConnecting) return;
		updateCredentialState(credentialId, {
			isConnecting: true,
			error: null
		});
		try {
			await revokeDynamicCredential(rootStore.restApiContext, credentialId, cred.resolverId);
			await fetchStatus();
		} catch {
			updateCredentialState(credentialId, { error: "Failed to disconnect credential" });
		} finally {
			updateCredentialState(credentialId, { isConnecting: false });
		}
	}
	watch(workflowId, (newId) => {
		if (newId) fetchStatus();
		else credentials.value = [];
	}, { immediate: true });
	return {
		credentials,
		hasDynamicCredentials,
		allAuthenticated,
		connectedCount,
		totalCount,
		isLoading,
		fetchStatus,
		authorize,
		revoke
	};
}
//#endregion
//#region src/features/ai/chatHub/ChatView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatView",
	setup(__props) {
		const router = useRouter();
		const route = useRoute();
		const usersStore = useUsersStore();
		const chatStore = useChatStore();
		const settingsStore = useSettingsStore();
		const toast = useToast();
		const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
		const documentTitle = useDocumentTitle();
		const uiStore = useUIStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		onBeforeMount(async () => {
			await chatStore.fetchConfiguredTools();
		});
		const headerRef = useTemplateRef("headerRef");
		const inputRef = useTemplateRef("inputRef");
		const scrollableRef = useTemplateRef("scrollable");
		const chatLayoutRef = useTemplateRef("chatLayout");
		const chatLayoutElement = computed(() => chatLayoutRef.value?.$el);
		const welcomeScreenDismissed = ref(false);
		const showCreditsClaimedCallout = ref(false);
		const hasAttemptedAutoClaim = ref(false);
		const { userCanClaimOpenAiCredits, aiCreditsQuota, claimCredits } = useFreeAiCredits();
		const sessionId = computed(() => typeof route.params.id === "string" ? route.params.id : v4());
		const isNewSessionOverride = computed(() => sessionId.value !== route.params.id);
		const shouldSkipNextScrollTrigger = ref(false);
		const currentConversation = computed(() => sessionId.value ? chatStore.sessions.byId[sessionId.value] : void 0);
		const currentConversationTitle = computed(() => currentConversation.value?.title);
		const canSelectTools = computed(() => !!selectedModel.value?.metadata.capabilities.functionCalling);
		const hadConversationBefore = useLocalStorage(LOCAL_STORAGE_CHAT_HUB_HAD_CONVERSATION_BEFORE(usersStore.currentUserId ?? "anonymous"), false);
		const hasSession = computed(() => (chatStore.sessions.ids?.length ?? 0) > 0);
		const showWelcomeScreen = computed(() => {
			if (hadConversationBefore.value || welcomeScreenDismissed.value) return false;
			if (route.query.workflowId || route.query.agentId) return false;
			if (!chatStore.sessionsReady) return;
			return !hasSession.value && (!settingsStore.isChatFeatureEnabled || !hasRole(["global:chatUser"]));
		});
		const defaultModel = useLocalStorage(LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL(usersStore.currentUserId ?? "anonymous"), null, {
			writeDefaults: false,
			shallow: true,
			serializer: {
				read: (value) => {
					try {
						return chatHubConversationModelWithCachedDisplayNameSchema.parse(JSON.parse(value));
					} catch (error) {
						return null;
					}
				},
				write: (value) => JSON.stringify(value)
			}
		});
		const defaultAgent = computed(() => defaultModel.value ? chatStore.getAgent(defaultModel.value) : void 0);
		const modelFromQuery = computed(() => {
			const agentId = route.query.agentId;
			const workflowId = route.query.workflowId;
			const provider = route.query.provider;
			const model = route.query.model;
			if (!isNewSessionOverride.value) return null;
			if (typeof agentId === "string") return chatStore.getAgent({
				provider: "custom-agent",
				agentId
			});
			if (typeof workflowId === "string") return chatStore.getAgent({
				provider: "n8n",
				workflowId
			});
			if (typeof provider === "string" && typeof model === "string") {
				const parsedModel = chatHubConversationModelSchema.safeParse({
					provider,
					model
				});
				if (parsedModel.success) return chatStore.getAgent(parsedModel.data);
			}
			return null;
		});
		const selectedModel = computed(() => {
			if (!isNewSessionOverride.value) {
				const model = currentConversation.value ? unflattenModel(currentConversation.value) : null;
				if (!model) return null;
				return chatStore.getAgent(model, {
					name: currentConversation.value?.agentName || currentConversation.value?.model,
					icon: currentConversation.value?.agentIcon
				});
			}
			if (modelFromQuery.value) return modelFromQuery.value;
			if (chatStore.streaming?.sessionId === sessionId.value) return chatStore.streaming.agent;
			if (!defaultModel.value) return null;
			return chatStore.getAgent(defaultModel.value, {
				name: defaultModel.value.cachedDisplayName,
				icon: defaultModel.value.cachedIcon
			});
		});
		const isAgentModel = computed(() => !!selectedModel.value && !isLlmProvider(selectedModel.value.model.provider));
		const customAgentId = computed(() => selectedModel.value?.model.provider === "custom-agent" ? selectedModel.value.model.agentId : void 0);
		const { customAgent } = useCustomAgent(customAgentId);
		const checkedToolIds = computed(() => {
			if (customAgent.value) return customAgent.value.toolIds;
			if (currentConversation.value?.toolIds) return currentConversation.value.toolIds;
			return modelFromQuery.value ? [] : chatStore.configuredTools.filter((t) => t.enabled).map((t) => t.definition.id);
		});
		const { credentialsByProvider, selectCredential } = useChatCredentials(usersStore.currentUserId ?? "anonymous");
		const { isEnabled: privateCredentialsEnabled } = usePrivateCredentials();
		const dynamicCreds = useDynamicCredentialsStatus(computed(() => selectedModel.value?.model.provider === "n8n" && privateCredentialsEnabled.value ? selectedModel.value.model.workflowId : null));
		const isDynamicCredentialsDrawerOpen = ref(false);
		const showDynamicCredentialsMissingCallout = computed(() => messagingState.value === "missingDynamicCredentials");
		watch(() => dynamicCreds.allAuthenticated.value, (allConnected) => {
			if (allConnected && isDynamicCredentialsDrawerOpen.value) isDynamicCredentialsDrawerOpen.value = false;
		});
		const credentialsForSelectedProvider = computed(() => {
			const provider = selectedModel.value?.model.provider;
			if (!provider) return null;
			if (!isLlmProvider(provider)) return {};
			const credentialsId = credentialsByProvider.value?.[provider];
			if (!credentialsId) return null;
			return { [PROVIDER_CREDENTIAL_TYPE_MAP[provider]]: {
				id: credentialsId,
				name: ""
			} };
		});
		const isMissingSelectedCredential = computed(() => !credentialsForSelectedProvider.value);
		const { chatMessages, isResponding, isNewSession, messagingState, scrollContainerRef, arrivedState, scrollToBottom, loadSession } = useChatSession({
			sessionId,
			scrollableRef,
			isNewSession: isNewSessionOverride,
			extendMessagingState: () => {
				if (chatStore.agentsReady && !selectedModel.value) return "missingAgent";
				if (chatStore.agentsReady && isMissingSelectedCredential.value) return "missingCredentials";
				if (dynamicCreds.hasDynamicCredentials.value && !dynamicCreds.allAuthenticated.value) return "missingDynamicCredentials";
				return null;
			},
			shouldSkipScroll: () => {
				if (shouldSkipNextScrollTrigger.value) {
					shouldSkipNextScrollTrigger.value = false;
					return true;
				}
				return false;
			}
		});
		const scrollContainerSize = useElementSize(scrollContainerRef);
		const artifacts = useChatArtifacts(chatLayoutElement, chatMessages);
		const isMainPanelNarrow = computed(() => scrollContainerSize.width.value < 600);
		const editingMessageId = ref();
		const messageElementsRef = useTemplateRef("messages");
		const didSubmitInCurrentSession = ref(false);
		const canAcceptFiles = computed(() => {
			if (!((selectedModel.value?.metadata.allowFileUploads ?? false) && !isMissingSelectedCredential.value)) return false;
			if (editingMessageId.value) return chatMessages.value.find((msg) => msg.id === editingMessageId.value)?.type === "human";
			return true;
		});
		const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);
		useChatInputFocus(inputRef, { disabled: computed(() => showWelcomeScreen.value === true || messagingState.value !== "idle") });
		watch(() => chatStore.agents, (models) => {
			const settings = settingsStore.moduleSettings?.["chat-hub"];
			if (!models || !!selectedModel.value || !isNewSession.value || !settings) return;
			const model = findOneFromModelsResponse(models, settings.providers);
			if (model) handleSelectAgent(model);
		}, { immediate: true });
		watch([sessionId, isNewSession], async ([id, isNew]) => {
			didSubmitInCurrentSession.value = false;
			editingMessageId.value = void 0;
			if (!isNew) try {
				await loadSession(id);
			} catch (error) {
				toast.showError(error, i18n.baseText("chatHub.error.fetchConversationFailed"));
				await router.push({ name: CHAT_VIEW });
			}
		}, { immediate: true });
		watch([inputRef, sessionId], ([input]) => {
			input?.focus();
		}, { immediate: true });
		watch(currentConversationTitle, (title) => {
			documentTitle.set(title ?? "Chat");
		}, { immediate: true });
		watch(credentialsByProvider, (credentials) => {
			if (credentials) chatStore.fetchAgents(credentials);
		}, { immediate: true });
		watch(defaultAgent, (agent, prevAgent) => {
			if (defaultModel.value && agent?.name && agent.name !== prevAgent?.name) defaultModel.value = {
				...defaultModel.value,
				cachedDisplayName: agent.name
			};
			if (defaultModel.value && agent?.icon && (agent.icon.type !== prevAgent?.icon?.type || agent.icon.value !== prevAgent.icon.value)) defaultModel.value = {
				...defaultModel.value,
				cachedIcon: agent.icon
			};
		}, { immediate: true });
		watch([
			welcomeScreenDismissed,
			userCanClaimOpenAiCredits,
			messagingState,
			() => chatStore.agentsReady
		], async ([dismissed, canClaim, state, ready]) => {
			if (!canClaim || hasAttemptedAutoClaim.value) return;
			if (dismissed || ready && state === "missingCredentials") {
				hasAttemptedAutoClaim.value = true;
				if (await claimCredits("chatHubAutoClaim")) showCreditsClaimedCallout.value = true;
			}
		}, { immediate: true });
		watch(chatMessages, (messages) => {
			if (messages.length > 0) showCreditsClaimedCallout.value = false;
		});
		watch(hasSession, (value) => {
			hadConversationBefore.value = hadConversationBefore.value || value;
		}, { immediate: true });
		function handleDismissCreditsCallout() {
			showCreditsClaimedCallout.value = false;
		}
		async function onSubmit(message, attachments) {
			if (!message.trim() || isResponding.value || !selectedModel.value || !credentialsForSelectedProvider.value || dynamicCreds.hasDynamicCredentials.value && !dynamicCreds.allAuthenticated.value) return;
			didSubmitInCurrentSession.value = true;
			editingMessageId.value = void 0;
			await chatStore.sendMessage(sessionId.value, message, selectedModel.value, credentialsForSelectedProvider.value, attachments);
			inputRef.value?.reset();
			if (isNewSession.value) router.push({
				name: CHAT_CONVERSATION_VIEW,
				params: { id: sessionId.value }
			});
		}
		async function onStop() {
			await chatStore.stopStreamingMessage(sessionId.value);
		}
		function handleStartEditMessage(messageId) {
			editingMessageId.value = messageId;
		}
		function handleCancelEditMessage() {
			editingMessageId.value = void 0;
		}
		async function handleEditMessage(content, keptAttachmentIndices, newFiles) {
			if (!editingMessageId.value || isResponding.value || !selectedModel.value || !credentialsForSelectedProvider.value || dynamicCreds.hasDynamicCredentials.value && !dynamicCreds.allAuthenticated.value) return;
			await chatStore.editMessage(sessionId.value, editingMessageId.value, content, selectedModel.value, credentialsForSelectedProvider.value, keptAttachmentIndices, newFiles);
			editingMessageId.value = void 0;
		}
		async function handleRegenerateMessage(message) {
			if (isResponding.value || message.type !== "ai" || !selectedModel.value || !credentialsForSelectedProvider.value || dynamicCreds.hasDynamicCredentials.value && !dynamicCreds.allAuthenticated.value) return;
			const messageToRetry = message.id;
			editingMessageId.value = void 0;
			await chatStore.regenerateMessage(sessionId.value, messageToRetry, selectedModel.value, credentialsForSelectedProvider.value);
		}
		async function handleSelectModel(selection, selectedAgent) {
			const agent = selectedAgent ?? chatStore.getAgent(selection);
			if (currentConversation.value) try {
				await chatStore.updateSessionModel(sessionId.value, selection, agent.name);
			} catch (error) {
				toast.showError(error, i18n.baseText("chatHub.error.updateModelFailed"));
			}
			else {
				defaultModel.value = {
					...selection,
					cachedDisplayName: agent.name,
					cachedIcon: agent.icon ?? void 0
				};
				await router.push({
					name: CHAT_VIEW,
					force: true
				});
			}
		}
		async function handleSelectAgent(selection) {
			await handleSelectModel(selection.model, selection);
		}
		function handleSwitchAlternative(messageId) {
			shouldSkipNextScrollTrigger.value = true;
			chatStore.switchAlternative(sessionId.value, messageId);
		}
		function handleConfigureCredentials(provider) {
			headerRef.value?.openCredentialSelector(provider);
		}
		function handleConfigureModel() {
			headerRef.value?.openModelSelector();
		}
		function handleEditAgent(agentId) {
			uiStore.openModalWithData({
				name: AGENT_EDITOR_MODAL_KEY,
				data: {
					agentId,
					credentials: credentialsByProvider,
					onCreateCustomAgent: handleSelectAgent
				}
			});
		}
		function openNewAgentCreator() {
			uiStore.openModalWithData({
				name: AGENT_EDITOR_MODAL_KEY,
				data: {
					credentials: credentialsByProvider,
					onCreateCustomAgent: handleSelectAgent
				}
			});
		}
		function handleOpenWorkflow(workflowId) {
			const routeData = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId }
			});
			window.open(routeData.href, "_blank");
		}
		function handleSelectPrompt(prompt) {
			if (selectedModel.value) telemetry.track("User clicked chat hub suggested prompt", {
				...flattenModel(selectedModel.value.model),
				source: "chat_hub"
			});
			inputRef.value?.setText(prompt);
			inputRef.value?.focus();
		}
		function onFilesDropped(files) {
			if (!editingMessageId.value) {
				inputRef.value?.addAttachments(files);
				return;
			}
			const index = chatMessages.value.findIndex((message) => message.id === editingMessageId.value);
			messageElementsRef.value?.[index]?.addFiles(files);
		}
		return (_ctx, _cache) => {
			return showWelcomeScreen.value !== void 0 ? (openBlock(), createBlock(ChatLayout_default, {
				key: 0,
				ref: "chatLayout",
				class: normalizeClass({
					[_ctx.$style.chatLayout]: true,
					[_ctx.$style.isNewSession]: unref(isNewSession),
					[_ctx.$style.isAgentNewSession]: unref(isNewSession) && isAgentModel.value,
					[_ctx.$style.isExistingSession]: !unref(isNewSession),
					[_ctx.$style.isMobileDevice]: unref(isMobileDevice),
					[_ctx.$style.isDraggingFile]: unref(fileDrop).isDragging.value,
					[_ctx.$style.hasArtifact]: unref(artifacts).isViewerVisible.value,
					[_ctx.$style.isMainPanelNarrow]: isMainPanelNarrow.value,
					[_ctx.$style.isResizing]: unref(artifacts).isViewerResizing.value
				}),
				onDragenter: unref(fileDrop).handleDragEnter,
				onDragleave: unref(fileDrop).handleDragLeave,
				onDragover: unref(fileDrop).handleDragOver,
				onDrop: unref(fileDrop).handleDrop,
				onPaste: unref(fileDrop).handlePaste
			}, {
				default: withCtx(() => [
					unref(fileDrop).isDragging.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.dropOverlay)
					}, [createVNode(unref(N8nText_default), {
						size: "large",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.chat.dropOverlay")), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true),
					createVNode(unref(N8nResizeWrapper_default), {
						class: normalizeClass(_ctx.$style.mainContentResizer),
						resizer: unref(artifacts).panelResizer,
						style: normalizeStyle({ width: unref(artifacts).isViewerVisible.value ? `${unref(artifacts).viewerSize.value}px` : isDynamicCredentialsDrawerOpen.value ? "calc(100% - 340px)" : "100%" }),
						"supported-directions": ["right"],
						"is-resizing-enabled": true,
						onResizeend: unref(artifacts).handleViewerResizeEnd
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.mainContent) }, [
							!showWelcomeScreen.value ? (openBlock(), createBlock(ChatConversationHeader_default, {
								key: 0,
								ref_key: "headerRef",
								ref: headerRef,
								"selected-model": selectedModel.value,
								credentials: unref(credentialsByProvider),
								"ready-to-show-model-selector": unref(isNewSession) || !!currentConversation.value,
								"show-artifact-icon": unref(artifacts).allArtifacts.value.length > 0 && unref(artifacts).isViewerCollapsed.value,
								"has-dynamic-credentials": unref(dynamicCreds).hasDynamicCredentials.value,
								onSelectModel: handleSelectModel,
								onEditCustomAgent: handleEditAgent,
								onCreateCustomAgent: openNewAgentCreator,
								onSelectCredential: unref(selectCredential),
								onOpenWorkflow: handleOpenWorkflow,
								onReopenArtifact: unref(artifacts).handleOpenViewer,
								onToggleDynamicCredentials: _cache[0] || (_cache[0] = ($event) => isDynamicCredentialsDrawerOpen.value = !isDynamicCredentialsDrawerOpen.value)
							}, null, 8, [
								"selected-model",
								"credentials",
								"ready-to-show-model-selector",
								"show-artifact-icon",
								"has-dynamic-credentials",
								"onSelectCredential",
								"onReopenArtifact"
							])) : createCommentVNode("", true),
							createVNode(unref(N8nScrollArea_default), {
								type: "scroll",
								"enable-vertical-scroll": true,
								"enable-horizontal-scroll": false,
								"as-child": "",
								class: normalizeClass(_ctx.$style.scrollArea)
							}, {
								default: withCtx(() => [createBaseVNode("div", {
									ref: "scrollable",
									class: normalizeClass(_ctx.$style.scrollable)
								}, [unref(isNewSession) ? (openBlock(), createBlock(ChatGreetings_default, {
									key: 0,
									class: normalizeClass({ [_ctx.$style.greetingsCentered]: !isAgentModel.value }),
									"selected-agent": selectedModel.value,
									loading: !unref(chatStore).agentsReady,
									onSelectPrompt: handleSelectPrompt
								}, null, 8, [
									"class",
									"selected-agent",
									"loading"
								])) : (openBlock(), createElementBlock("div", {
									key: 1,
									role: "log",
									"aria-live": "polite",
									class: normalizeClass(_ctx.$style.messageList)
								}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(chatMessages), (message, index) => {
									return openBlock(), createBlock(ChatMessage_default, {
										key: message.id,
										ref_for: true,
										ref: "messages",
										message,
										compact: isMainPanelNarrow.value,
										"is-editing": editingMessageId.value === message.id,
										"is-edit-submitting": unref(chatStore).streaming?.revisionOfMessageId === message.id,
										"has-session-streaming": unref(isResponding),
										"cached-agent-display-name": selectedModel.value?.name ?? null,
										"cached-agent-icon": selectedModel.value?.icon ?? null,
										"accepted-mime-types": selectedModel.value?.metadata.allowedFilesMimeTypes ?? "",
										"min-height": didSubmitInCurrentSession.value && message.type === "ai" && index === unref(chatMessages).length - 1 && unref(scrollContainerRef) ? unref(scrollContainerRef).offsetHeight - 30 - 200 : void 0,
										onStartEdit: ($event) => handleStartEditMessage(message.id),
										onCancelEdit: handleCancelEditMessage,
										onRegenerate: handleRegenerateMessage,
										onUpdate: handleEditMessage,
										onSwitchAlternative: handleSwitchAlternative,
										onOpenArtifact: unref(artifacts).handleOpenViewer
									}, null, 8, [
										"message",
										"compact",
										"is-editing",
										"is-edit-submitting",
										"has-session-streaming",
										"cached-agent-display-name",
										"cached-agent-icon",
										"accepted-mime-types",
										"min-height",
										"onStartEdit",
										"onOpenArtifact"
									]);
								}), 128))], 2)), !showWelcomeScreen.value ? (openBlock(), createElementBlock("div", {
									key: 2,
									class: normalizeClass(_ctx.$style.promptContainer)
								}, [!unref(arrivedState).bottom && !unref(isNewSession) ? (openBlock(), createBlock(unref(N8nIconButton_default), {
									key: 0,
									variant: "outline",
									icon: "arrow-down",
									class: normalizeClass(_ctx.$style.scrollToBottomButton),
									title: unref(i18n).baseText("chatHub.chat.scrollToBottom"),
									onClick: _cache[1] || (_cache[1] = ($event) => unref(scrollToBottom)(true))
								}, null, 8, ["class", "title"])) : createCommentVNode("", true), createVNode(ChatPrompt_default, {
									ref_key: "inputRef",
									ref: inputRef,
									"selected-model": selectedModel.value,
									"checked-tool-ids": canSelectTools.value ? checkedToolIds.value : [],
									"session-id": unref(isNewSession) ? void 0 : sessionId.value,
									"custom-agent-id": customAgentId.value,
									"messaging-state": unref(messagingState),
									"is-tools-selectable": canSelectTools.value,
									"is-new-session": unref(isNewSession),
									"show-credits-claimed-callout": showCreditsClaimedCallout.value,
									"show-dynamic-credentials-missing-callout": showDynamicCredentialsMissingCallout.value,
									"ai-credits-quota": String(unref(aiCreditsQuota)),
									onSubmit,
									onStop,
									onSelectModel: handleConfigureModel,
									onSetCredentials: handleConfigureCredentials,
									onEditAgent: handleEditAgent,
									onDismissCreditsCallout: handleDismissCreditsCallout,
									onOpenDynamicCredentials: _cache[2] || (_cache[2] = ($event) => isDynamicCredentialsDrawerOpen.value = true)
								}, null, 8, [
									"selected-model",
									"checked-tool-ids",
									"session-id",
									"custom-agent-id",
									"messaging-state",
									"is-tools-selectable",
									"is-new-session",
									"show-credits-claimed-callout",
									"show-dynamic-credentials-missing-callout",
									"ai-credits-quota"
								])], 2)) : createCommentVNode("", true)], 2)]),
								_: 1
							}, 8, ["class"]),
							unref(isNewSession) ? (openBlock(), createBlock(ChatStarter_default, {
								key: 1,
								"show-welcome-screen": showWelcomeScreen.value,
								onStartNewChat: _cache[3] || (_cache[3] = ($event) => {
									welcomeScreenDismissed.value = true;
									inputRef.value?.focus();
								})
							}, null, 8, ["show-welcome-screen"])) : createCommentVNode("", true)
						], 2)]),
						_: 1
					}, 8, [
						"class",
						"resizer",
						"style",
						"onResizeend"
					]),
					isDynamicCredentialsDrawerOpen.value && unref(dynamicCreds).hasDynamicCredentials.value ? (openBlock(), createBlock(DynamicCredentialsDrawer_default, {
						key: 1,
						class: normalizeClass(_ctx.$style.dynamicCredentialsDrawer),
						credentials: unref(dynamicCreds).credentials.value,
						"connected-count": unref(dynamicCreds).connectedCount.value,
						"total-count": unref(dynamicCreds).totalCount.value,
						"data-testid": "dynamic-credentials-drawer",
						onClose: _cache[4] || (_cache[4] = ($event) => isDynamicCredentialsDrawerOpen.value = false),
						onAuthorize: unref(dynamicCreds).authorize,
						onRevoke: unref(dynamicCreds).revoke
					}, null, 8, [
						"class",
						"credentials",
						"connected-count",
						"total-count",
						"onAuthorize",
						"onRevoke"
					])) : createCommentVNode("", true),
					unref(artifacts).isViewerVisible.value ? (openBlock(), createBlock(ChatArtifactViewer_default, {
						key: sessionId.value,
						class: normalizeClass(_ctx.$style.artifactViewer),
						artifacts: unref(artifacts).allArtifacts.value,
						"selected-index": unref(artifacts).selectedIndex.value,
						onClose: unref(artifacts).handleCloseViewer,
						onSelectArtifact: unref(artifacts).handleSelect,
						onDownload: unref(artifacts).handleDownload
					}, null, 8, [
						"class",
						"artifacts",
						"selected-index",
						"onClose",
						"onSelectArtifact",
						"onDownload"
					])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"class",
				"onDragenter",
				"onDragleave",
				"onDragover",
				"onDrop",
				"onPaste"
			])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	chatLayout: "_chatLayout_1ga7b_1",
	hasArtifact: "_hasArtifact_1ga7b_6",
	mainContent: "_mainContent_1ga7b_6",
	mainContentResizer: "_mainContentResizer_1ga7b_14",
	dynamicCredentialsDrawer: "_dynamicCredentialsDrawer_1ga7b_27",
	artifactViewer: "_artifactViewer_1ga7b_34",
	isResizing: "_isResizing_1ga7b_39",
	scrollArea: "_scrollArea_1ga7b_44",
	scrollable: "_scrollable_1ga7b_49",
	isNewSession: "_isNewSession_1ga7b_58",
	isAgentNewSession: "_isAgentNewSession_1ga7b_61",
	greetingsCentered: "_greetingsCentered_1ga7b_65",
	header: "_header_1ga7b_72",
	messageList: "_messageList_1ga7b_78",
	promptContainer: "_promptContainer_1ga7b_88",
	isMobileDevice: "_isMobileDevice_1ga7b_95",
	isExistingSession: "_isExistingSession_1ga7b_95",
	isMainPanelNarrow: "_isMainPanelNarrow_1ga7b_108",
	scrollToBottomButton: "_scrollToBottomButton_1ga7b_113",
	isDraggingFile: "_isDraggingFile_1ga7b_121",
	dropOverlay: "_dropOverlay_1ga7b_125"
} }]]);
//#endregion
export { ChatView_default as default };
