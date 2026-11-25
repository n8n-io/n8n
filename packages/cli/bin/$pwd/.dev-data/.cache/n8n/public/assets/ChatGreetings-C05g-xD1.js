import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Pu as useElementSize, Qu as useSpeechSynthesis, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yu as useScroll, Zu as useSpeechRecognition, _p as normalizeClass, af as onBeforeMount, bd as I18nT, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, of as onBeforeUnmount, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Aa as isRegenerable, Ba as buildChatAttachmentUrl, Da as isEditable, Fa as unflattenModel, LM as N8nCallout_default, La as enrichMimeTypesWithExtensions, Na as splitMarkdownIntoChunks, Od as useWorkflowsStore, QM as useDeviceSupport, Ra as isFileAcceptedByAccept, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Vr as useClipboard, Xc as usePushConnectionStore, _N as N8nText_default, aN as N8nChatInput_default, bC as useRootStore, cN as Input_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, hM as N8nLink_default, jN as useI18n, ja as isWaitingForApproval, ka as isLlmProviderModel, mN as truncate, pu as providerDisplayNames, tN as N8nLoading_default, ua as useChatStore, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as ChatAgentAvatar_default } from "./ChatAgentAvatar-Cy6J2OZW.js";
import { t as ChatFile_default } from "./ChatFile-IZLktBVs.js";
import { t as ChatMarkdown_default } from "./ChatMarkdown-CnSVNFpG.js";
import { t as ToolsSelector_default } from "./ToolsSelector-7QdXnr0K.js";
//#region src/features/ai/chatHub/composables/useChatPushHandler.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Composable for handling chat stream messages received via WebSocket Push
*/
function useChatPushHandler() {
	const pushStore = usePushConnectionStore();
	const chatStore = useChatStore();
	const activeStreams = ref(/* @__PURE__ */ new Map());
	const removeEventListener = ref(null);
	const stopReconnectWatcher = ref(null);
	/**
	* Handle a chat execution begin event (whole streaming session starts)
	*/
	function handleExecutionBegin(event) {
		const { sessionId } = event.data;
		chatStore.handleWebSocketExecutionBegin({ sessionId });
	}
	/**
	* Handle a chat execution end event (whole streaming session ends)
	*/
	function handleExecutionEnd(event) {
		const { sessionId, status } = event.data;
		activeStreams.value.delete(sessionId);
		chatStore.handleWebSocketExecutionEnd({
			sessionId,
			status
		});
	}
	/**
	* Handle a chat stream begin event
	*/
	function handleStreamBegin(event) {
		const { sessionId, messageId, sequenceNumber, previousMessageId, retryOfMessageId } = event.data;
		activeStreams.value.set(sessionId, {
			sessionId,
			messageId,
			lastSequenceNumber: sequenceNumber,
			content: ""
		});
		if (chatStore.streaming?.sessionId === sessionId) {
			if (chatStore.streaming.messageId !== messageId) chatStore.streaming.messageId = messageId;
		}
		chatStore.handleWebSocketStreamBegin({
			sessionId,
			messageId,
			previousMessageId,
			retryOfMessageId
		});
	}
	/**
	* Handle a chat stream chunk event
	*/
	function handleStreamChunk(event) {
		const { sessionId, messageId, sequenceNumber, content } = event.data;
		const streamState = activeStreams.value.get(sessionId);
		if (!streamState || streamState.messageId !== messageId) return;
		if (sequenceNumber <= streamState.lastSequenceNumber) return;
		streamState.lastSequenceNumber = sequenceNumber;
		streamState.content += content;
		chatStore.handleWebSocketStreamChunk({
			sessionId,
			messageId,
			content
		});
	}
	/**
	* Handle a chat stream end event
	*/
	function handleStreamEnd(event) {
		const { sessionId, messageId, status } = event.data;
		activeStreams.value.delete(sessionId);
		chatStore.handleWebSocketStreamEnd({
			sessionId,
			messageId,
			status
		});
	}
	/**
	* Handle a chat stream error event
	*/
	function handleStreamError(event) {
		const { sessionId, messageId, error } = event.data;
		activeStreams.value.delete(sessionId);
		chatStore.handleWebSocketStreamError({
			sessionId,
			messageId,
			error
		});
	}
	/**
	* Handle a human message created event
	*/
	function handleHumanMessageCreated(event) {
		chatStore.handleHumanMessageCreated(event.data);
	}
	/**
	* Handle a message edited event
	*/
	function handleMessageEdited(event) {
		chatStore.handleMessageEdited(event.data);
	}
	/**
	* Handle WebSocket reconnection by catching up all active streams
	*/
	async function handleReconnect() {
		for (const [sessionId, streamState] of activeStreams.value.entries()) {
			const result = await chatStore.reconnectToStream(sessionId, streamState.lastSequenceNumber);
			if (result?.pendingChunks?.length) {
				for (const chunk of result.pendingChunks) if (chunk.sequenceNumber > streamState.lastSequenceNumber) streamState.lastSequenceNumber = chunk.sequenceNumber;
			}
		}
	}
	/**
	* Process a push message if it's a chat stream event
	*/
	function processMessage(event) {
		switch (event.type) {
			case "chatHubHumanMessageCreated":
				handleHumanMessageCreated(event);
				break;
			case "chatHubMessageEdited":
				handleMessageEdited(event);
				break;
			case "chatHubExecutionBegin":
				handleExecutionBegin(event);
				break;
			case "chatHubExecutionEnd":
				handleExecutionEnd(event);
				break;
			case "chatHubStreamBegin":
				handleStreamBegin(event);
				break;
			case "chatHubStreamChunk":
				handleStreamChunk(event);
				break;
			case "chatHubStreamEnd":
				handleStreamEnd(event);
				break;
			case "chatHubStreamError": handleStreamError(event);
		}
	}
	/**
	* Initialize the push handler and connect to WebSocket
	*/
	function initialize() {
		if (removeEventListener.value) return;
		pushStore.pushConnect();
		removeEventListener.value = pushStore.addEventListener(processMessage);
		stopReconnectWatcher.value = watch(() => pushStore.isConnected, async (isConnected, wasConnected) => {
			if (isConnected && !wasConnected) await handleReconnect();
		});
	}
	/**
	* Terminate the push handler and disconnect from WebSocket
	*/
	function terminate() {
		if (stopReconnectWatcher.value) {
			stopReconnectWatcher.value();
			stopReconnectWatcher.value = null;
		}
		if (removeEventListener.value) {
			removeEventListener.value();
			removeEventListener.value = null;
		}
		activeStreams.value.clear();
		pushStore.pushDisconnect();
	}
	/**
	* Get the current stream state for a session
	*/
	function getStreamState(sessionId) {
		return activeStreams.value.get(sessionId);
	}
	/**
	* Check if a session has an active stream
	*/
	function hasActiveStream(sessionId) {
		return !!activeStreams.value.get(sessionId);
	}
	/**
	* Initialize stream state for reconnection after page refresh.
	* This allows the push handler to receive future chunks for an existing stream.
	*/
	function initializeStreamState(sessionId, messageId, lastSequenceNumber) {
		activeStreams.value.set(sessionId, {
			sessionId,
			messageId,
			lastSequenceNumber,
			content: ""
		});
	}
	/**
	* Get the last received sequence number for a session
	*/
	function getLastSequenceNumber(sessionId) {
		return activeStreams.value.get(sessionId)?.lastSequenceNumber ?? 0;
	}
	return {
		activeStreams,
		initialize,
		terminate,
		getStreamState,
		hasActiveStream,
		getLastSequenceNumber,
		initializeStreamState
	};
}
//#endregion
//#region src/features/ai/chatHub/composables/useChatSession.ts
init_runtime_core_esm_bundler();
function useChatSession(options) {
	const { sessionId, scrollableRef, extendMessagingState, shouldSkipScroll } = options;
	const chatStore = useChatStore();
	const chatPushHandler = useChatPushHandler();
	onBeforeMount(() => {
		chatPushHandler.initialize();
	});
	onBeforeUnmount(() => {
		chatPushHandler.terminate();
	});
	const chatMessages = computed(() => chatStore.getActiveMessages(sessionId.value));
	const isResponding = computed(() => chatStore.isResponding(sessionId.value));
	const isNewSession = options.isNewSession ?? computed(() => chatMessages.value.length === 0);
	const messagingState = computed(() => {
		if (chatStore.streaming?.sessionId === sessionId.value) return chatStore.streaming.messageId ? "receiving" : "waitingFirstChunk";
		if (isWaitingForApproval(chatStore.lastMessage(sessionId.value))) return "waitingForApproval";
		if (extendMessagingState) {
			const extended = extendMessagingState();
			if (extended !== null) return extended;
		}
		return "idle";
	});
	const scrollContainerRef = computed(() => scrollableRef.value?.parentElement ?? null);
	const { arrivedState, measure } = useScroll(scrollContainerRef, {
		throttle: 100,
		offset: { bottom: 100 }
	});
	function scrollToBottom(smooth) {
		scrollContainerRef.value?.scrollTo({
			top: scrollableRef.value?.scrollHeight,
			behavior: smooth ? "smooth" : "instant"
		});
	}
	function scrollToMessage(messageId) {
		scrollableRef.value?.querySelector(`[data-message-id="${messageId}"]`)?.scrollIntoView({ behavior: "smooth" });
	}
	/**
	* Fetch messages for a session and reconnect to any active stream.
	* Throws on failure so callers can handle errors differently.
	*/
	async function loadSession(targetSessionId) {
		if (!chatStore.getConversation(targetSessionId)) await chatStore.fetchMessages(targetSessionId);
		const result = await chatStore.reconnectToStream(targetSessionId, 0);
		if (result?.hasActiveStream && result.currentMessageId) chatPushHandler.initializeStreamState(targetSessionId, result.currentMessageId, result.lastSequenceNumber);
	}
	watch(() => chatMessages.value[chatMessages.value.length - 1]?.id, (lastMessageId) => {
		if (!lastMessageId) return;
		if (shouldSkipScroll?.()) return;
		nextTick(measure);
		if (chatStore.streaming?.sessionId === sessionId.value) {
			scrollToMessage(chatStore.streaming.promptId);
			return;
		}
		scrollToBottom(false);
	}, {
		immediate: true,
		flush: "post"
	});
	return {
		chatMessages,
		isResponding,
		isNewSession,
		messagingState,
		scrollContainerRef,
		arrivedState,
		scrollToBottom,
		scrollToMessage,
		loadSession
	};
}
var ChatTypingIndicator_vue_vue_type_style_index_0_lang_module_default = {
	typing: "_typing_1ildu_450",
	typingBlink: "_typingBlink_1ildu_1",
	shimmer: "_shimmer_1ildu_1",
	spin: "_spin_1ildu_1",
	"skeleton-pulse": "_skeleton-pulse_1ildu_1",
	opacityPulse: "_opacityPulse_1ildu_1",
	popoverIn: "_popoverIn_1ildu_1",
	fadeIn: "_fadeIn_1ildu_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1ildu_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1ildu_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1ildu_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1ildu_1",
	blurSwapIn: "_blurSwapIn_1ildu_1",
	blurSwapOut: "_blurSwapOut_1ildu_1",
	pulse: "_pulse_1ildu_1",
	pulseGlow: "_pulseGlow_1ildu_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1ildu_1",
	fade: "_fade_1ildu_1",
	fadeInUp: "_fadeInUp_1ildu_1",
	fadeInDown: "_fadeInDown_1ildu_1",
	fadeInLeft: "_fadeInLeft_1ildu_1",
	fadeInRight: "_fadeInRight_1ildu_1",
	fadeOut: "_fadeOut_1ildu_1",
	fadeOutDown: "_fadeOutDown_1ildu_1",
	fadeOutUp: "_fadeOutUp_1ildu_1",
	fadeOutLeft: "_fadeOutLeft_1ildu_1",
	fadeOutRight: "_fadeOutRight_1ildu_1",
	ping: "_ping_1ildu_1",
	blinkBackground: "_blinkBackground_1ildu_1"
};
//#endregion
//#region src/features/ai/chatHub/components/ChatTypingIndicator.vue
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _sfc_main = {};
function _sfc_render(_ctx, _cache) {
	return openBlock(), createElementBlock("span", {
		class: normalizeClass(_ctx.$style.typing),
		"data-test-id": "chat-typing-indicator"
	}, [..._cache[0] || (_cache[0] = [
		createBaseVNode("i", null, null, -1),
		createBaseVNode("i", null, null, -1),
		createBaseVNode("i", null, null, -1)
	])], 2);
}
var ChatTypingIndicator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main, [["render", _sfc_render], ["__cssModules", { "$style": ChatTypingIndicator_vue_vue_type_style_index_0_lang_module_default }]]);
//#endregion
//#region src/features/ai/chatHub/components/CopyButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CopyButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CopyButton",
	props: { content: {} },
	setup(__props) {
		const i18n = useI18n();
		const clipboard = useClipboard();
		const justCopied = ref(false);
		const copyTooltip = computed(() => {
			return justCopied.value ? i18n.baseText("generic.copied") : i18n.baseText("generic.copy");
		});
		async function handleCopy() {
			await clipboard.copy(__props.content);
			justCopied.value = true;
			setTimeout(() => {
				justCopied.value = false;
			}, 1e3);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				placement: "bottom",
				"show-after": 300
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(copyTooltip.value), 1)]),
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "ghost",
					icon: justCopied.value ? "check" : "copy",
					size: "small",
					"icon-size": "medium",
					class: normalizeClass(_ctx.$style.button),
					tabindex: "0",
					"aria-label": copyTooltip.value,
					onClick: handleCopy
				}, null, 8, [
					"icon",
					"class",
					"aria-label"
				])]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": { button: "_button_1wpmk_1" } }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatMessageActions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatMessageActions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatMessageActions",
	props: {
		message: {},
		isSpeechSynthesisAvailable: { type: Boolean },
		isSpeaking: { type: Boolean },
		hasSessionStreaming: { type: Boolean }
	},
	emits: [
		"edit",
		"regenerate",
		"switchAlternative",
		"readAloud"
	],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const router = useRouter();
		const workflowsStore = useWorkflowsStore();
		const emit = __emit;
		const currentAlternativeIndex = computed(() => {
			return __props.message.alternatives.findIndex((id) => id === __props.message.id);
		});
		const text = computed(() => __props.message.content.map((c) => c.content).join("\n\n"));
		const executionUrl = computed(() => {
			if (workflowsStore.canViewWorkflows && __props.message.type === "ai" && __props.message.provider === "n8n" && __props.message.executionId) return router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId: __props.message.workflowId,
					executionId: __props.message.executionId
				}
			}).href;
		});
		const canEdit = computed(() => isEditable(__props.message));
		const canRegenerate = computed(() => isRegenerable(__props.message));
		function handleEdit() {
			emit("edit");
		}
		function handleRegenerate() {
			emit("regenerate");
		}
		function handleReadAloud() {
			emit("readAloud");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.actions),
				"data-test-id": "chat-message-actions"
			}, [
				createVNode(CopyButton_default, {
					content: text.value,
					"data-test-id": "chat-message-copy"
				}, null, 8, ["content"]),
				__props.isSpeechSynthesisAvailable && __props.message.type === "ai" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					placement: "bottom",
					"show-after": 300
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(__props.isSpeaking ? unref(i18n).baseText("chatHub.message.actions.stopReading") : unref(i18n).baseText("chatHub.message.actions.readAloud")), 1)]),
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: __props.isSpeaking ? "volume-x" : "volume-2",
						size: "medium",
						onClick: handleReadAloud
					}, null, 8, ["icon"])]),
					_: 1
				})) : createCommentVNode("", true),
				canEdit.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					placement: "bottom",
					"show-after": 300
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.message.actions.edit")), 1)]),
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "pen",
						size: "medium",
						"data-test-id": "chat-message-edit",
						disabled: __props.hasSessionStreaming,
						onClick: handleEdit
					}, null, 8, ["disabled"])]),
					_: 1
				})) : createCommentVNode("", true),
				canRegenerate.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 2,
					placement: "bottom",
					"show-after": 300
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.message.actions.regenerate")), 1)]),
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "refresh-cw",
						size: "medium",
						"data-test-id": "chat-message-regenerate",
						disabled: __props.hasSessionStreaming,
						onClick: handleRegenerate
					}, null, 8, ["disabled"])]),
					_: 1
				})) : createCommentVNode("", true),
				executionUrl.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 3,
					placement: "bottom",
					"show-after": 300
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.message.actions.executionId")) + ": ", 1), createVNode(unref(N8nLink_default), {
						to: executionUrl.value,
						"new-window": true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.message.executionId), 1)]),
						_: 1
					}, 8, ["to"])]),
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "info",
						size: "medium",
						"data-test-id": "chat-message-info"
					})]),
					_: 1
				})) : createCommentVNode("", true),
				__props.message.alternatives.length > 1 ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
					createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "chevron-left",
						size: "medium",
						disabled: __props.hasSessionStreaming || currentAlternativeIndex.value === 0,
						"data-test-id": "chat-message-prev-alternative",
						onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("switchAlternative", __props.message.alternatives[currentAlternativeIndex.value - 1]))
					}, null, 8, ["disabled"]),
					createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(`${currentAlternativeIndex.value + 1}/${__props.message.alternatives.length}`), 1)]),
						_: 1
					}),
					createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "chevron-right",
						size: "medium",
						disabled: __props.hasSessionStreaming || currentAlternativeIndex.value === __props.message.alternatives.length - 1,
						"data-test-id": "chat-message-next-alternative",
						onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("switchAlternative", __props.message.alternatives[currentAlternativeIndex.value + 1]))
					}, null, 8, ["disabled"])
				], 64)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": { actions: "_actions_14q4w_1" } }], ["__scopeId", "data-v-1effe526"]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatButtons.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ChatButtons_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatButtons",
	props: {
		buttons: {},
		isDisabled: { type: Boolean }
	},
	setup(__props) {
		const clickedButtonIndex = ref(null);
		const isLoading = ref(false);
		async function onClick(link, index) {
			if (__props.isDisabled || clickedButtonIndex.value !== null || isLoading.value) return;
			isLoading.value = true;
			try {
				if ((await fetch(link)).ok) clickedButtonIndex.value = index;
			} finally {
				isLoading.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.buttons) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.buttons, (button, index) => {
				return openBlock(), createElementBlock(Fragment, { key: button.link }, [clickedButtonIndex.value === null || index === clickedButtonIndex.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					type: button.type,
					disabled: __props.isDisabled || isLoading.value || clickedButtonIndex.value !== null,
					loading: isLoading.value && clickedButtonIndex.value === null,
					size: "small",
					onClick: ($event) => onClick(button.link, index)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(button.text), 1)]),
					_: 2
				}, 1032, [
					"type",
					"disabled",
					"loading",
					"onClick"
				])) : createCommentVNode("", true)], 64);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": { buttons: "_buttons_f5szf_1" } }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatMarkdownChunk.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = { key: 2 };
var ChatMarkdownChunk_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatMarkdownChunk",
	props: {
		source: {},
		singlePre: {
			type: Boolean,
			default: false
		},
		isButtonsDisabled: {
			type: Boolean,
			default: false
		},
		footnoteStyle: { default: "pill" }
	},
	emits: ["openArtifact"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		return (_ctx, _cache) => {
			return __props.source.type === "text" ? (openBlock(), createBlock(ChatMarkdown_default, {
				key: 0,
				content: __props.source.content,
				"single-pre": __props.singlePre,
				options: {
					math: true,
					footnotes: __props.footnoteStyle
				}
			}, null, 8, [
				"content",
				"single-pre",
				"options"
			])) : __props.source.type === "with-buttons" ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.container)
			}, [createVNode(ChatMarkdown_default, {
				content: __props.source.content,
				options: {
					math: true,
					footnotes: __props.footnoteStyle
				}
			}, null, 8, ["content", "options"]), createVNode(ChatButtons_default, {
				buttons: __props.source.buttons,
				"is-disabled": __props.isButtonsDisabled
			}, null, 8, ["buttons", "is-disabled"])], 2)) : __props.source.type === "hidden" ? (openBlock(), createElementBlock("div", _hoisted_1$3)) : __props.source.type === "artifact-edit" && !__props.source.isIncomplete ? (openBlock(), createElementBlock("button", {
				key: 3,
				class: normalizeClass(_ctx.$style.command),
				onClick: _cache[0] || (_cache[0] = ($event) => emit("openArtifact", __props.source.command.title))
			}, [_cache[2] || (_cache[2] = createTextVNode(" Updated ", -1)), createBaseVNode("b", null, toDisplayString(__props.source.command.title), 1)], 2)) : __props.source.type === "artifact-create" && !__props.source.isIncomplete ? (openBlock(), createElementBlock("button", {
				key: 4,
				class: normalizeClass(_ctx.$style.command),
				onClick: _cache[1] || (_cache[1] = ($event) => emit("openArtifact", __props.source.command.title))
			}, [_cache[3] || (_cache[3] = createTextVNode(" Created ", -1)), createBaseVNode("b", null, toDisplayString(__props.source.command.title), 1)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_fy8ww_1",
	command: "_command_fy8ww_9"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatMessage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = ["data-message-id", "data-test-id"];
var _hoisted_2 = ["accept"];
var _hoisted_3 = { key: 1 };
var ChatMessage_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatMessage",
	props: {
		message: {},
		compact: { type: Boolean },
		isEditing: { type: Boolean },
		isEditSubmitting: { type: Boolean },
		hasSessionStreaming: { type: Boolean },
		cachedAgentDisplayName: {},
		cachedAgentIcon: {},
		acceptedMimeTypes: {},
		minHeight: {}
	},
	emits: [
		"startEdit",
		"cancelEdit",
		"update",
		"regenerate",
		"switchAlternative",
		"openArtifact"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const chatStore = useChatStore();
		const rootStore = useRootStore();
		const { isCtrlKeyPressed } = useDeviceSupport();
		const i18n = useI18n();
		const editedText = ref("");
		const newFiles = ref([]);
		const removedExistingIndices = ref(/* @__PURE__ */ new Set());
		const fileInputRef = useTemplateRef("fileInputRef");
		const textareaRef = useTemplateRef("textarea");
		const attachmentsRef = useTemplateRef("attachmentsRef");
		const attachmentsElSize = useElementSize(attachmentsRef, void 0, { box: "border-box" });
		const messageChunks = computed(() => __props.message.content.flatMap((chunk, index, arr) => {
			if (chunk.type === "hidden") return [];
			if (chunk.type === "with-buttons") return [chunk];
			if (chunk.type === "artifact-create" || chunk.type === "artifact-edit") {
				const prev = arr[index - 1];
				return prev?.type === chunk.type && prev.command.title === chunk.command.title ? [] : [chunk];
			}
			if (__props.message.status === "error" && !chunk.content) return [{
				type: "text",
				content: i18n.baseText("chatHub.message.error.unknown")
			}];
			if (/\[\^[^\]]+\]/.test(chunk.content)) return [{
				type: "text",
				content: chunk.content
			}];
			return splitMarkdownIntoChunks(chunk.content).flatMap((content) => content.trim() === "" ? [] : [{
				type: "text",
				content
			}]);
		}));
		const text = computed(() => messageChunks.value.flatMap((chunk) => chunk.type === "text" ? [chunk.content] : []).join(""));
		const speech = useSpeechSynthesis(text, {
			pitch: 1,
			rate: 1,
			volume: 1
		});
		const agent = computed(() => {
			const model = unflattenModel(__props.message);
			if (!model) return null;
			return chatStore.getAgent(model, {
				name: __props.cachedAgentDisplayName,
				icon: __props.cachedAgentIcon
			});
		});
		const attachments = computed(() => __props.message.attachments.map(({ fileName, mimeType }, index) => ({
			file: new File([], fileName ?? "file", { type: mimeType }),
			downloadUrl: buildChatAttachmentUrl(rootStore.restApiContext, __props.message.sessionId, __props.message.id, index)
		})));
		const mergedAttachments = computed(() => [...attachments.value.flatMap(({ downloadUrl, file }, idx) => removedExistingIndices.value.has(idx) ? [] : [{
			isNew: false,
			file,
			index: idx,
			downloadUrl
		}]), ...newFiles.value.map((file, index) => ({
			isNew: true,
			file,
			index
		}))]);
		const enrichedAcceptedMimeTypes = computed(() => enrichMimeTypesWithExtensions(__props.acceptedMimeTypes));
		const hideMessage = computed(() => {
			return __props.message.status === "success" && text.value === "" && !__props.message.content.some((c) => c.type === "with-buttons");
		});
		const shouldShowTypingIndicator = computed(() => __props.message.status === "running");
		function handleEdit() {
			emit("startEdit");
		}
		function handleCancelEdit() {
			emit("cancelEdit");
		}
		function handleConfirmEdit() {
			if (!editedText.value.trim()) return;
			const keptAttachmentIndices = __props.message.attachments.map((_, idx) => idx).filter((idx) => !removedExistingIndices.value.has(idx));
			emit("update", editedText.value, keptAttachmentIndices, newFiles.value);
		}
		function handleAttachClick() {
			fileInputRef.value?.click();
		}
		function handleFileSelect(e) {
			const target = e.target;
			const files = target.files;
			if (!files || files.length === 0) return;
			for (const file of Array.from(files)) newFiles.value.push(file);
			if (target) target.value = "";
		}
		function handleRemoveFile(file) {
			if (file.isNew) {
				newFiles.value = newFiles.value.filter((_, idx) => idx !== file.index);
				return;
			}
			removedExistingIndices.value.add(file.index);
		}
		function addFiles(files) {
			for (const file of files) newFiles.value.push(file);
		}
		__expose({ addFiles });
		function handleKeydownTextarea(e) {
			if (e.key === "Escape") {
				emit("cancelEdit");
				return;
			}
			const trimmed = editedText.value.trim();
			if (e.key === "Enter" && isCtrlKeyPressed(e) && !e.isComposing && trimmed) {
				e.preventDefault();
				handleConfirmEdit();
			}
		}
		function handleRegenerate() {
			emit("regenerate", __props.message);
		}
		function handleReadAloud() {
			if (speech.isSupported.value) {
				if (speech.isPlaying.value) speech.stop();
				else speech.speak();
			}
		}
		function handleSwitchAlternative(messageId) {
			emit("switchAlternative", messageId);
		}
		watch(() => __props.isEditing, (editing) => {
			editedText.value = editing ? text.value : "";
			newFiles.value = [];
			removedExistingIndices.value = /* @__PURE__ */ new Set();
		}, { immediate: true });
		watch(textareaRef, async (textarea) => {
			if (textarea) {
				await new Promise((r) => setTimeout(r, 0));
				textarea.focus();
				textarea.$el.scrollIntoView({ block: "nearest" });
			}
		}, {
			immediate: true,
			flush: "post"
		});
		onBeforeMount(() => {
			speech.stop();
		});
		return (_ctx, _cache) => {
			return !hideMessage.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass([
					_ctx.$style.message,
					__props.message.type === "human" ? _ctx.$style.user : _ctx.$style.assistant,
					{ [_ctx.$style.compact]: __props.compact }
				]),
				style: normalizeStyle({ minHeight: __props.minHeight ? `${__props.minHeight}px` : void 0 }),
				"data-message-id": __props.message.id,
				"data-test-id": `chat-message-${__props.message.id}`
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.avatar) }, [__props.message.type === "human" ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				icon: "user",
				width: "20",
				height: "20"
			})) : (openBlock(), createBlock(ChatAgentAvatar_default, {
				key: 1,
				agent: agent.value,
				size: "md",
				tooltip: ""
			}, null, 8, ["agent"]))], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [__props.message.type === "human" ? (openBlock(), createElementBlock("input", {
				key: 0,
				ref_key: "fileInputRef",
				ref: fileInputRef,
				type: "file",
				"data-test-id": "message-edit-file-input",
				class: normalizeClass(_ctx.$style.fileInput),
				accept: enrichedAcceptedMimeTypes.value,
				multiple: "",
				onChange: handleFileSelect
			}, null, 42, _hoisted_2)) : createCommentVNode("", true), __props.isEditing ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.editContainer),
				style: normalizeStyle({ "--attachments--height": `${unref(attachmentsElSize).height.value}px` })
			}, [
				__props.message.type === "human" && mergedAttachments.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					ref_key: "attachmentsRef",
					ref: attachmentsRef,
					class: normalizeClass(_ctx.$style.attachments)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(mergedAttachments.value, (attachment, index) => {
					return openBlock(), createBlock(ChatFile_default, {
						key: index,
						file: attachment.file,
						"is-removable": "",
						href: attachment.isNew ? void 0 : attachment.downloadUrl,
						onRemove: ($event) => handleRemoveFile(attachment)
					}, null, 8, [
						"file",
						"href",
						"onRemove"
					]);
				}), 128))], 2)) : createCommentVNode("", true),
				createVNode(unref(Input_default), {
					ref: "textarea",
					modelValue: editedText.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => editedText.value = $event),
					type: "textarea",
					autosize: {
						minRows: 1,
						maxRows: 20
					},
					class: normalizeClass(_ctx.$style.textarea),
					onKeydown: handleKeydownTextarea
				}, null, 8, ["modelValue", "class"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.editFooter) }, [__props.message.type === "human" ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					variant: "ghost",
					icon: "paperclip",
					onClick: withModifiers(handleAttachClick, ["stop"])
				})) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.editActions) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					onClick: handleCancelEdit
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.message.edit.cancel")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "small",
					disabled: !editedText.value.trim() || __props.isEditSubmitting,
					loading: __props.isEditSubmitting,
					onClick: handleConfirmEdit
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.message.edit.send")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])], 2)], 2)
			], 6)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [createBaseVNode("div", {
				"data-test-id": "chat-message-content",
				class: normalizeClass([_ctx.$style.chatMessage, { [_ctx.$style.errorMessage]: __props.message.status === "error" }])
			}, [attachments.value.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.attachments)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(attachments.value, (attachment, index) => {
				return openBlock(), createBlock(ChatFile_default, {
					key: index,
					file: attachment.file,
					"is-removable": false,
					href: attachment.downloadUrl
				}, null, 8, ["file", "href"]);
			}), 128))], 2)) : createCommentVNode("", true), __props.message.type === "human" ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(text.value), 1)) : (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.markdownContent)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(messageChunks.value, (chunk, index) => {
				return openBlock(), createBlock(ChatMarkdownChunk_default, {
					key: index,
					source: chunk,
					"is-buttons-disabled": __props.message.status !== "waiting",
					onOpenArtifact: _cache[1] || (_cache[1] = ($event) => emit("openArtifact", $event))
				}, null, 8, ["source", "is-buttons-disabled"]);
			}), 128))], 2))], 2), shouldShowTypingIndicator.value ? (openBlock(), createBlock(ChatTypingIndicator_default, {
				key: 0,
				class: normalizeClass(_ctx.$style.typingIndicator)
			}, null, 8, ["class"])) : (openBlock(), createBlock(ChatMessageActions_default, {
				key: 1,
				"is-speech-synthesis-available": unref(speech).isSupported.value,
				"is-speaking": unref(speech).isPlaying.value,
				class: normalizeClass(_ctx.$style.actions),
				message: __props.message,
				"has-session-streaming": __props.hasSessionStreaming,
				onEdit: handleEdit,
				onRegenerate: handleRegenerate,
				onReadAloud: handleReadAloud,
				onSwitchAlternative: handleSwitchAlternative
			}, null, 8, [
				"is-speech-synthesis-available",
				"is-speaking",
				"class",
				"message",
				"has-session-streaming"
			]))], 64))], 2)], 14, _hoisted_1$2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	message: "_message_7n4q6_1",
	markdownContent: "_markdownContent_7n4q6_6",
	avatar: "_avatar_7n4q6_22",
	compact: "_compact_7n4q6_35",
	content: "_content_7n4q6_41",
	actions: "_actions_7n4q6_47",
	attachments: "_attachments_7n4q6_53",
	chatMessage: "_chatMessage_7n4q6_58",
	editContainer: "_editContainer_7n4q6_61",
	user: "_user_7n4q6_77",
	errorMessage: "_errorMessage_7n4q6_88",
	textarea: "_textarea_7n4q6_120",
	fileInput: "_fileInput_7n4q6_133",
	editFooter: "_editFooter_7n4q6_137",
	editActions: "_editActions_7n4q6_151",
	typingIndicator: "_typingIndicator_7n4q6_157"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatPromptCallouts.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var ChatPromptCallouts_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatPromptCallouts",
	props: {
		showMissingAgentCallout: { type: Boolean },
		showMissingCredentialsCallout: { type: Boolean },
		showDynamicCredentialsMissingCallout: { type: Boolean },
		showCreditsClaimedCallout: { type: Boolean },
		isNewSession: { type: Boolean },
		llmProvider: {},
		aiCreditsQuota: {},
		compact: { type: Boolean }
	},
	emits: [
		"selectModel",
		"setCredentials",
		"dismissCreditsCallout",
		"openDynamicCredentials"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return __props.showMissingAgentCallout ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				icon: "info",
				theme: "secondary",
				class: normalizeClass([_ctx.$style.callout, { [_ctx.$style.calloutCompact]: __props.compact }])
			}, {
				default: withCtx(() => [createVNode(unref(I18nT), {
					keypath: __props.isNewSession ? "chatHub.chat.prompt.callout.selectModel.new" : "chatHub.chat.prompt.callout.selectModel.existing",
					tag: "span",
					scope: "global"
				}, {
					link: withCtx(() => [createBaseVNode("a", {
						href: "",
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("selectModel"), ["prevent"]))
					}, toDisplayString(unref(i18n).baseText(__props.isNewSession ? "chatHub.chat.prompt.callout.selectModel.new.link" : "chatHub.chat.prompt.callout.selectModel.existing.link")), 1)]),
					_: 1
				}, 8, ["keypath"])]),
				_: 1
			}, 8, ["class"])) : __props.showMissingCredentialsCallout ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 1,
				icon: "info",
				theme: "secondary",
				class: normalizeClass([_ctx.$style.callout, { [_ctx.$style.calloutCompact]: __props.compact }])
			}, {
				default: withCtx(() => [createVNode(unref(I18nT), {
					keypath: __props.isNewSession ? "chatHub.chat.prompt.callout.setCredentials.new" : "chatHub.chat.prompt.callout.setCredentials.existing",
					tag: "span",
					scope: "global"
				}, {
					link: withCtx(() => [createBaseVNode("a", {
						href: "",
						onClick: _cache[1] || (_cache[1] = withModifiers(($event) => emit("setCredentials", __props.llmProvider), ["prevent"]))
					}, toDisplayString(unref(i18n).baseText(__props.isNewSession ? "chatHub.chat.prompt.callout.setCredentials.new.link" : "chatHub.chat.prompt.callout.setCredentials.existing.link")), 1)]),
					provider: withCtx(() => [createTextVNode(toDisplayString(unref(providerDisplayNames)[__props.llmProvider]), 1)]),
					_: 1
				}, 8, ["keypath"])]),
				_: 1
			}, 8, ["class"])) : __props.showDynamicCredentialsMissingCallout ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 2,
				theme: "warning",
				class: normalizeClass([_ctx.$style.callout, { [_ctx.$style.calloutCompact]: __props.compact }]),
				"data-testid": "dynamic-credentials-missing-callout"
			}, {
				trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
					type: "warning",
					"native-type": "button",
					size: "small",
					"data-testid": "dynamic-credentials-connect-button",
					onClick: _cache[2] || (_cache[2] = ($event) => emit("openDynamicCredentials"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.chat.prompt.callout.dynamicCredentials.missing.button")), 1)]),
					_: 1
				})]),
				default: withCtx(() => [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(__props.isNewSession ? "chatHub.chat.prompt.callout.dynamicCredentials.missing" : "chatHub.chat.prompt.callout.dynamicCredentials.expired")), 1)]),
					_: 1
				})]),
				_: 1
			}, 8, ["class"])) : __props.showCreditsClaimedCallout ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 3,
				icon: "info",
				theme: "secondary",
				class: normalizeClass([_ctx.$style.callout, { [_ctx.$style.calloutCompact]: __props.compact }])
			}, {
				trailingContent: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "x",
					title: unref(i18n).baseText("generic.dismiss"),
					size: "medium",
					type: "secondary",
					onClick: _cache[3] || (_cache[3] = ($event) => emit("dismissCreditsCallout"))
				}, null, 8, ["title"])]),
				default: withCtx(() => [
					createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("freeAi.credits.callout.success.chatHub.beginning")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), { bold: "" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("freeAi.credits.callout.success.chatHub.credits", { interpolate: { amount: __props.aiCreditsQuota } })), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("freeAi.credits.callout.success.chatHub.end")), 1)]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	callout: "_callout_1s1u1_1",
	calloutCompact: "_calloutCompact_1s1u1_7"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatPromptCompact.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["accept"];
var ChatPromptCompact_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatPromptCompact",
	props: {
		message: {},
		attachments: {},
		placeholder: {},
		messagingState: {},
		acceptedMimeTypes: {},
		canUploadFiles: { type: Boolean },
		isSpeechSupported: { type: Boolean },
		isListening: { type: Boolean }
	},
	emits: [
		"submit",
		"update:message",
		"fileSelect",
		"attach",
		"mic",
		"stop",
		"removeAttachment"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const inputRef = useTemplateRef("inputRef");
		const fileInputRef = useTemplateRef("fileInputRef");
		__expose({
			inputRef,
			fileInputRef
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("form", {
				class: normalizeClass(_ctx.$style.prompt),
				onSubmit: _cache[7] || (_cache[7] = withModifiers(($event) => emit("submit"), ["prevent"]))
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inputWrap) }, [
				renderSlot(_ctx.$slots, "callouts"),
				createBaseVNode("input", {
					ref_key: "fileInputRef",
					ref: fileInputRef,
					type: "file",
					class: normalizeClass(_ctx.$style.fileInput),
					accept: __props.acceptedMimeTypes,
					multiple: "",
					onChange: _cache[0] || (_cache[0] = ($event) => emit("fileSelect", $event))
				}, null, 42, _hoisted_1$1),
				createVNode(unref(N8nChatInput_default), {
					ref_key: "inputRef",
					ref: inputRef,
					"model-value": props.message,
					placeholder: __props.placeholder,
					streaming: __props.messagingState === "receiving",
					disabled: __props.messagingState !== "idle",
					"submit-disabled": __props.messagingState !== "idle" || !__props.message.trim(),
					autosize: {
						minRows: 1,
						maxRows: 3
					},
					"send-button-test-id": "chat-hub-send-message-button",
					"stop-button-test-id": "chat-hub-send-message-button",
					autofocus: "",
					"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => emit("update:message", $event)),
					onSubmit: _cache[5] || (_cache[5] = ($event) => emit("submit")),
					onStop: _cache[6] || (_cache[6] = ($event) => emit("stop"))
				}, {
					leading: withCtx(() => [__props.attachments.length > 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.compactAttachments)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.attachments, (file, index) => {
						return openBlock(), createBlock(ChatFile_default, {
							key: index,
							file,
							"is-previewable": true,
							"is-removable": __props.messagingState === "idle",
							onRemove: _cache[1] || (_cache[1] = ($event) => emit("removeAttachment", $event))
						}, null, 8, ["file", "is-removable"]);
					}), 128))], 2)) : createCommentVNode("", true)]),
					"right-actions": withCtx(() => [createVNode(unref(N8nTooltip_default), {
						content: !__props.canUploadFiles ? unref(i18n).baseText("chatHub.chat.prompt.button.attach.disabled") : unref(i18n).baseText("chatHub.chat.prompt.button.attach"),
						disabled: __props.canUploadFiles && __props.messagingState === "idle",
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							disabled: __props.messagingState !== "idle" || !__props.canUploadFiles,
							icon: "paperclip",
							"icon-size": "large",
							onClick: _cache[2] || (_cache[2] = withModifiers(($event) => emit("attach"), ["stop"]))
						}, null, 8, ["disabled"])]),
						_: 1
					}, 8, ["content", "disabled"]), __props.isSpeechSupported ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("chatHub.chat.prompt.button.voiceInput"),
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							disabled: __props.messagingState !== "idle",
							icon: __props.isListening ? "square" : "mic",
							class: normalizeClass({ [_ctx.$style.recording]: __props.isListening }),
							"icon-size": "large",
							onClick: _cache[3] || (_cache[3] = withModifiers(($event) => emit("mic"), ["stop"]))
						}, null, 8, [
							"disabled",
							"icon",
							"class"
						])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"model-value",
					"placeholder",
					"streaming",
					"disabled",
					"submit-disabled"
				])
			], 2)], 34);
		};
	}
}), [["__cssModules", { "$style": {
	prompt: "_prompt_g90uq_1",
	inputWrap: "_inputWrap_g90uq_2",
	fileInput: "_fileInput_g90uq_6",
	compactAttachments: "_compactAttachments_g90uq_10",
	recording: "_recording_g90uq_16"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatPromptFull.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["accept"];
var ChatPromptFull_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatPromptFull",
	props: {
		message: {},
		attachments: {},
		placeholder: {},
		messagingState: {},
		acceptedMimeTypes: {},
		canUploadFiles: { type: Boolean },
		isSpeechSupported: { type: Boolean },
		isListening: { type: Boolean },
		checkedToolIds: {},
		customAgentId: {},
		isToolsSelectable: { type: Boolean },
		selectedModel: {}
	},
	emits: [
		"submit",
		"update:message",
		"fileSelect",
		"attach",
		"mic",
		"stop",
		"removeAttachment",
		"toolToggle"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const inputRef = useTemplateRef("inputRef");
		const fileInputRef = useTemplateRef("fileInputRef");
		__expose({
			inputRef,
			fileInputRef
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("form", {
				class: normalizeClass(_ctx.$style.prompt),
				onSubmit: _cache[8] || (_cache[8] = withModifiers(($event) => emit("submit"), ["prevent"]))
			}, [
				createBaseVNode("input", {
					ref_key: "fileInputRef",
					ref: fileInputRef,
					type: "file",
					class: normalizeClass(_ctx.$style.fileInput),
					accept: __props.acceptedMimeTypes,
					multiple: "",
					onChange: _cache[0] || (_cache[0] = ($event) => emit("fileSelect", $event))
				}, null, 42, _hoisted_1),
				renderSlot(_ctx.$slots, "callouts"),
				createVNode(unref(N8nChatInput_default), {
					ref_key: "inputRef",
					ref: inputRef,
					"model-value": props.message,
					placeholder: __props.placeholder,
					streaming: __props.messagingState === "receiving",
					disabled: __props.messagingState !== "idle",
					"submit-disabled": __props.messagingState !== "idle" || !__props.message.trim(),
					autosize: {
						minRows: 1,
						maxRows: 6
					},
					"send-button-test-id": "chat-hub-send-message-button",
					"stop-button-test-id": "chat-hub-send-message-button",
					autofocus: "",
					"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => emit("update:message", $event)),
					onSubmit: _cache[6] || (_cache[6] = ($event) => emit("submit")),
					onStop: _cache[7] || (_cache[7] = ($event) => emit("stop"))
				}, {
					leading: withCtx(() => [__props.attachments.length > 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.attachments)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.attachments, (file, index) => {
						return openBlock(), createBlock(ChatFile_default, {
							key: index,
							file,
							"is-previewable": true,
							"is-removable": __props.messagingState === "idle",
							onRemove: _cache[1] || (_cache[1] = ($event) => emit("removeAttachment", $event))
						}, null, 8, ["file", "is-removable"]);
					}), 128))], 2)) : createCommentVNode("", true)]),
					"left-actions": withCtx(() => [createVNode(ToolsSelector_default, {
						class: normalizeClass(_ctx.$style.toolsButton),
						"checked-tool-ids": __props.checkedToolIds,
						"custom-agent-id": __props.customAgentId,
						disabled: __props.messagingState !== "idle" || !__props.isToolsSelectable,
						"disabled-tooltip": __props.isToolsSelectable ? void 0 : __props.selectedModel ? unref(i18n).baseText("chatHub.tools.selector.disabled.tooltip") : unref(i18n).baseText("chatHub.tools.selector.disabled.noModel.tooltip"),
						onToggle: _cache[2] || (_cache[2] = ($event) => emit("toolToggle", $event))
					}, null, 8, [
						"class",
						"checked-tool-ids",
						"custom-agent-id",
						"disabled",
						"disabled-tooltip"
					])]),
					"right-actions": withCtx(() => [createVNode(unref(N8nTooltip_default), {
						content: !__props.canUploadFiles ? unref(i18n).baseText("chatHub.chat.prompt.button.attach.disabled") : unref(i18n).baseText("chatHub.chat.prompt.button.attach"),
						disabled: __props.canUploadFiles && __props.messagingState === "idle",
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							disabled: __props.messagingState !== "idle" || !__props.canUploadFiles,
							icon: "paperclip",
							"icon-size": "large",
							onClick: _cache[3] || (_cache[3] = withModifiers(($event) => emit("attach"), ["stop"]))
						}, null, 8, ["disabled"])]),
						_: 1
					}, 8, ["content", "disabled"]), __props.isSpeechSupported ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("chatHub.chat.prompt.button.voiceInput"),
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							disabled: __props.messagingState !== "idle",
							icon: __props.isListening ? "square" : "mic",
							class: normalizeClass({ [_ctx.$style.recording]: __props.isListening }),
							"icon-size": "large",
							onClick: _cache[4] || (_cache[4] = withModifiers(($event) => emit("mic"), ["stop"]))
						}, null, 8, [
							"disabled",
							"icon",
							"class"
						])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"model-value",
					"placeholder",
					"streaming",
					"disabled",
					"submit-disabled"
				])
			], 34);
		};
	}
}), [["__cssModules", { "$style": {
	prompt: "_prompt_yn61j_1",
	fileInput: "_fileInput_yn61j_5",
	toolsButton: "_toolsButton_yn61j_9",
	attachments: "_attachments_yn61j_14",
	recording: "_recording_yn61j_20"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatPrompt.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/chatHub/components/ChatPrompt.vue
var ChatPrompt_default = /* @__PURE__ */ defineComponent({
	__name: "ChatPrompt",
	props: {
		messagingState: {},
		isNewSession: { type: Boolean },
		isToolsSelectable: { type: Boolean },
		selectedModel: {},
		checkedToolIds: {},
		sessionId: {},
		customAgentId: {},
		showCreditsClaimedCallout: { type: Boolean },
		showDynamicCredentialsMissingCallout: { type: Boolean },
		aiCreditsQuota: {},
		compact: { type: Boolean },
		placeholder: {}
	},
	emits: [
		"submit",
		"stop",
		"selectModel",
		"setCredentials",
		"editAgent",
		"dismissCreditsCallout",
		"openDynamicCredentials"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const chatStore = useChatStore();
		const emit = __emit;
		const activePromptRef = ref();
		const message = ref("");
		const committedSpokenMessage = ref("");
		const attachments = ref([]);
		const toast = useToast();
		const i18n = useI18n();
		const speechInput = useSpeechRecognition({
			continuous: true,
			interimResults: true,
			lang: navigator.language
		});
		const placeholder = computed(() => {
			if (props.placeholder) return props.placeholder;
			if (props.selectedModel) return i18n.baseText("chatHub.chat.prompt.placeholder.withModel", { interpolate: { model: props.selectedModel.name ?? "a model" } });
			return i18n.baseText("chatHub.chat.prompt.placeholder.selectModel");
		});
		const llmProvider = computed(() => isLlmProviderModel(props.selectedModel?.model) ? props.selectedModel?.model.provider : void 0);
		const acceptedMimeTypes = computed(() => enrichMimeTypesWithExtensions(props.selectedModel?.metadata.allowedFilesMimeTypes ?? ""));
		const canUploadFiles = computed(() => props.selectedModel?.metadata.allowFileUploads ?? false);
		const showMissingAgentCallout = computed(() => props.messagingState === "missingAgent");
		const showMissingCredentialsCallout = computed(() => props.messagingState === "missingCredentials" && !!llmProvider.value);
		function onMic() {
			committedSpokenMessage.value = message.value;
			if (speechInput.isListening.value) speechInput.stop();
			else speechInput.start();
		}
		function onStop() {
			emit("stop");
		}
		function onAttach() {
			activePromptRef.value?.fileInputRef?.click();
		}
		function handleFileSelect(e) {
			const target = e.target;
			const files = target.files;
			if (!files || files.length === 0) return;
			const allowed = acceptedMimeTypes.value;
			const accepted = [];
			const rejected = [];
			for (const file of Array.from(files)) if (isFileAcceptedByAccept(file.name, file.type, allowed)) accepted.push(file);
			else rejected.push(file);
			for (const file of accepted) attachments.value.push(file);
			for (const file of rejected) toast.showMessage({
				type: "warning",
				title: i18n.baseText("chatHub.chat.attachments.unsupported.title"),
				message: i18n.baseText("chatHub.chat.attachments.unsupported.toast", { interpolate: { fileName: file.name } })
			});
			if (target) target.value = "";
			activePromptRef.value?.inputRef?.focusInput();
		}
		function removeAttachment(removed) {
			attachments.value = attachments.value.filter((attachment) => attachment !== removed);
		}
		function handleSubmitForm() {
			const trimmed = message.value.trim();
			if (trimmed) {
				speechInput.stop();
				emit("submit", trimmed, attachments.value);
			}
		}
		watch(speechInput.result, (spoken) => {
			message.value = committedSpokenMessage.value + " " + spoken.trimStart();
		});
		watch(speechInput.isFinal, (final) => {
			if (final) committedSpokenMessage.value = message.value;
		}, { flush: "post" });
		watch(speechInput.error, (event) => {
			const errorCode = event && "error" in event ? event.error : void 0;
			if (errorCode === "not-allowed") {
				toast.showError(new Error(i18n.baseText("chatHub.chat.prompt.microphone.accessDenied")), i18n.baseText("chatHub.chat.prompt.microphone.allowAccess"));
				return;
			}
			if (errorCode === "no-speech") toast.showMessage({
				title: i18n.baseText("chatHub.chat.prompt.microphone.noSpeech"),
				type: "warning"
			});
		});
		async function handleToolToggle(toolId) {
			if (props.customAgentId) {
				await chatStore.toggleCustomAgentTool(props.customAgentId, toolId);
				return;
			}
			if (props.sessionId) {
				await chatStore.toggleSessionTool(props.sessionId, toolId);
				return;
			}
			const tool = chatStore.configuredTools.find((t) => t.definition.id === toolId);
			if (tool) await chatStore.toggleToolEnabled(toolId, !tool.enabled);
		}
		__expose({
			focus: () => activePromptRef.value?.inputRef?.focusInput(),
			reset: () => {
				message.value = "";
				committedSpokenMessage.value = "";
				attachments.value = [];
			},
			setText: (text) => {
				message.value = text;
			},
			appendText: (text) => {
				message.value += text;
			},
			addAttachments: (files) => {
				attachments.value.push(...files);
				activePromptRef.value?.inputRef?.focusInput();
			}
		});
		return (_ctx, _cache) => {
			return __props.compact ? (openBlock(), createBlock(ChatPromptCompact_default, {
				key: 0,
				ref_key: "activePromptRef",
				ref: activePromptRef,
				message: message.value,
				"onUpdate:message": _cache[4] || (_cache[4] = ($event) => message.value = $event),
				attachments: attachments.value,
				placeholder: placeholder.value,
				"messaging-state": __props.messagingState,
				"accepted-mime-types": acceptedMimeTypes.value,
				"can-upload-files": canUploadFiles.value,
				"is-speech-supported": unref(speechInput).isSupported.value,
				"is-listening": unref(speechInput).isListening.value,
				onSubmit: handleSubmitForm,
				onFileSelect: handleFileSelect,
				onAttach,
				onMic,
				onStop,
				onRemoveAttachment: removeAttachment
			}, {
				callouts: withCtx(() => [createVNode(ChatPromptCallouts_default, {
					"show-missing-agent-callout": showMissingAgentCallout.value,
					"show-missing-credentials-callout": showMissingCredentialsCallout.value,
					"show-dynamic-credentials-missing-callout": __props.showDynamicCredentialsMissingCallout,
					"show-credits-claimed-callout": __props.showCreditsClaimedCallout,
					"is-new-session": __props.isNewSession,
					"llm-provider": llmProvider.value,
					"ai-credits-quota": __props.aiCreditsQuota,
					compact: "",
					onSelectModel: _cache[0] || (_cache[0] = ($event) => emit("selectModel")),
					onSetCredentials: _cache[1] || (_cache[1] = ($event) => emit("setCredentials", $event)),
					onDismissCreditsCallout: _cache[2] || (_cache[2] = ($event) => emit("dismissCreditsCallout")),
					onOpenDynamicCredentials: _cache[3] || (_cache[3] = ($event) => emit("openDynamicCredentials"))
				}, null, 8, [
					"show-missing-agent-callout",
					"show-missing-credentials-callout",
					"show-dynamic-credentials-missing-callout",
					"show-credits-claimed-callout",
					"is-new-session",
					"llm-provider",
					"ai-credits-quota"
				])]),
				_: 1
			}, 8, [
				"message",
				"attachments",
				"placeholder",
				"messaging-state",
				"accepted-mime-types",
				"can-upload-files",
				"is-speech-supported",
				"is-listening"
			])) : (openBlock(), createBlock(ChatPromptFull_default, {
				key: 1,
				ref_key: "activePromptRef",
				ref: activePromptRef,
				message: message.value,
				"onUpdate:message": _cache[9] || (_cache[9] = ($event) => message.value = $event),
				attachments: attachments.value,
				placeholder: placeholder.value,
				"messaging-state": __props.messagingState,
				"accepted-mime-types": acceptedMimeTypes.value,
				"can-upload-files": canUploadFiles.value,
				"is-speech-supported": unref(speechInput).isSupported.value,
				"is-listening": unref(speechInput).isListening.value,
				"checked-tool-ids": __props.checkedToolIds,
				"custom-agent-id": __props.customAgentId,
				"is-tools-selectable": __props.isToolsSelectable,
				"selected-model": __props.selectedModel,
				onSubmit: handleSubmitForm,
				onFileSelect: handleFileSelect,
				onAttach,
				onMic,
				onStop,
				onRemoveAttachment: removeAttachment,
				onToolToggle: handleToolToggle
			}, {
				callouts: withCtx(() => [createVNode(ChatPromptCallouts_default, {
					"show-missing-agent-callout": showMissingAgentCallout.value,
					"show-missing-credentials-callout": showMissingCredentialsCallout.value,
					"show-dynamic-credentials-missing-callout": __props.showDynamicCredentialsMissingCallout,
					"show-credits-claimed-callout": __props.showCreditsClaimedCallout,
					"is-new-session": __props.isNewSession,
					"llm-provider": llmProvider.value,
					"ai-credits-quota": __props.aiCreditsQuota,
					onSelectModel: _cache[5] || (_cache[5] = ($event) => emit("selectModel")),
					onSetCredentials: _cache[6] || (_cache[6] = ($event) => emit("setCredentials", $event)),
					onDismissCreditsCallout: _cache[7] || (_cache[7] = ($event) => emit("dismissCreditsCallout")),
					onOpenDynamicCredentials: _cache[8] || (_cache[8] = ($event) => emit("openDynamicCredentials"))
				}, null, 8, [
					"show-missing-agent-callout",
					"show-missing-credentials-callout",
					"show-dynamic-credentials-missing-callout",
					"show-credits-claimed-callout",
					"is-new-session",
					"llm-provider",
					"ai-credits-quota"
				])]),
				_: 1
			}, 8, [
				"message",
				"attachments",
				"placeholder",
				"messaging-state",
				"accepted-mime-types",
				"can-upload-files",
				"is-speech-supported",
				"is-listening",
				"checked-tool-ids",
				"custom-agent-id",
				"is-tools-selectable",
				"selected-model"
			]));
		};
	}
});
//#endregion
//#region src/features/ai/chatHub/components/ChatSuggestedPrompts.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var DEFAULT_PROMPT_ICON = "message-circle";
var ChatSuggestedPrompts_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatSuggestedPrompts",
	props: { prompts: {} },
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		function getIconName(icon) {
			if (icon?.type === "emoji") return void 0;
			return icon?.value ?? DEFAULT_PROMPT_ICON;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.prompts, (prompt) => {
				return openBlock(), createBlock(unref(N8nButton_default), {
					key: prompt.text,
					variant: "outline",
					size: "small",
					icon: getIconName(prompt.icon),
					"icon-size": "large",
					class: normalizeClass(_ctx.$style.chip),
					onClick: ($event) => emit("select", prompt.text)
				}, createSlots({
					default: withCtx(() => [createTextVNode(" " + toDisplayString(prompt.text), 1)]),
					_: 2
				}, [prompt.icon?.type === "emoji" ? {
					name: "icon",
					fn: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.emoji) }, toDisplayString(prompt.icon.value), 3)]),
					key: "0"
				} : void 0]), 1032, [
					"icon",
					"class",
					"onClick"
				]);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1dmvk_1",
	chip: "_chip_1dmvk_8",
	emoji: "_emoji_1dmvk_15"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatGreetings.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatGreetings_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatGreetings",
	props: {
		selectedAgent: {},
		loading: { type: Boolean }
	},
	emits: ["select-prompt"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const isAgentModel = computed(() => props.selectedAgent && !isLlmProviderModel(props.selectedAgent.model));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				key: "greetings",
				class: normalizeClass(_ctx.$style.greetings)
			}, [isAgentModel.value && __props.selectedAgent ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.agentCard)
			}, [__props.loading ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nLoading_default), { variant: "circle" }), createVNode(unref(N8nLoading_default), {
				rows: 1,
				variant: "p",
				class: normalizeClass(_ctx.$style.skeletonName)
			}, null, 8, ["class"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(ChatAgentAvatar_default, {
				agent: __props.selectedAgent,
				size: "xl"
			}, null, 8, ["agent"]), createVNode(unref(N8nHeading_default), {
				tag: "h2",
				size: "xlarge",
				class: normalizeClass(_ctx.$style.agentName)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(truncate)(__props.selectedAgent.name, 40)), 1)]),
				_: 1
			}, 8, ["class"])], 64)), __props.loading ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nLoading_default), {
				rows: 3,
				variant: "p",
				"shrink-last": false,
				class: normalizeClass(_ctx.$style.skeletonDescription)
			}, null, 8, ["class"]), createBaseVNode("div", { class: normalizeClass([_ctx.$style.suggestions, _ctx.$style.skeletonPrompts]) }, [createVNode(unref(N8nLoading_default), {
				rows: 1,
				variant: "p",
				class: normalizeClass(_ctx.$style.skeletonChip)
			}, null, 8, ["class"]), createVNode(unref(N8nLoading_default), {
				rows: 1,
				variant: "p",
				class: normalizeClass(_ctx.$style.skeletonChip)
			}, null, 8, ["class"])], 2)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [__props.selectedAgent.description ? (openBlock(), createElementBlock("p", {
				key: 0,
				class: normalizeClass(_ctx.$style.agentDescription)
			}, toDisplayString(__props.selectedAgent.description), 3)) : createCommentVNode("", true), __props.selectedAgent.suggestedPrompts?.length ? (openBlock(), createBlock(ChatSuggestedPrompts_default, {
				key: 1,
				class: normalizeClass(_ctx.$style.suggestions),
				prompts: __props.selectedAgent.suggestedPrompts,
				onSelect: _cache[0] || (_cache[0] = ($event) => emit("select-prompt", $event))
			}, null, 8, ["class", "prompts"])) : createCommentVNode("", true)], 64))], 2)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.header)
			}, [__props.selectedAgent ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
				createVNode(unref(N8nHeading_default), { tag: "h2" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.chat.greeting")), 1)]),
					_: 1
				}),
				createVNode(ChatAgentAvatar_default, {
					agent: __props.selectedAgent,
					size: "md",
					class: normalizeClass(_ctx.$style.inlineIcon)
				}, null, 8, ["agent", "class"]),
				createVNode(unref(N8nHeading_default), { bold: "" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(truncate)(__props.selectedAgent.name, 40)), 1)]),
					_: 1
				})
			], 64)) : (openBlock(), createBlock(unref(N8nHeading_default), {
				key: 1,
				tag: "h2"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.chat.greeting.fallback")), 1)]),
				_: 1
			}))], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	greetings: "_greetings_4qrcy_1",
	agentCard: "_agentCard_4qrcy_8",
	agentName: "_agentName_4qrcy_16",
	agentDescription: "_agentDescription_4qrcy_24",
	suggestions: "_suggestions_4qrcy_34",
	skeletonName: "_skeletonName_4qrcy_38",
	skeletonDescription: "_skeletonDescription_4qrcy_43",
	skeletonPrompts: "_skeletonPrompts_4qrcy_48",
	skeletonChip: "_skeletonChip_4qrcy_54",
	header: "_header_4qrcy_58",
	inlineIcon: "_inlineIcon_4qrcy_64"
} }]]);
//#endregion
export { useChatSession as a, ChatMarkdownChunk_default as i, ChatPrompt_default as n, ChatMessage_default as r, ChatGreetings_default as t };
