import { $d as init_runtime_core_esm_bundler, $u as useStorage, Bd as createBlock, Cc as DropdownMenuGroup_default, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Oa as v4, Of as withDirectives, Pd as Fragment, Rd as computed, Sc as DropdownMenuItem_default, Sp as toDisplayString, Tc as DropdownMenuRoot_default, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xd as guardReactiveProps, Xf as unref, Yo as useRoute, _p as normalizeClass, bc as DropdownMenuPortal_default, ef as inject, ff as openBlock, gf as resolveComponent, hc as DropdownMenuTrigger_default, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, of as onBeforeUnmount, pf as provide, vp as normalizeProps, wc as DropdownMenuContent_default, xc as DropdownMenuLabel_default, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $d as injectWorkflowDocumentStore, Bu as useBuilderStore, DA as BaseLayout_default, Gr as useAssistantStore, Ir as InstanceAiEditorCapabilityKey, Kx as LOCAL_STORAGE_LOGS_PANEL_OPEN, Lp as useWorkflowId, OM as PopOutWindowKey, SN as _plugin_vue_export_helper_default, Ta as groupConversationsByDate, Vr as useClipboard, Wr as useChatPanelStore, Xc as usePushConnectionStore, _N as N8nText_default, _b as CHAT_TRIGGER_NODE_TYPE, _l as useLogsStore, bu as useStyles, dC as useToast, fN as N8nTooltip_default, ft as useInstanceAiHandoffCapability, hC as useTelemetry, iN as AskAssistantAvatar_default, in as useChatHubPanelStore, jN as useI18n, lN as AskAssistantButton_default, sj as N8nScrollArea_default, st as LoadingView_default, ua as useChatStore, vN as N8nIconButton_default, xN as N8nIcon_default, xa as flattenModel, xd as useEditorContext, yC as useSettingsStore, yM as N8nFloatingWindow_default, zx as LOCAL_STORAGE_FLOATING_CHAT_WINDOW } from "./app-D5flEmb-.js";
import { t as ChatAgentAvatar_default } from "./ChatAgentAvatar-Cy6J2OZW.js";
import { t as AppSidebar_default } from "./AppSidebar-DWX2rTNu.js";
import { n as LogsPanel_default, r as usePopOutWindow } from "./useExecutionDebugging-ZPJd0V5q.js";
import { t as useWorkflowInitialization } from "./useWorkflowInitialization-D5r3-lqz.js";
import { n as usePostMessageHandler } from "./usePostMessageHandler-BK6Ggrpi.js";
import { a as useChatSession, n as ChatPrompt_default, r as ChatMessage_default, t as ChatGreetings_default } from "./ChatGreetings-C05g-xD1.js";
import { t as useFileDrop } from "./useFileDrop-DXIUwF1i.js";
import { t as MainHeader_default } from "./MainHeader-CtuSDWhH.js";
//#region src/app/composables/useLayoutProps.ts
init_runtime_core_esm_bundler();
function useLayoutProps() {
	const route = useRoute();
	return { layoutProps: computed(() => {
		return route.meta.layoutProps ?? {};
	}) };
}
//#endregion
//#region src/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AskAssistantFloatingButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AskAssistantFloatingButton",
	setup(__props) {
		const assistantStore = useAssistantStore();
		const builderStore = useBuilderStore();
		const chatPanelStore = useChatPanelStore();
		const settingsStore = useSettingsStore();
		const workflowId = useWorkflowId();
		const i18n = useI18n();
		const { APP_Z_INDEXES } = useStyles();
		const { instanceAi } = useEditorContext();
		const lastUnread = computed(() => {
			const msg = assistantStore.lastUnread;
			if (msg?.type === "block") return msg.title;
			if (msg?.type === "text") return msg.content;
			if (msg?.type === "code-diff") return msg.description;
			return "";
		});
		const allowSendingParameterValues = computed(() => settingsStore.settings.ai.allowSendingParameterValues);
		const onClick = async () => {
			if (builderStore.isAIBuilderEnabled && allowSendingParameterValues.value) {
				if (chatPanelStore.isOpen && chatPanelStore.isBuilderModeActive) chatPanelStore.close();
				else await chatPanelStore.open({ mode: "builder" });
			} else await chatPanelStore.toggle({ mode: "assistant" });
			if (chatPanelStore.isOpen) assistantStore.trackUserOpenedAssistant({
				source: "canvas",
				task: "placeholder",
				has_existing_session: !assistantStore.isSessionEnded,
				workflowId: workflowId.value
			});
		};
		return (_ctx, _cache) => {
			return !unref(instanceAi) ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "ask-assistant-floating-button"
			}, [createVNode(unref(N8nTooltip_default), {
				"z-index": unref(APP_Z_INDEXES).ASK_ASSISTANT_FLOATING_BUTTON_TOOLTIP,
				placement: "top",
				visible: !!lastUnread.value,
				"popper-class": _ctx.$style.tooltip
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.text) }, toDisplayString(lastUnread.value), 3), createBaseVNode("div", { class: normalizeClass(_ctx.$style.assistant) }, [createVNode(unref(AskAssistantAvatar_default), { size: "mini" }), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("aiAssistant.name")), 1)], 2)]),
				default: withCtx(() => [createVNode(unref(AskAssistantButton_default), {
					"unread-count": unref(assistantStore).unreadCount,
					onClick
				}, null, 8, ["unread-count"])]),
				_: 1
			}, 8, [
				"z-index",
				"visible",
				"popper-class"
			])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_fmfe1_1",
	tooltip: "_tooltip_fmfe1_8",
	assistant: "_assistant_fmfe1_14",
	text: "_text_fmfe1_24"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/CanvasChatSessionDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CanvasChatSessionDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CanvasChatSessionDropdown",
	props: {
		sessionId: {},
		sessionTitle: {},
		workflowId: {}
	},
	emits: ["select-session"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const chatStore = useChatStore();
		const popOutWindow = inject(PopOutWindowKey, ref());
		const isInPopOut = computed(() => !!popOutWindow.value);
		const portalTarget = computed(() => popOutWindow.value?.document.body);
		const isOpen = ref(false);
		const isLoading = ref(false);
		const hasFetchedForWorkflow = ref(false);
		const contentRef = ref(null);
		const workflowSessions = computed(() => {
			return (chatStore.sessions.ids ?? []).reduce((acc, id) => {
				const s = chatStore.sessions.byId[id];
				if (s && s.workflowId === props.workflowId && s.type === "manual") acc.push(s);
				return acc;
			}, []);
		});
		const groupedSessions = computed(() => groupConversationsByDate(workflowSessions.value));
		const hasNoSessions = computed(() => workflowSessions.value.length === 0 && !isLoading.value);
		async function handleOpenChange(open) {
			isOpen.value = open;
			if (open && !hasFetchedForWorkflow.value) {
				isLoading.value = true;
				try {
					await chatStore.fetchSessions(true, { type: "manual" });
					hasFetchedForWorkflow.value = true;
				} finally {
					isLoading.value = false;
				}
			}
		}
		function handleSelectSession(sessionId) {
			emit("select-session", sessionId);
			isOpen.value = false;
		}
		function formatSessionLabel(session) {
			return session.id;
		}
		watch(() => props.workflowId, () => {
			isOpen.value = false;
			hasFetchedForWorkflow.value = false;
		});
		watch(isOpen, (open, _oldValue, onCleanup) => {
			const target = portalTarget.value;
			if (!target || !open) return;
			const targetDoc = target.ownerDocument;
			if (!targetDoc || targetDoc === document) return;
			let handler;
			const timerId = setTimeout(() => {
				handler = (e) => {
					if ((contentRef.value?.$el)?.contains(e.target)) return;
					setTimeout(() => {
						if (isOpen.value) isOpen.value = false;
					}, 0);
				};
				targetDoc.addEventListener("pointerdown", handler);
			}, 0);
			onCleanup(() => {
				clearTimeout(timerId);
				if (handler) targetDoc.removeEventListener("pointerdown", handler);
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenuRoot_default), {
				modal: !isInPopOut.value,
				open: isOpen.value,
				"onUpdate:open": handleOpenChange
			}, {
				default: withCtx(() => [createVNode(unref(DropdownMenuTrigger_default), {
					class: normalizeClass([_ctx.$style.trigger, { [_ctx.$style.open]: isOpen.value }]),
					title: unref(i18n).baseText("chatHub.canvas.session.tooltip.sessionId", { interpolate: { sessionId: props.sessionId } }),
					"data-test-id": "canvas-chat-session-dropdown"
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(_ctx.$style.triggerText)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.sessionTitle), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nIcon_default), {
						icon: "chevron-down",
						size: "small",
						class: normalizeClass(_ctx.$style.chevron)
					}, null, 8, ["class"])]),
					_: 1
				}, 8, ["class", "title"]), createVNode(unref(DropdownMenuPortal_default), normalizeProps(guardReactiveProps(portalTarget.value ? { to: portalTarget.value } : {})), {
					default: withCtx(() => [createVNode(unref(DropdownMenuContent_default), {
						ref_key: "contentRef",
						ref: contentRef,
						class: normalizeClass(_ctx.$style.content),
						"side-offset": 4,
						align: "start",
						"avoid-collisions": true
					}, {
						default: withCtx(() => [isLoading.value ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.emptyState)
						}, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [..._cache[0] || (_cache[0] = [createTextVNode("…", -1)])]),
							_: 1
						})], 2)) : hasNoSessions.value ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.emptyState)
						}, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.canvas.session.noSessions")), 1)]),
							_: 1
						})], 2)) : (openBlock(true), createElementBlock(Fragment, { key: 2 }, renderList(groupedSessions.value, (group) => {
							return openBlock(), createBlock(unref(DropdownMenuGroup_default), {
								key: group.group,
								class: normalizeClass(_ctx.$style.group)
							}, {
								default: withCtx(() => [createVNode(unref(DropdownMenuLabel_default), { class: normalizeClass(_ctx.$style.groupLabel) }, {
									default: withCtx(() => [createTextVNode(toDisplayString(group.group), 1)]),
									_: 2
								}, 1032, ["class"]), (openBlock(true), createElementBlock(Fragment, null, renderList(group.sessions, (session) => {
									return openBlock(), createBlock(unref(DropdownMenuItem_default), {
										key: session.id,
										class: normalizeClass([_ctx.$style.sessionItem, { [_ctx.$style.active]: session.id === props.sessionId }]),
										onSelect: ($event) => handleSelectSession(session.id)
									}, {
										default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sessionTitle) }, toDisplayString(formatSessionLabel(session)), 3)]),
										_: 2
									}, 1032, ["class", "onSelect"]);
								}), 128))]),
								_: 2
							}, 1032, ["class"]);
						}), 128))]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 16)]),
				_: 1
			}, 8, ["modal", "open"]);
		};
	}
}), [["__cssModules", { "$style": {
	trigger: "_trigger_mp8ne_450",
	triggerText: "_triggerText_mp8ne_466",
	chevron: "_chevron_mp8ne_472",
	open: "_open_mp8ne_476",
	content: "_content_mp8ne_480",
	popoverIn: "_popoverIn_mp8ne_1",
	emptyState: "_emptyState_mp8ne_516",
	group: "_group_mp8ne_521",
	groupLabel: "_groupLabel_mp8ne_525",
	sessionItem: "_sessionItem_mp8ne_533",
	active: "_active_mp8ne_551",
	sessionTitle: "_sessionTitle_mp8ne_555",
	shimmer: "_shimmer_mp8ne_1",
	spin: "_spin_mp8ne_1",
	"skeleton-pulse": "_skeleton-pulse_mp8ne_1",
	opacityPulse: "_opacityPulse_mp8ne_1",
	fadeIn: "_fadeIn_mp8ne_1",
	collapsibleSlideDown: "_collapsibleSlideDown_mp8ne_1",
	collapsibleSlideUp: "_collapsibleSlideUp_mp8ne_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_mp8ne_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_mp8ne_1",
	blurSwapIn: "_blurSwapIn_mp8ne_1",
	blurSwapOut: "_blurSwapOut_mp8ne_1",
	pulse: "_pulse_mp8ne_1",
	pulseGlow: "_pulseGlow_mp8ne_1",
	pulseGlowDelayed: "_pulseGlowDelayed_mp8ne_1",
	fade: "_fade_mp8ne_1",
	fadeInUp: "_fadeInUp_mp8ne_1",
	fadeInDown: "_fadeInDown_mp8ne_1",
	fadeInLeft: "_fadeInLeft_mp8ne_1",
	fadeInRight: "_fadeInRight_mp8ne_1",
	fadeOut: "_fadeOut_mp8ne_1",
	fadeOutDown: "_fadeOutDown_mp8ne_1",
	fadeOutUp: "_fadeOutUp_mp8ne_1",
	fadeOutLeft: "_fadeOutLeft_mp8ne_1",
	fadeOutRight: "_fadeOutRight_mp8ne_1",
	ping: "_ping_mp8ne_1",
	blinkBackground: "_blinkBackground_mp8ne_1",
	typingBlink: "_typingBlink_mp8ne_1"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/CanvasChatHubPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CanvasChatHubPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CanvasChatHubPanel",
	props: { floating: {
		type: Boolean,
		default: false
	} },
	emits: ["close", "pop-out"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const chatStore = useChatStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const chatHubPanelStore = useChatHubPanelStore();
		const telemetry = useTelemetry();
		const clipboard = useClipboard();
		const toast = useToast();
		const canPopOut = computed(() => window.parent === window);
		const isPoppedOut = computed(() => chatHubPanelStore.isPoppedOut);
		const sessionId = ref(v4());
		const editingMessageId = ref();
		const inputRef = useTemplateRef("inputRef");
		const scrollableRef = useTemplateRef("scrollable");
		const allNodes = computed(() => workflowDocumentStore?.value?.allNodes ?? []);
		const chatTriggerNode = computed(() => allNodes.value.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE));
		const agentDisplayName = computed(() => {
			const triggerName = chatTriggerNode.value?.parameters?.agentName;
			if (typeof triggerName === "string" && triggerName.trim()) return triggerName.trim();
			return workflowDocumentStore?.value?.name || "Workflow";
		});
		const workflowAgent = computed(() => {
			const workflowId = workflowDocumentStore.value.workflowId;
			if (!workflowId) return null;
			const params = chatTriggerNode.value?.parameters;
			const agentIcon = params?.agentIcon;
			const agent = chatStore.getAgent({
				provider: "n8n",
				workflowId
			}, {
				name: agentDisplayName.value,
				icon: agentIcon ?? null
			});
			const options = params?.options;
			const agentDescription = params?.agentDescription;
			const description = typeof agentDescription === "string" && agentDescription.trim() ? agentDescription.trim() : null;
			const suggestedPrompts = (params?.suggestedPrompts)?.prompts?.filter((p) => typeof p.text === "string" && p.text.trim().length > 0).map((p) => ({
				text: p.text,
				...p.icon ? { icon: p.icon } : {}
			}));
			return {
				...agent,
				...description !== null ? { description } : {},
				...suggestedPrompts?.length ? { suggestedPrompts } : {},
				...options ? { metadata: {
					...agent.metadata,
					allowFileUploads: options.allowFileUploads === true,
					allowedFilesMimeTypes: typeof options.allowedFilesMimeTypes === "string" ? options.allowedFilesMimeTypes : agent.metadata.allowedFilesMimeTypes
				} } : {}
			};
		});
		const { chatMessages, isResponding, isNewSession, messagingState, arrivedState, scrollToBottom, loadSession } = useChatSession({
			sessionId,
			scrollableRef
		});
		const canAcceptFiles = computed(() => workflowAgent.value?.metadata.allowFileUploads ?? false);
		function onFilesDropped(files) {
			inputRef.value?.addAttachments(files);
		}
		const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);
		const sessionIdText = computed(() => i18n.baseText("chat.window.session.id", { interpolate: { id: `${sessionId.value.slice(0, 5)}...` } }));
		async function copySessionId() {
			await clipboard.copy(sessionId.value);
			toast.showMessage({
				title: i18n.baseText("generic.copiedToClipboard"),
				message: "",
				type: "success"
			});
		}
		function handleNewSession() {
			telemetry.track("User clicked new chat button", { source: "canvas" });
			sessionId.value = v4();
		}
		async function handleSelectSession(selectedSessionId) {
			sessionId.value = selectedSessionId;
			try {
				await loadSession(selectedSessionId);
			} catch {
				sessionId.value = v4();
			}
		}
		watch(() => workflowDocumentStore.value.workflowId, () => {
			sessionId.value = v4();
		});
		async function onSubmit(message, attachments) {
			if (!message.trim() || isResponding.value || !workflowAgent.value) return;
			await chatStore.sendMessage(sessionId.value, message, workflowAgent.value, {}, attachments, workflowDocumentStore.value.workflowId);
			inputRef.value?.reset();
		}
		async function onStop() {
			await chatStore.stopStreamingMessage(sessionId.value);
		}
		async function handleRegenerateMessage(message) {
			if (isResponding.value || message.type !== "ai" || !workflowAgent.value) return;
			editingMessageId.value = void 0;
			await chatStore.regenerateMessage(sessionId.value, message.id, workflowAgent.value, {}, workflowDocumentStore.value.workflowId);
		}
		function handleStartEditMessage(messageId) {
			editingMessageId.value = messageId;
		}
		function handleCancelEditMessage() {
			editingMessageId.value = void 0;
		}
		async function handleEditMessage(content, keptAttachmentIndices, newFiles) {
			if (!editingMessageId.value || isResponding.value || !workflowAgent.value) return;
			await chatStore.editMessage(sessionId.value, editingMessageId.value, content, workflowAgent.value, {}, keptAttachmentIndices, newFiles, workflowDocumentStore.value.workflowId);
			editingMessageId.value = void 0;
		}
		function handleSelectPrompt(prompt) {
			if (workflowAgent.value) telemetry.track("User clicked chat hub suggested prompt", {
				...flattenModel(workflowAgent.value.model),
				source: "canvas"
			});
			inputRef.value?.setText(prompt);
			inputRef.value?.focus();
		}
		function focusInput() {
			inputRef.value?.focus();
		}
		__expose({
			focusInput,
			sessionId,
			sessionIdText,
			handleNewSession,
			handleSelectSession,
			copySessionId
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.panel, {
					[_ctx.$style.poppedOut]: isPoppedOut.value,
					[_ctx.$style.floating]: props.floating,
					[_ctx.$style.isDraggingFile]: unref(fileDrop).isDragging.value
				}]),
				onDragenter: _cache[3] || (_cache[3] = (...args) => unref(fileDrop).handleDragEnter && unref(fileDrop).handleDragEnter(...args)),
				onDragleave: _cache[4] || (_cache[4] = (...args) => unref(fileDrop).handleDragLeave && unref(fileDrop).handleDragLeave(...args)),
				onDragover: _cache[5] || (_cache[5] = (...args) => unref(fileDrop).handleDragOver && unref(fileDrop).handleDragOver(...args)),
				onDrop: _cache[6] || (_cache[6] = (...args) => unref(fileDrop).handleDrop && unref(fileDrop).handleDrop(...args)),
				onPaste: _cache[7] || (_cache[7] = (...args) => unref(fileDrop).handlePaste && unref(fileDrop).handlePaste(...args))
			}, [
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
				!props.floating ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.header)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [
					createVNode(ChatAgentAvatar_default, {
						agent: workflowAgent.value,
						size: "sm"
					}, null, 8, ["agent"]),
					createVNode(unref(N8nText_default), {
						size: "medium",
						bold: true,
						class: normalizeClass(_ctx.$style.headerTitleText)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(agentDisplayName.value), 1)]),
						_: 1
					}, 8, ["class"]),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.previewBadge) }, toDisplayString(unref(i18n).baseText("chatHub.canvas.previewBadge")), 3)
				], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [
					createVNode(CanvasChatSessionDropdown_default, {
						"session-id": sessionId.value,
						"session-title": sessionIdText.value,
						"workflow-id": unref(workflowDocumentStore).workflowId,
						onSelectSession: handleSelectSession
					}, null, 8, [
						"session-id",
						"session-title",
						"workflow-id"
					]),
					createVNode(unref(N8nTooltip_default), { placement: "bottom" }, {
						content: withCtx(() => [
							createTextVNode(toDisplayString(sessionId.value) + " ", 1),
							_cache[8] || (_cache[8] = createBaseVNode("br", null, null, -1)),
							createTextVNode(" " + toDisplayString(unref(i18n).baseText("chat.window.session.id.copy")), 1)
						]),
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "copy",
							variant: "ghost",
							size: "small",
							"data-test-id": "canvas-chat-session-id",
							onClick: copySessionId
						})]),
						_: 1
					}),
					createVNode(unref(N8nTooltip_default), { placement: "bottom" }, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chat.window.session.resetSession")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "undo-2",
							variant: "ghost",
							size: "small",
							"data-test-id": "canvas-chat-hub-new-session",
							onClick: handleNewSession
						})]),
						_: 1
					}),
					canPopOut.value && !isPoppedOut.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "bottom"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("runData.panel.actions.popOut")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "external-link",
							variant: "ghost",
							size: "small",
							"data-test-id": "canvas-chat-hub-pop-out",
							onClick: _cache[0] || (_cache[0] = ($event) => emit("pop-out"))
						})]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nIconButton_default), {
						icon: "x",
						variant: "ghost",
						size: "small",
						"data-test-id": "canvas-chat-hub-close",
						onClick: _cache[1] || (_cache[1] = ($event) => emit("close"))
					})
				], 2)], 2)) : createCommentVNode("", true),
				createVNode(unref(N8nScrollArea_default), {
					type: "scroll",
					"enable-vertical-scroll": true,
					"enable-horizontal-scroll": false,
					"as-child": "",
					class: normalizeClass(_ctx.$style.scrollArea)
				}, {
					default: withCtx(() => [createBaseVNode("div", {
						ref: "scrollable",
						class: normalizeClass({
							[_ctx.$style.scrollable]: true,
							[_ctx.$style.isNewSession]: unref(isNewSession)
						})
					}, [unref(isNewSession) ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.greetingsWrapper)
					}, [createVNode(ChatGreetings_default, {
						"selected-agent": workflowAgent.value,
						onSelectPrompt: handleSelectPrompt
					}, null, 8, ["selected-agent"])], 2)) : (openBlock(), createElementBlock("div", {
						key: 1,
						role: "log",
						"aria-live": "polite",
						class: normalizeClass(_ctx.$style.messageList)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(chatMessages), (message) => {
						return openBlock(), createBlock(ChatMessage_default, {
							key: message.id,
							message,
							compact: false,
							"is-editing": editingMessageId.value === message.id,
							"is-edit-submitting": unref(chatStore).streaming?.revisionOfMessageId === message.id,
							"has-session-streaming": unref(isResponding),
							"cached-agent-display-name": workflowAgent.value?.name ?? null,
							"cached-agent-icon": workflowAgent.value?.icon ?? null,
							"accepted-mime-types": workflowAgent.value?.metadata.allowedFilesMimeTypes ?? "",
							onStartEdit: ($event) => handleStartEditMessage(message.id),
							onCancelEdit: handleCancelEditMessage,
							onUpdate: handleEditMessage,
							onRegenerate: handleRegenerateMessage
						}, null, 8, [
							"message",
							"is-editing",
							"is-edit-submitting",
							"has-session-streaming",
							"cached-agent-display-name",
							"cached-agent-icon",
							"accepted-mime-types",
							"onStartEdit"
						]);
					}), 128))], 2)), createBaseVNode("div", { class: normalizeClass(_ctx.$style.promptContainer) }, [!unref(arrivedState).bottom && !unref(isNewSession) ? (openBlock(), createBlock(unref(N8nIconButton_default), {
						key: 0,
						variant: "outline",
						icon: "arrow-down",
						class: normalizeClass(_ctx.$style.scrollToBottomButton),
						title: unref(i18n).baseText("chatHub.chat.scrollToBottom"),
						onClick: _cache[2] || (_cache[2] = ($event) => unref(scrollToBottom)(true))
					}, null, 8, ["class", "title"])) : createCommentVNode("", true), createVNode(ChatPrompt_default, {
						ref_key: "inputRef",
						ref: inputRef,
						class: normalizeClass(_ctx.$style.prompt),
						"selected-model": workflowAgent.value,
						"checked-tool-ids": [],
						"messaging-state": unref(messagingState),
						"is-tools-selectable": false,
						"is-new-session": unref(isNewSession),
						"show-credits-claimed-callout": false,
						"show-dynamic-credentials-missing-callout": false,
						compact: props.floating,
						"accepted-mime-types": workflowAgent.value?.metadata.allowedFilesMimeTypes ?? "",
						placeholder: unref(i18n).baseText("chatHub.chat.prompt.placeholder.sendPreview"),
						"ai-credits-quota": "0",
						onSubmit,
						onStop
					}, null, 8, [
						"class",
						"selected-model",
						"messaging-state",
						"is-new-session",
						"compact",
						"accepted-mime-types",
						"placeholder"
					])], 2)], 2)]),
					_: 1
				}, 8, ["class"])
			], 34);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_1yx2x_1",
	poppedOut: "_poppedOut_1yx2x_9",
	floating: "_floating_1yx2x_12",
	header: "_header_1yx2x_17",
	headerTitle: "_headerTitle_1yx2x_28",
	headerTitleText: "_headerTitleText_1yx2x_35",
	headerActions: "_headerActions_1yx2x_41",
	previewBadge: "_previewBadge_1yx2x_49",
	scrollArea: "_scrollArea_1yx2x_60",
	scrollable: "_scrollable_1yx2x_65",
	isNewSession: "_isNewSession_1yx2x_74",
	promptContainer: "_promptContainer_1yx2x_77",
	prompt: "_prompt_1yx2x_77",
	greetingsWrapper: "_greetingsWrapper_1yx2x_84",
	messageList: "_messageList_1yx2x_91",
	scrollToBottomButton: "_scrollToBottomButton_1yx2x_117",
	isDraggingFile: "_isDraggingFile_1yx2x_125",
	dropOverlay: "_dropOverlay_1yx2x_129"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/CanvasChatFloatingMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/chatHub/components/CanvasChatFloatingMenu.vue
var CanvasChatFloatingMenu_default = /* @__PURE__ */ defineComponent({
	__name: "CanvasChatFloatingMenu",
	props: {
		sessionId: {},
		workflowId: {},
		canPopOut: { type: Boolean }
	},
	emits: [
		"select-session",
		"copy-session-id",
		"new-session",
		"pop-out"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const chatStore = useChatStore();
		const popOutWindow = inject(PopOutWindowKey, ref());
		const isInPopOut = computed(() => !!popOutWindow.value);
		const portalTarget = computed(() => popOutWindow.value?.document.body);
		const isLoading = ref(false);
		const hasFetchedForWorkflow = ref(false);
		const workflowSessions = computed(() => {
			return (chatStore.sessions.ids ?? []).reduce((acc, id) => {
				const s = chatStore.sessions.byId[id];
				if (s && s.workflowId === props.workflowId && s.type === "manual") acc.push(s);
				return acc;
			}, []);
		});
		const sessionChildren = computed(() => {
			const grouped = groupConversationsByDate(workflowSessions.value);
			if (grouped.length === 0 && !isLoading.value) return [{
				id: "__no-sessions__",
				label: i18n.baseText("chatHub.canvas.session.noSessions"),
				disabled: true
			}];
			const items = [];
			for (let i = 0; i < grouped.length; i++) {
				const group = grouped[i];
				items.push({
					id: `__group-${i}__`,
					label: group.group,
					disabled: true,
					divided: i > 0
				});
				for (const session of group.sessions) items.push({
					id: session.id,
					label: session.id,
					checked: session.id === props.sessionId
				});
			}
			return items;
		});
		const menuItems = computed(() => {
			const items = [
				{
					id: "sessions",
					label: i18n.baseText("chatHub.canvas.menu.sessions"),
					icon: {
						type: "icon",
						value: "history"
					},
					children: sessionChildren.value,
					loading: isLoading.value
				},
				{
					id: "copy-session-id",
					label: i18n.baseText("chatHub.canvas.menu.copySessionId"),
					icon: {
						type: "icon",
						value: "copy"
					},
					divided: true
				},
				{
					id: "new-session",
					label: i18n.baseText("chatHub.canvas.menu.newSession"),
					icon: {
						type: "icon",
						value: "undo-2"
					}
				}
			];
			if (props.canPopOut) items.push({
				id: "pop-out",
				label: i18n.baseText("chatHub.canvas.menu.popOut"),
				icon: {
					type: "icon",
					value: "external-link"
				}
			});
			return items;
		});
		async function handleSubMenuToggle(itemId, open) {
			if (itemId === "sessions" && open && !hasFetchedForWorkflow.value) {
				hasFetchedForWorkflow.value = true;
				isLoading.value = true;
				try {
					await chatStore.fetchSessions(true, { type: "manual" });
				} finally {
					isLoading.value = false;
				}
			}
		}
		function handleSelect(value) {
			switch (value) {
				case "copy-session-id":
					emit("copy-session-id");
					break;
				case "new-session":
					emit("new-session");
					break;
				case "pop-out":
					setTimeout(() => {
						document.activeElement?.blur?.();
						emit("pop-out");
					});
					break;
				default: if (value !== "__no-sessions__") emit("select-session", value);
			}
		}
		watch(() => props.workflowId, () => {
			hasFetchedForWorkflow.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				items: menuItems.value,
				"portal-target": portalTarget.value,
				modal: !isInPopOut.value,
				placement: "bottom-end",
				"data-test-id": "canvas-chat-floating-menu",
				onSelect: handleSelect,
				"onSubmenu:toggle": handleSubMenuToggle
			}, null, 8, [
				"items",
				"portal-target",
				"modal"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/chatHub/components/CanvasChatFloatingWindow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CANVAS_MARGIN = 16;
var CHAT_HUB_DEFAULT_WIDTH = 560;
var CHAT_HUB_DEFAULT_HEIGHT = 700;
var CanvasChatFloatingWindow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CanvasChatFloatingWindow",
	emits: ["close", "pop-out"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const chatHubPanelStore = useChatHubPanelStore();
		const isPoppedOut = computed(() => chatHubPanelStore.isPoppedOut);
		const canvasChatHubRef = ref();
		const floatingWindowRef = useTemplateRef("floatingWindowRef");
		const canPopOut = computed(() => window.parent === window);
		const floatingWindowState = useStorage(LOCAL_STORAGE_FLOATING_CHAT_WINDOW, {});
		function getCanvasOrigin() {
			const canvasEl = document.getElementById("canvas");
			if (canvasEl) {
				const rect = canvasEl.getBoundingClientRect();
				return {
					x: rect.left,
					y: rect.top
				};
			}
			return {
				x: 0,
				y: 0
			};
		}
		const floatingWindowPosition = computed(() => {
			if (floatingWindowState.value.x !== void 0 && floatingWindowState.value.y !== void 0) return {
				x: floatingWindowState.value.x,
				y: floatingWindowState.value.y
			};
			const origin = getCanvasOrigin();
			return {
				x: origin.x + CANVAS_MARGIN,
				y: origin.y + CANVAS_MARGIN
			};
		});
		const floatingWindowWidth = computed(() => floatingWindowState.value.width ?? CHAT_HUB_DEFAULT_WIDTH);
		const floatingWindowHeight = computed(() => floatingWindowState.value.height ?? CHAT_HUB_DEFAULT_HEIGHT);
		function onFloatingWindowMove(pos) {
			floatingWindowState.value = {
				...floatingWindowState.value,
				x: pos.x,
				y: pos.y
			};
		}
		function onFloatingWindowResize(size) {
			floatingWindowState.value = {
				...floatingWindowState.value,
				width: size.width,
				height: size.height
			};
		}
		function onResetPosition() {
			if (isPoppedOut.value) return;
			floatingWindowState.value = {};
			const origin = getCanvasOrigin();
			floatingWindowRef.value?.resetPosition({
				x: origin.x + CANVAS_MARGIN,
				y: origin.y + CANVAS_MARGIN
			}, {
				width: CHAT_HUB_DEFAULT_WIDTH,
				height: CHAT_HUB_DEFAULT_HEIGHT
			});
		}
		watch(() => canvasChatHubRef.value, async (ref) => {
			if (ref) {
				await nextTick();
				ref.focusInput();
			}
		});
		function focusInput() {
			canvasChatHubRef.value?.focusInput();
		}
		__expose({
			focusInput,
			canvasChatHubRef
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nFloatingWindow_default), {
				ref_key: "floatingWindowRef",
				ref: floatingWindowRef,
				width: floatingWindowWidth.value,
				height: floatingWindowHeight.value,
				"min-width": 400,
				"min-height": 300,
				"initial-position": floatingWindowPosition.value,
				class: normalizeClass({ [_ctx.$style.poppedOut]: isPoppedOut.value }),
				"data-test-id": "canvas-chat-floating-window",
				onClose: _cache[5] || (_cache[5] = ($event) => emit("close")),
				onMove: onFloatingWindowMove,
				onResize: onFloatingWindowResize,
				onHeaderDoubleClick: onResetPosition
			}, {
				"header-icon": withCtx(() => [createVNode(ChatAgentAvatar_default, {
					agent: null,
					size: "sm"
				})]),
				header: withCtx(() => [createVNode(unref(N8nText_default), {
					size: "medium",
					bold: true,
					class: normalizeClass(_ctx.$style.headerTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.canvas.floatingTitle")), 1)]),
					_: 1
				}, 8, ["class"])]),
				"header-actions": withCtx(() => [canvasChatHubRef.value?.sessionId ? (openBlock(), createBlock(CanvasChatFloatingMenu_default, {
					key: 0,
					"session-id": canvasChatHubRef.value.sessionId,
					"workflow-id": unref(workflowDocumentStore).workflowId,
					"can-pop-out": canPopOut.value && !isPoppedOut.value,
					onSelectSession: canvasChatHubRef.value.handleSelectSession,
					onCopySessionId: _cache[0] || (_cache[0] = ($event) => canvasChatHubRef.value.copySessionId()),
					onNewSession: _cache[1] || (_cache[1] = ($event) => canvasChatHubRef.value.handleNewSession()),
					onPopOut: _cache[2] || (_cache[2] = ($event) => emit("pop-out"))
				}, null, 8, [
					"session-id",
					"workflow-id",
					"can-pop-out",
					"onSelectSession"
				])) : createCommentVNode("", true)]),
				default: withCtx(() => [createVNode(CanvasChatHubPanel_default, {
					ref_key: "canvasChatHubRef",
					ref: canvasChatHubRef,
					floating: true,
					onClose: _cache[3] || (_cache[3] = ($event) => emit("close")),
					onPopOut: _cache[4] || (_cache[4] = ($event) => emit("pop-out"))
				}, null, 512)]),
				_: 1
			}, 8, [
				"width",
				"height",
				"initial-position",
				"class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	headerTitle: "_headerTitle_1pkqr_1",
	poppedOut: "_poppedOut_1pkqr_7"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/CanvasChatOverlay.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var CanvasChatOverlay_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CanvasChatOverlay",
	setup(__props, { expose: __expose }) {
		const route = useRoute();
		const chatHubPanelStore = useChatHubPanelStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const canvasChatFloatingWindowRef = ref();
		const popOutContainer = useTemplateRef("popOutContainer");
		const popOutContent = useTemplateRef("popOutContent");
		const isPoppedOut = computed(() => chatHubPanelStore.isPoppedOut);
		const isVisible = computed(() => chatHubPanelStore.isOpen);
		const hasBeenOpened = ref(false);
		watch(isVisible, (val) => {
			if (val) {
				hasBeenOpened.value = true;
				nextTick(() => {
					canvasChatFloatingWindowRef.value?.focusInput();
				});
			}
		}, { immediate: true });
		const popOutWindowTitle = computed(() => `Chat - ${workflowDocumentStore.value.name || "Workflow"}`);
		const shouldPopOut = computed(() => isPoppedOut.value && chatHubPanelStore.isOpen);
		usePopOutWindow({
			title: popOutWindowTitle,
			initialWidth: 560,
			initialHeight: 700,
			container: popOutContainer,
			content: popOutContent,
			shouldPopOut,
			onRequestClose: () => {
				chatHubPanelStore.close();
			}
		});
		watch(() => route.meta.nodeView, (isNodeView) => {
			if (!isNodeView && isPoppedOut.value) chatHubPanelStore.close();
		});
		function onClose() {
			chatHubPanelStore.close();
		}
		function onPopOut() {
			chatHubPanelStore.popOut();
		}
		function focusInput() {
			canvasChatFloatingWindowRef.value?.focusInput();
		}
		__expose({ focusInput });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "popOutContainer",
				ref: popOutContainer,
				class: normalizeClass(_ctx.$style.popOutContainer)
			}, [createBaseVNode("div", {
				ref_key: "popOutContent",
				ref: popOutContent,
				class: normalizeClass([_ctx.$style.popOutContent, { [_ctx.$style.poppedOut]: isPoppedOut.value }])
			}, [hasBeenOpened.value ? withDirectives((openBlock(), createBlock(CanvasChatFloatingWindow_default, {
				key: 0,
				ref_key: "canvasChatFloatingWindowRef",
				ref: canvasChatFloatingWindowRef,
				onClose,
				onPopOut
			}, null, 512)), [[vShow, isVisible.value]]) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	popOutContainer: "_popOutContainer_oga57_1",
	popOutContent: "_popOutContent_oga57_5",
	poppedOut: "_poppedOut_oga57_8"
} }]]);
//#endregion
//#region src/app/components/app/AppHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/app/components/app/AppHeader.vue
var AppHeader_default = /* @__PURE__ */ defineComponent({
	__name: "AppHeader",
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(MainHeader_default);
		};
	}
});
//#endregion
//#region src/app/layouts/WorkflowLayout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/app/layouts/WorkflowLayout.vue
var WorkflowLayout_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowLayout",
	setup(__props) {
		const { layoutProps } = useLayoutProps();
		const assistantStore = useAssistantStore();
		const chatHubPanelStore = useChatHubPanelStore();
		const pushConnectionStore = usePushConnectionStore();
		const isCanvasOnly = useSettingsStore().isCanvasOnly;
		const logsStore = useLogsStore();
		const isLogsPanelOpenInEditor = useLocalStorage(LOCAL_STORAGE_LOGS_PANEL_OPEN, false);
		watch(isLogsPanelOpenInEditor, (isOpen) => logsStore.toggleOpen(isOpen), { immediate: true });
		watch(() => logsStore.isOpen, (isOpen) => {
			isLogsPanelOpenInEditor.value = isOpen;
		});
		const { isLoading, workflowId, currentWorkflowDocumentStore, isOnboardingRoute, isDebugRoute, initializeData, initializeWorkflow, handleDebugModeRoute, cleanup } = useWorkflowInitialization();
		const { setup: setupPostMessages, cleanup: cleanupPostMessages } = usePostMessageHandler({ currentWorkflowDocumentStore });
		provide(InstanceAiEditorCapabilityKey, useInstanceAiHandoffCapability());
		onMounted(async () => {
			pushConnectionStore.pushConnect();
			setupPostMessages();
			await initializeData();
			await initializeWorkflow();
		});
		watch(workflowId, async (newId, oldId) => {
			if (newId !== oldId && newId) await initializeWorkflow(true);
		}, { flush: "post" });
		watch(isDebugRoute, async (isDebug, wasDebug) => {
			if (isDebug && !wasDebug && !isLoading.value) await handleDebugModeRoute();
		}, { flush: "post" });
		onBeforeUnmount(() => {
			pushConnectionStore.pushDisconnect();
			cleanupPostMessages();
			cleanup();
		});
		return (_ctx, _cache) => {
			const _component_RouterView = resolveComponent("RouterView");
			return openBlock(), createBlock(BaseLayout_default, null, createSlots({
				header: withCtx(() => [createVNode(AppHeader_default)]),
				default: withCtx(() => [unref(isLoading) || !unref(currentWorkflowDocumentStore) && !unref(isOnboardingRoute) ? (openBlock(), createBlock(LoadingView_default, { key: 0 })) : (openBlock(), createBlock(_component_RouterView, { key: 1 }))]),
				_: 2
			}, [
				!unref(isCanvasOnly) ? {
					name: "sidebar",
					fn: withCtx(() => [createVNode(AppSidebar_default)]),
					key: "0"
				} : void 0,
				unref(layoutProps).logs ? {
					name: "footer",
					fn: withCtx(() => [createVNode(LogsPanel_default)]),
					key: "1"
				} : void 0,
				!unref(isCanvasOnly) ? {
					name: "overlays",
					fn: withCtx(() => [unref(assistantStore).isFloatingButtonShown ? (openBlock(), createBlock(AskAssistantFloatingButton_default, { key: 0 })) : createCommentVNode("", true), unref(chatHubPanelStore).isFloatingChatEnabled ? (openBlock(), createBlock(CanvasChatOverlay_default, { key: 1 })) : createCommentVNode("", true)]),
					key: "2"
				} : void 0
			]), 1024);
		};
	}
});
//#endregion
export { WorkflowLayout_default as default };
