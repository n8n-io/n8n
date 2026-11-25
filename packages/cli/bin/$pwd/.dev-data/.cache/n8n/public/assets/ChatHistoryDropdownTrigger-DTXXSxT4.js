import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Hf as shallowReactive, Iu as useEventListener, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sf as useSlots, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xd as guardReactiveProps, Xf as unref, Zu as useSpeechRecognition, _p as normalizeClass, bf as useId, ff as openBlock, gf as resolveComponent, hf as renderSlot, ip as init_shared_esm_bundler, of as onBeforeUnmount, rf as mergeProps, vp as normalizeProps, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, FE as exceedsAttachmentSizeLimit, IE as formatAttachmentSizeLimit, LE as formatTotalAttachmentSizeLimit, ME as base64EncodedSize, Ra as isFileAcceptedByAccept, SN as _plugin_vue_export_helper_default, XM as N8nActionDropdown_default, _N as N8nText_default, aN as N8nChatInput_default, dC as useToast, fN as N8nTooltip_default, jN as useI18n, vN as N8nIconButton_default, wa as getRelativeDate, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useFileDrop } from "./useFileDrop-DXIUwF1i.js";
//#region src/features/ai/shared/components/ChatInputBase.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = ["accept"];
var ChatInputBase_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatInputBase",
	props: {
		blockCanvasShortcuts: {
			type: Boolean,
			default: true
		},
		modelValue: {},
		placeholder: { default: void 0 },
		placeholderPreview: {},
		isStreaming: { type: Boolean },
		showStopButton: {
			type: Boolean,
			default: void 0
		},
		canSubmit: { type: Boolean },
		disabled: { type: Boolean },
		showVoice: { type: Boolean },
		showAttach: { type: Boolean },
		showAttachButton: {
			type: Boolean,
			default: true
		},
		acceptedMimeTypes: { default: void 0 },
		attachedEncodedBytes: { default: 0 },
		autosize: {
			type: [Boolean, Object],
			default: () => ({
				minRows: 2,
				maxRows: 6
			})
		},
		composerHeight: {},
		maxLength: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"submit",
		"stop",
		"tab",
		"files-selected",
		"files-rejected"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const inputRef = useTemplateRef("inputRef");
		const fileInputRef = useTemplateRef("fileInputRef");
		const resolvedPlaceholder = computed(() => props.placeholderPreview?.value ?? props.placeholder);
		const canAcceptFiles = computed(() => Boolean(props.showAttach && !props.disabled && !props.isStreaming));
		const acceptedMimeTypeList = computed(() => (props.acceptedMimeTypes ?? "").split(",").map((type) => type.trim()).filter(Boolean));
		const fileDrop = useFileDrop(canAcceptFiles, handleFiles, acceptedMimeTypeList);
		const committedSpokenMessage = ref("");
		const speechInput = useSpeechRecognition({
			continuous: true,
			interimResults: true,
			lang: navigator.language
		});
		watch(speechInput.result, (spoken) => {
			if (props.showVoice && !props.disabled) {
				const prefix = committedSpokenMessage.value;
				const separator = prefix.length > 0 ? " " : "";
				emit("update:modelValue", prefix + separator + spoken.trimStart());
			}
		});
		watch(speechInput.isFinal, (final) => {
			if (final && props.showVoice) committedSpokenMessage.value = props.modelValue;
		}, { flush: "post" });
		watch(() => props.disabled, (disabled) => {
			if (disabled && speechInput.isListening.value) speechInput.stop();
		});
		function handleMic() {
			committedSpokenMessage.value = props.modelValue;
			if (speechInput.isListening.value) speechInput.stop();
			else speechInput.start();
		}
		function handleAttach() {
			fileInputRef.value?.click();
		}
		function focusInput(options) {
			inputRef.value?.focusInput(options);
		}
		/** Returns the native textarea while the component is mounted. */
		function getInputElement() {
			return inputRef.value?.getInputElement();
		}
		/** Returns the element around the send and stop button while the component is mounted. */
		function getSendStopButtonElement() {
			return inputRef.value?.getSendStopButtonElement();
		}
		/**
		* Keep the files the backend will accept and warn about the rest.
		*
		* Checked here only so the user finds out before uploading megabytes — the backend
		* enforces the same limits authoritatively. Both checks convert to the encoded size
		* first: the limits are denominated in base64 bytes, so comparing `File.size` against
		* them directly would admit files ~4/3 too large.
		*/
		function withinSizeLimit(files) {
			const oversized = files.filter((file) => exceedsAttachmentSizeLimit(file.size));
			if (oversized.length > 0) toast.showError(new Error(i18n.baseText("chat.attachment.tooLarge.message", { interpolate: {
				fileNames: oversized.map((file) => file.name).join(", "),
				limit: formatAttachmentSizeLimit()
			} })), i18n.baseText("chat.attachment.tooLarge.title"));
			let usedBytes = props.attachedEncodedBytes;
			const accepted = [];
			let droppedForBudget = false;
			for (const file of files) {
				if (exceedsAttachmentSizeLimit(file.size)) continue;
				const encoded = base64EncodedSize(file.size);
				if (usedBytes + encoded > 16777216) {
					droppedForBudget = true;
					continue;
				}
				usedBytes += encoded;
				accepted.push(file);
			}
			if (droppedForBudget) toast.showError(new Error(i18n.baseText("chat.attachment.totalTooLarge.message", { interpolate: { limit: formatTotalAttachmentSizeLimit() } })), i18n.baseText("chat.attachment.totalTooLarge.title"));
			return accepted;
		}
		function handleFiles(files) {
			const acceptedByType = files.filter((file) => isFileAcceptedByAccept(file.name, file.type, props.acceptedMimeTypes ?? ""));
			const rejected = files.filter((file) => !acceptedByType.includes(file));
			if (rejected.length > 0) emit("files-rejected", rejected);
			const accepted = withinSizeLimit(acceptedByType);
			if (accepted.length > 0) emit("files-selected", accepted);
		}
		function handleFileSelect(e) {
			const target = e.target;
			const files = target.files;
			if (!files || files.length === 0) return;
			handleFiles(Array.from(files));
			target.value = "";
			focusInput();
		}
		function handleKeydown(e) {
			const isTextareaFocused = e.target?.tagName === "TEXTAREA";
			if (e.key === "Tab" && !e.shiftKey && isTextareaFocused) {
				e.preventDefault();
				emit("tab");
			}
		}
		function handleSubmit() {
			if (!props.canSubmit) return;
			speechInput.stop();
			emit("submit");
		}
		__expose({
			focus: focusInput,
			getInputElement,
			getSendStopButtonElement,
			openFilePicker: handleAttach
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.inputWrapper),
				onDragenter: _cache[2] || (_cache[2] = (...args) => unref(fileDrop).handleDragEnter && unref(fileDrop).handleDragEnter(...args)),
				onDragleave: _cache[3] || (_cache[3] = (...args) => unref(fileDrop).handleDragLeave && unref(fileDrop).handleDragLeave(...args)),
				onDragover: _cache[4] || (_cache[4] = (...args) => unref(fileDrop).handleDragOver && unref(fileDrop).handleDragOver(...args)),
				onDrop: _cache[5] || (_cache[5] = (...args) => unref(fileDrop).handleDrop && unref(fileDrop).handleDrop(...args)),
				onPaste: _cache[6] || (_cache[6] = (...args) => unref(fileDrop).handlePaste && unref(fileDrop).handlePaste(...args)),
				onKeydownCapture: handleKeydown
			}, [
				renderSlot(_ctx.$slots, "above"),
				unref(fileDrop).isDragging.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.dropOverlay),
					"data-test-id": "chat-input-drop-overlay"
				}, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatInputBase.dropOverlay")), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				__props.showAttach ? (openBlock(), createElementBlock("input", {
					key: 1,
					ref_key: "fileInputRef",
					ref: fileInputRef,
					type: "file",
					class: normalizeClass(_ctx.$style.fileInput),
					accept: __props.acceptedMimeTypes,
					multiple: "",
					onChange: handleFileSelect
				}, null, 42, _hoisted_1$2)) : createCommentVNode("", true),
				createVNode(unref(N8nChatInput_default), {
					ref_key: "inputRef",
					ref: inputRef,
					class: normalizeClass({ [_ctx.$style.fixedHeightInput]: __props.composerHeight }),
					style: normalizeStyle(__props.composerHeight ? { "--chat-input-height": __props.composerHeight } : void 0),
					"data-test-id": "chat-input-composer",
					"block-canvas-shortcuts": __props.blockCanvasShortcuts,
					"model-value": __props.modelValue,
					placeholder: resolvedPlaceholder.value,
					streaming: __props.showStopButton ?? __props.isStreaming,
					disabled: __props.disabled,
					"submit-disabled": !__props.canSubmit,
					"send-button-test-id": "instance-ai-send-button",
					"stop-button-test-id": "instance-ai-stop-button",
					autosize: __props.composerHeight ? false : __props.autosize,
					layout: __props.composerHeight || __props.autosize !== false ? "multiline" : "single-line",
					"max-length": __props.maxLength,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event)),
					onSubmit: handleSubmit,
					onStop: _cache[1] || (_cache[1] = ($event) => emit("stop"))
				}, {
					leading: withCtx(() => [__props.composerHeight ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.attachmentRow)
					}, [renderSlot(_ctx.$slots, "header"), renderSlot(_ctx.$slots, "attachments")], 2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [renderSlot(_ctx.$slots, "header"), renderSlot(_ctx.$slots, "attachments")], 64))]),
					"left-actions": withCtx(() => [renderSlot(_ctx.$slots, "footer-start")]),
					"right-actions": withCtx(() => [
						renderSlot(_ctx.$slots, "right-actions"),
						__props.showAttach && __props.showAttachButton && __props.acceptedMimeTypes !== void 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							content: unref(i18n).baseText("chatInputBase.button.attach"),
							placement: "top"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								variant: "ghost",
								disabled: __props.disabled || __props.isStreaming,
								icon: "paperclip",
								"icon-size": "large",
								"aria-label": unref(i18n).baseText("chatInputBase.button.attach"),
								"data-test-id": "chat-input-attach-button",
								onClick: withModifiers(handleAttach, ["stop"])
							}, null, 8, ["disabled", "aria-label"])]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true),
						__props.showVoice && unref(speechInput).isSupported ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 1,
							content: unref(i18n).baseText(__props.isStreaming ? "chatInputBase.button.dictate.stopResponse" : "chatInputBase.button.dictate"),
							placement: "top"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								variant: "ghost",
								disabled: __props.disabled || __props.isStreaming,
								icon: unref(speechInput).isListening.value ? "square" : "mic",
								class: normalizeClass({ [_ctx.$style.recording]: unref(speechInput).isListening.value }),
								"icon-size": "large",
								"aria-label": unref(i18n).baseText("chatInputBase.button.dictate"),
								"data-test-id": "chat-input-voice-button",
								onClick: withModifiers(handleMic, ["stop"])
							}, null, 8, [
								"disabled",
								"icon",
								"class",
								"aria-label"
							])]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true)
					]),
					_: 3
				}, 8, [
					"class",
					"style",
					"block-canvas-shortcuts",
					"model-value",
					"placeholder",
					"streaming",
					"disabled",
					"submit-disabled",
					"autosize",
					"layout",
					"max-length"
				])
			], 34);
		};
	}
}), [["__cssModules", { "$style": {
	inputWrapper: "_inputWrapper_pon6z_1",
	fixedHeightInput: "_fixedHeightInput_pon6z_6",
	attachmentRow: "_attachmentRow_pon6z_18",
	dropOverlay: "_dropOverlay_pon6z_31",
	fileInput: "_fileInput_pon6z_45",
	recording: "_recording_pon6z_49"
} }]]);
//#endregion
//#region src/features/ai/shared/composables/useAttachmentPreviews.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/** Keep image preview URLs until their files leave the attachment list. */
function useAttachmentPreviews(files) {
	const previews = shallowReactive(/* @__PURE__ */ new Map());
	watch(files, (currentFiles) => {
		const retainedFiles = new Set(currentFiles);
		for (const [file, url] of previews) if (!retainedFiles.has(file)) {
			URL.revokeObjectURL(url);
			previews.delete(file);
		}
		for (const file of currentFiles) if (file.type.startsWith("image/") && !previews.has(file)) previews.set(file, URL.createObjectURL(file));
	}, {
		deep: true,
		immediate: true,
		flush: "sync"
	});
	onScopeDispose(() => {
		for (const url of previews.values()) URL.revokeObjectURL(url);
		previews.clear();
	});
	function previewUrl(file) {
		return previews.get(file);
	}
	return { previewUrl };
}
//#endregion
//#region src/features/ai/assistant-at-mentions/AssistantMentionBreadcrumbs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AssistantMentionBreadcrumbs_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	name: "AssistantMentionBreadcrumbs",
	__name: "AssistantMentionBreadcrumbs",
	props: {
		segments: {},
		ancestor: {
			type: Boolean,
			default: false
		},
		wrap: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const parents = computed(() => props.segments.slice(0, -1));
		const current = computed(() => props.segments[props.segments.length - 1] ?? "");
		return (_ctx, _cache) => {
			const _component_AssistantMentionBreadcrumbs = resolveComponent("AssistantMentionBreadcrumbs", true);
			return openBlock(), createElementBlock("span", { class: normalizeClass([_ctx.$style.breadcrumbs, { [_ctx.$style.wrap]: __props.wrap }]) }, [parents.value.length > 0 ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.parents)
			}, [createVNode(_component_AssistantMentionBreadcrumbs, {
				segments: parents.value,
				ancestor: ""
			}, null, 8, ["segments"]), createBaseVNode("span", {
				class: normalizeClass([_ctx.$style.separator, _ctx.$style.breadcrumbAncestor]),
				role: "img",
				"aria-label": " > "
			}, [createVNode(unref(N8nIcon_default), {
				icon: "chevron-right",
				size: "xsmall"
			})], 2)], 2)) : createCommentVNode("", true), createBaseVNode("span", { class: normalizeClass([_ctx.$style.segment, { [_ctx.$style.breadcrumbAncestor]: __props.ancestor }]) }, toDisplayString(current.value), 3)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	breadcrumbs: "_breadcrumbs_10kyu_1",
	wrap: "_wrap_10kyu_6",
	parents: "_parents_10kyu_8",
	segment: "_segment_10kyu_9",
	separator: "_separator_10kyu_10",
	breadcrumbAncestor: "_breadcrumbAncestor_10kyu_44"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiResourceChip.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["data-test-id"];
var _hoisted_2 = ["aria-label", "data-test-id"];
var InstanceAiResourceChip_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "InstanceAiResourceChip",
	props: {
		label: {},
		breadcrumbs: {},
		icon: {},
		trailingIcon: {},
		removable: { type: Boolean },
		removeLabel: {},
		testId: {},
		removeTestId: {}
	},
	emits: ["remove"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const rootRef = useTemplateRef("root");
		const tooltipSegments = computed(() => props.breadcrumbs ?? [props.label]);
		__expose({ focus: () => rootRef.value?.focus() });
		function handleRemoveKeydown(event) {
			if (event.key !== "Escape") event.stopPropagation();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				"as-child": "",
				"show-after": unref(500),
				"content-class": _ctx.$style.tooltip
			}, {
				content: withCtx(() => [createVNode(AssistantMentionBreadcrumbs_default, {
					segments: tooltipSegments.value,
					wrap: ""
				}, null, 8, ["segments"])]),
				default: withCtx(() => [createBaseVNode("div", mergeProps({ ref: "root" }, _ctx.$attrs, {
					class: _ctx.$style.resourceChip,
					"data-test-id": props.testId
				}), [
					props.removable || _ctx.$slots.icon || props.icon ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.leading)
					}, [renderSlot(_ctx.$slots, "icon", {}, () => [props.icon ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: props.icon,
						size: "small"
					}, null, 8, ["icon"])) : createCommentVNode("", true)])], 2)) : createCommentVNode("", true),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(props.label), 3),
					props.trailingIcon ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: props.trailingIcon,
						size: "xsmall"
					}, null, 8, ["icon"])) : createCommentVNode("", true),
					props.removable ? (openBlock(), createElementBlock("button", {
						key: 2,
						type: "button",
						class: normalizeClass(_ctx.$style.remove),
						"aria-label": props.removeLabel,
						"data-test-id": props.removeTestId,
						onKeydown: handleRemoveKeydown,
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("remove"), ["stop"]))
					}, [createVNode(unref(N8nIcon_default), {
						icon: "x",
						size: "small"
					})], 42, _hoisted_2)) : createCommentVNode("", true)
				], 16, _hoisted_1$1)]),
				_: 3
			}, 8, ["show-after", "content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	tooltip: "_tooltip_18kfh_1",
	resourceChip: "_resourceChip_18kfh_6",
	leading: "_leading_18kfh_24",
	label: "_label_18kfh_33",
	remove: "_remove_18kfh_41"
} }]]);
//#endregion
//#region src/features/ai/shared/constants.ts
/** Raised character limit for chat surfaces where users paste long, externally-drafted prompts (agent builder, instance AI). */
var EXTENDED_PROMPT_MAX_LENGTH = 25e3;
//#endregion
//#region src/features/ai/shared/components/ChatHistoryDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler(), init_reactivity_esm_bundler();
var DOUBLE_CLICK_DELAY = 300;
var ChatHistoryDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatHistoryDropdown",
	props: {
		items: {},
		searchPlaceholder: {},
		contentTestId: {},
		contentId: { default: void 0 },
		actionButtonLabel: {},
		modelValue: {
			type: Boolean,
			default: void 0
		},
		dataTestId: { default: void 0 },
		maxHeight: { default: void 0 },
		loading: {
			type: Boolean,
			default: false
		},
		emptyText: { default: void 0 },
		editingItemId: { default: void 0 },
		actionsDisabled: {
			type: Boolean,
			default: false
		},
		itemDoubleClickEnabled: {
			type: Boolean,
			default: false
		},
		leadingItem: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"search",
		"select",
		"action",
		"item-dblclick"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const slots = useSlots();
		const i18n = useI18n();
		const generatedContentId = useId();
		const contentId = computed(() => props.contentId ?? generatedContentId);
		const dropdownRef = ref(null);
		let pendingItemClick;
		const groupOrder = [
			"Today",
			"Yesterday",
			"This week",
			"Older"
		];
		const groupLabels = {
			Today: i18n.baseText("userActivity.today"),
			Yesterday: i18n.baseText("userActivity.yesterday"),
			"This week": i18n.baseText("instanceAi.sidebar.group.thisWeek"),
			Older: i18n.baseText("instanceAi.sidebar.group.older")
		};
		const groupedItems = computed(() => {
			if (props.leadingItem && props.loading) return [props.leadingItem, {
				id: "__chat-history-loading__",
				label: i18n.baseText("generic.loadingEllipsis"),
				header: true
			}];
			const groups = /* @__PURE__ */ new Map();
			const undated = [];
			const now = /* @__PURE__ */ new Date();
			for (const item of props.items) {
				if (!item.data?.updatedAt) {
					undated.push(item);
					continue;
				}
				const relativeDate = getRelativeDate(now, item.data.updatedAt);
				const group = groupOrder.find((name) => name === relativeDate) ?? "Older";
				const items = groups.get(group) ?? [];
				items.push(item);
				groups.set(group, items);
			}
			const dated = [...groupOrder.flatMap((group) => {
				const items = (groups.get(group) ?? []).sort((a, b) => Date.parse(b.data?.updatedAt ?? "") - Date.parse(a.data?.updatedAt ?? ""));
				return items.length > 0 ? [{
					id: `group-${group}`,
					label: groupLabels[group],
					header: true
				}, ...items] : [];
			}), ...undated];
			if (!props.leadingItem) return dated;
			const body = dated.length === 0 && props.emptyText ? [{
				id: "__chat-history-empty__",
				label: props.emptyText,
				header: true
			}] : dated;
			return [props.leadingItem, ...body];
		});
		const cancelPendingItemClick = () => {
			if (pendingItemClick) clearTimeout(pendingItemClick);
			pendingItemClick = void 0;
		};
		const handleItemClick = (event, item) => {
			if (!props.itemDoubleClickEnabled || item.disabled) return;
			event.stopPropagation();
			cancelPendingItemClick();
			if (event.detail > 1) return;
			pendingItemClick = setTimeout(() => {
				pendingItemClick = void 0;
				emit("select", item.id);
				dropdownRef.value?.close();
			}, DOUBLE_CLICK_DELAY);
		};
		const handleItemDoubleClick = (item) => {
			if (item.disabled) return;
			cancelPendingItemClick();
			emit("item-dblclick", item.id);
		};
		onBeforeUnmount(cancelPendingItemClick);
		useEventListener(document, "keydown", (event) => {
			if (!(event.target instanceof HTMLElement)) return;
			const menu = event.target.closest("[data-menu-content]");
			if (menu?.id !== contentId.value) return;
			if (event.key === "Tab") {
				const focusableElements = [...menu.querySelectorAll("*")].filter((element) => element.tabIndex >= 0 && !element.matches(":disabled, [aria-disabled=\"true\"]"));
				const currentIndex = focusableElements.indexOf(event.target);
				const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
				if (currentIndex >= 0 && focusableElements[nextIndex]) event.stopPropagation();
				return;
			}
			if (event.key === "Enter" && event.target.closest("button")) event.stopPropagation();
		}, { capture: true });
		function keepEditFocus(event) {
			if (!props.editingItemId || !(event.target instanceof Element)) return;
			if (event.target.closest("[data-menu-content]")?.id !== contentId.value) return;
			event.stopPropagation();
		}
		useEventListener(document, "pointermove", keepEditFocus, { capture: true });
		useEventListener(document, "pointerleave", keepEditFocus, { capture: true });
		const highlightFirstItem = () => {
			dropdownRef.value?.highlightFirstItem();
		};
		const focusTrigger = () => {
			dropdownRef.value?.focusTrigger();
		};
		__expose({
			highlightFirstItem,
			focusTrigger
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				ref_key: "dropdownRef",
				ref: dropdownRef,
				id: contentId.value,
				"model-value": props.modelValue,
				items: groupedItems.value,
				loading: !props.leadingItem && props.loading,
				"max-height": props.maxHeight,
				"data-test-id": props.dataTestId,
				"content-test-id": props.contentTestId,
				"search-placeholder": props.searchPlaceholder,
				"empty-text": props.emptyText,
				"extra-popper-class": _ctx.$style.menuContent,
				width: "calc(var(--spacing--5xl) + var(--spacing--3xl) + var(--spacing--xl))",
				placement: "bottom-start",
				searchable: "",
				"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => emit("update:modelValue", $event)),
				onSearch: _cache[5] || (_cache[5] = ($event) => emit("search", $event)),
				onSelect: _cache[6] || (_cache[6] = ($event) => emit("select", $event))
			}, createSlots({
				"item-label": withCtx(({ item, ui }) => [item.data && props.editingItemId === item.id ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.itemEdit),
					onPointerdown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"])),
					onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
					onKeydown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
				}, [renderSlot(_ctx.$slots, "item-edit", {
					item,
					ui
				})], 34)) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					class: normalizeClass([ui.class, _ctx.$style.itemLabel]),
					title: item.label,
					size: "medium",
					color: item.disabled ? "text-xlight" : "text-dark",
					onClick: ($event) => handleItemClick($event, item),
					onDblclick: withModifiers(($event) => handleItemDoubleClick(item), ["stop"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
					_: 2
				}, 1032, [
					"class",
					"title",
					"color",
					"onClick",
					"onDblclick"
				]))]),
				"item-trailing": withCtx(({ item, ui }) => [item.data && (slots["item-trailing"] || item.data.actions?.length) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([ui.class, _ctx.$style.itemTrailing]),
					onClick: _cache[3] || (_cache[3] = withModifiers(() => {}, ["stop"]))
				}, [renderSlot(_ctx.$slots, "item-trailing", { item }), item.data.actions?.length ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
					key: 0,
					items: item.data.actions,
					class: normalizeClass(_ctx.$style.actionDropdown),
					placement: "bottom-start",
					disabled: props.actionsDisabled || item.disabled,
					"suppress-close-auto-focus": "",
					onSelect: ($event) => emit("action", $event, item.id)
				}, {
					activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "ellipsis",
						disabled: props.actionsDisabled || item.disabled,
						"aria-label": props.actionButtonLabel
					}, null, 8, ["disabled", "aria-label"])]),
					_: 2
				}, 1032, [
					"items",
					"class",
					"disabled",
					"onSelect"
				])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
				_: 2
			}, [
				slots.trigger ? {
					name: "trigger",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "trigger")]),
					key: "0"
				} : void 0,
				slots.loading ? {
					name: "loading",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "loading")]),
					key: "1"
				} : void 0,
				slots.empty ? {
					name: "empty",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "empty")]),
					key: "2"
				} : void 0,
				slots["item-leading"] ? {
					name: "item-leading",
					fn: withCtx((slotProps) => [renderSlot(_ctx.$slots, "item-leading", normalizeProps(guardReactiveProps(slotProps)))]),
					key: "3"
				} : void 0,
				slots.footer ? {
					name: "footer",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "footer")]),
					key: "4"
				} : void 0
			]), 1032, [
				"id",
				"model-value",
				"items",
				"loading",
				"max-height",
				"data-test-id",
				"content-test-id",
				"search-placeholder",
				"empty-text",
				"extra-popper-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	itemEdit: "_itemEdit_19zjx_1",
	menuContent: "_menuContent_19zjx_5",
	itemLabel: "_itemLabel_19zjx_9",
	itemTrailing: "_itemTrailing_19zjx_17",
	actionDropdown: "_actionDropdown_19zjx_23"
} }]]);
//#endregion
//#region src/features/ai/shared/components/ChatHistoryDropdownTrigger.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["title"];
var ChatHistoryDropdownTrigger_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ChatHistoryDropdownTrigger",
	props: { title: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const label = computed(() => props.title || i18n.baseText("instanceAi.sidebar.chatHistory"));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				"as-child": "",
				content: unref(i18n).baseText("instanceAi.sidebar.chatHistory"),
				disabled: !props.title,
				placement: "bottom",
				"show-after": unref(500)
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), mergeProps(_ctx.$attrs, {
					variant: "ghost",
					size: "small",
					icon: "history",
					"icon-size": "large",
					class: _ctx.$style.button,
					"aria-label": label.value
				}), {
					default: withCtx(() => [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.label),
						title: props.title
					}, toDisplayString(label.value), 11, _hoisted_1)]),
					_: 1
				}, 16, ["class", "aria-label"])]),
				_: 1
			}, 8, [
				"content",
				"disabled",
				"show-after"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	button: "_button_1mpn1_1",
	label: "_label_1mpn1_13"
} }]]);
//#endregion
export { AssistantMentionBreadcrumbs_default as a, InstanceAiResourceChip_default as i, ChatHistoryDropdown_default as n, useAttachmentPreviews as o, EXTENDED_PROMPT_MAX_LENGTH as r, ChatInputBase_default as s, ChatHistoryDropdownTrigger_default as t };
