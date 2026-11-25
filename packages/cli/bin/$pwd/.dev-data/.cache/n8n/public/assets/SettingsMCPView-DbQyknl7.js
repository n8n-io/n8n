import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cd as TransitionGroup, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rl as CollapsibleRoot_default, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, vf as resolveDynamicComponent, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Bj as SettingsRow_default, Cm as useRBACStore, GA as DialogDescription_default, Gt as useMCPStore, Hj as SettingsPageHeader_default, Ht as getMcpClientCatalog, Ij as SettingsRowGroup_default, JA as DialogHeader_default, Jt as getClientBrand, KA as Dialog_default, Kj as N8nNotice_default, Lj as SettingsRowConfigure_default, MA as RadioGroupItem_default, Pj as SettingsSection_default, Qj as N8nMarkdown_default, Qt as MCP_DOCS_PAGE_URL, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, Vr as useClipboard, Vt as MCP_CLIENT_LOGO_CYCLE, WA as DialogBody_default, Wt as useMcp, Xt as MCP_AGENTS_VIEW, YA as DialogClose_default, Zt as MCP_CLIENTS_VIEW, _N as N8nText_default, a_ as tryUse, bC as useRootStore, cN as Input_default, dC as useToast, dM as N8nSwitch_default, e_ as mcpDiscoverySettings, fN as N8nTooltip_default, gj as N8nTimeAgo_default, hC as useTelemetry, jA as RadioGroup_default, jN as useI18n, pj as AnimatedCollapsibleContent_default, qA as DialogTitle_default, qd as useDocumentTitle, qt as getAccessSummary, tM as N8nInfoTip_default, tN as N8nLoading_default, t_ as mcpExposeAllOffer, tn as MCP_WORKFLOWS_VIEW, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { n as RevokeOAuthClientConfirmModal_default, r as OAuthClientDetailsModal_default, t as useOAuthClientRevoke } from "./useOAuthClientRevoke-9J7RMFuL.js";
//#region ../../modules/mcp/frontend/src/components/MCPEmptyState.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = { key: 0 };
var _hoisted_2$1 = { key: 1 };
var _hoisted_3 = { key: 2 };
var MCPEmptyState_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MCPEmptyState",
	props: {
		disabled: {
			type: Boolean,
			default: false
		},
		loading: {
			type: Boolean,
			default: false
		},
		managedByEnv: {
			type: Boolean,
			default: false
		}
	},
	emits: ["turnOnMcp"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const buttonDisabled = computed(() => props.disabled || props.loading);
		const emptyStateIcon = {
			type: "cards",
			center: "mcp",
			sides: MCP_CLIENT_LOGO_CYCLE
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nEmptyState_default), {
				class: normalizeClass(_ctx.$style.emptyState),
				"data-test-id": "mcp-empty-state-container",
				icon: emptyStateIcon,
				heading: unref(i18n).baseText("settings.mcp.actionBox.heading"),
				description: unref(i18n).baseText("settings.mcp.emptyState.description")
			}, {
				additionalContent: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "medium",
					href: unref(MCP_DOCS_PAGE_URL),
					target: "_blank",
					"data-test-id": "mcp-empty-state-learn-more"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")) + " ", 1), createVNode(unref(N8nIcon_default), {
						icon: "arrow-up-right",
						size: "small"
					})]),
					_: 1
				}, 8, ["href"]), createVNode(unref(N8nTooltip_default), { disabled: !buttonDisabled.value }, {
					content: withCtx(() => [props.loading ? (openBlock(), createElementBlock("span", _hoisted_1$3, toDisplayString(unref(i18n).baseText("generic.loading")) + "...", 1)) : props.managedByEnv ? (openBlock(), createElementBlock("span", _hoisted_2$1, toDisplayString(unref(i18n).baseText("settings.mcp.managedByEnv.tooltip")), 1)) : (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(unref(i18n).baseText("settings.mcp.toggle.disabled.tooltip")), 1))]),
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "medium",
						disabled: buttonDisabled.value,
						"data-test-id": "enable-mcp-access-button",
						onClick: _cache[0] || (_cache[0] = ($event) => emit("turnOnMcp"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.actionBox.button.label")), 1)]),
						_: 1
					}, 8, ["disabled"])]),
					_: 1
				}, 8, ["disabled"])], 2)]),
				_: 1
			}, 8, [
				"class",
				"heading",
				"description"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	emptyState: "_emptyState_1dwre_451",
	fadeInUp: "_fadeInUp_1dwre_1",
	actions: "_actions_1dwre_467",
	shimmer: "_shimmer_1dwre_1",
	spin: "_spin_1dwre_1",
	"skeleton-pulse": "_skeleton-pulse_1dwre_1",
	opacityPulse: "_opacityPulse_1dwre_1",
	popoverIn: "_popoverIn_1dwre_1",
	fadeIn: "_fadeIn_1dwre_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1dwre_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1dwre_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1dwre_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1dwre_1",
	blurSwapIn: "_blurSwapIn_1dwre_1",
	blurSwapOut: "_blurSwapOut_1dwre_1",
	pulse: "_pulse_1dwre_1",
	pulseGlow: "_pulseGlow_1dwre_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1dwre_1",
	fade: "_fade_1dwre_1",
	fadeInDown: "_fadeInDown_1dwre_1",
	fadeInLeft: "_fadeInLeft_1dwre_1",
	fadeInRight: "_fadeInRight_1dwre_1",
	fadeOut: "_fadeOut_1dwre_1",
	fadeOutDown: "_fadeOutDown_1dwre_1",
	fadeOutUp: "_fadeOutUp_1dwre_1",
	fadeOutLeft: "_fadeOutLeft_1dwre_1",
	fadeOutRight: "_fadeOutRight_1dwre_1",
	ping: "_ping_1dwre_1",
	blinkBackground: "_blinkBackground_1dwre_1",
	typingBlink: "_typingBlink_1dwre_1"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/redirect-uris.utils.ts
/** Validates a single OAuth redirect URI; returns the error kind or null when valid. */
function validateRedirectUri(uri) {
	let url;
	try {
		url = new URL(uri);
	} catch {
		return "invalidUrl";
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return "invalidProtocol";
	if (!(url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol !== "https:") return "httpsRequired";
	return null;
}
//#endregion
//#region ../../modules/mcp/frontend/src/components/McpAllowedCallbackUrlsDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = ["data-test-id", "onClick"];
var McpAllowedCallbackUrlsDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpAllowedCallbackUrlsDialog",
	props: {
		open: { type: Boolean },
		uris: {},
		saving: { type: Boolean }
	},
	emits: ["update:open", "save"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const mode = ref("all");
		let nextDraftId = 0;
		const createDraft = (value = "") => ({
			id: nextDraftId++,
			value
		});
		const drafts = ref([createDraft()]);
		function resetFromUris() {
			mode.value = props.uris.length > 0 ? "trusted" : "all";
			drafts.value = props.uris.length > 0 ? props.uris.map((uri) => createDraft(uri)) : [createDraft()];
		}
		watch([() => props.open, () => props.uris], ([open]) => {
			if (!open) return;
			resetFromUris();
		}, { immediate: true });
		const trimmedDrafts = computed(() => drafts.value.map((draft) => draft.value.trim()).filter((uri) => uri.length > 0));
		const validationError = computed(() => {
			if (mode.value !== "trusted") return null;
			for (const uri of trimmedDrafts.value) {
				const error = validateRedirectUri(uri);
				if (error) return i18n.baseText(`settings.mcp.allowedRedirectUris.validation.${error}`, { interpolate: { url: uri } });
			}
			return null;
		});
		const result = computed(() => mode.value === "all" ? [] : trimmedDrafts.value);
		const canSave = computed(() => {
			if (validationError.value) return false;
			if (mode.value === "trusted" && trimmedDrafts.value.length === 0) return false;
			return true;
		});
		const addUrlRow = ref(null);
		const addUrl = () => {
			drafts.value.push(createDraft());
		};
		/** The dialog body that actually scrolls, if this node sits inside one. */
		function scrollParent(node) {
			let current = node.parentElement;
			while (current) {
				const { overflowY } = getComputedStyle(current);
				if (overflowY === "auto" || overflowY === "scroll") return current;
				current = current.parentElement;
			}
			return null;
		}
		function keepAddButtonInView() {
			const row = addUrlRow.value;
			if (!row) return;
			const scroller = scrollParent(row);
			if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
			const rowRect = row.getBoundingClientRect();
			const scrollerRect = scroller.getBoundingClientRect();
			if (rowRect.bottom <= scrollerRect.bottom) return;
			const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
			scroller.scrollTo({
				top: scroller.scrollHeight - scroller.clientHeight,
				behavior
			});
		}
		const removeUrl = (id) => {
			if (drafts.value.length === 1) {
				drafts.value[0].value = "";
				return;
			}
			drafts.value = drafts.value.filter((draft) => draft.id !== id);
		};
		const onCancel = () => emit("update:open", false);
		const onSave = () => emit("save", result.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				header: unref(i18n).baseText("settings.mcp.callbackUrls.dialog.title"),
				"data-test-id": "mcp-callback-urls-dialog",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.callbackUrls.dialog.description")), 1)]),
						_: 1
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [createVNode(unref(RadioGroup_default), {
						modelValue: mode.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => mode.value = $event),
						orientation: "vertical",
						class: normalizeClass(_ctx.$style.modes)
					}, {
						default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(["all", "trusted"], (option) => {
							return createBaseVNode("div", {
								key: option,
								class: normalizeClass([_ctx.$style["mode-card"], mode.value === option && _ctx.$style["mode-card-active"]]),
								"data-test-id": `mcp-callback-urls-mode-${option}`,
								onClick: ($event) => mode.value = option
							}, [createVNode(unref(RadioGroupItem_default), {
								value: option,
								label: unref(i18n).baseText(`settings.mcp.callbackUrls.mode.${option}.label`),
								description: unref(i18n).baseText(`settings.mcp.callbackUrls.mode.${option}.description`)
							}, null, 8, [
								"value",
								"label",
								"description"
							])], 10, _hoisted_1$2);
						}), 64))]),
						_: 1
					}, 8, ["modelValue", "class"]), createVNode(unref(CollapsibleRoot_default), { open: mode.value === "trusted" }, {
						default: withCtx(() => [createVNode(unref(AnimatedCollapsibleContent_default), {
							class: normalizeClass(_ctx.$style["trusted-content"]),
							blur: "",
							"data-test-id": "mcp-callback-urls-trusted"
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.trusted) }, [
								createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-dark",
									bold: "",
									class: normalizeClass(_ctx.$style["trusted-label"])
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.callbackUrls.trusted.label")), 1)]),
									_: 1
								}, 8, ["class"]),
								createVNode(TransitionGroup, {
									tag: "div",
									class: normalizeClass(_ctx.$style["url-list"]),
									"enter-from-class": _ctx.$style["slot-collapsed"],
									"enter-active-class": _ctx.$style["slot-animating"],
									"leave-active-class": _ctx.$style["slot-animating"],
									"leave-to-class": _ctx.$style["slot-collapsed"],
									onAfterEnter: keepAddButtonInView
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(drafts.value, (draft) => {
										return openBlock(), createElementBlock("div", {
											key: draft.id,
											class: normalizeClass(_ctx.$style.slot),
											"data-test-id": "mcp-callback-url-row"
										}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["slot-clip"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["url-row"]) }, [createVNode(unref(Input_default), {
											modelValue: draft.value,
											"onUpdate:modelValue": ($event) => draft.value = $event,
											type: "text",
											placeholder: unref(i18n).baseText("settings.mcp.callbackUrls.trusted.placeholder"),
											"data-test-id": "mcp-callback-url-input"
										}, null, 8, [
											"modelValue",
											"onUpdate:modelValue",
											"placeholder"
										]), drafts.value.length > 1 || draft.value.length > 0 ? (openBlock(), createBlock(unref(N8nButton_default), {
											key: 0,
											variant: "ghost",
											size: "small",
											"icon-only": "",
											icon: "x",
											"aria-label": unref(i18n).baseText("generic.delete"),
											"data-test-id": "mcp-callback-url-remove",
											onClick: ($event) => removeUrl(draft.id)
										}, null, 8, ["aria-label", "onClick"])) : createCommentVNode("", true)], 2)], 2)], 2);
									}), 128))]),
									_: 1
								}, 8, [
									"class",
									"enter-from-class",
									"enter-active-class",
									"leave-active-class",
									"leave-to-class"
								]),
								createVNode(Transition, {
									"enter-from-class": _ctx.$style["slot-collapsed"],
									"enter-active-class": _ctx.$style["slot-animating"],
									"leave-active-class": _ctx.$style["slot-animating"],
									"leave-to-class": _ctx.$style["slot-collapsed"]
								}, {
									default: withCtx(() => [validationError.value ? (openBlock(), createElementBlock("div", {
										key: 0,
										class: normalizeClass(_ctx.$style.slot)
									}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["slot-clip"]) }, [createVNode(unref(N8nText_default), {
										size: "small",
										color: "danger",
										class: normalizeClass(_ctx.$style.error),
										"data-test-id": "mcp-callback-urls-error"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(validationError.value), 1)]),
										_: 1
									}, 8, ["class"])], 2)], 2)) : createCommentVNode("", true)]),
									_: 1
								}, 8, [
									"enter-from-class",
									"enter-active-class",
									"leave-active-class",
									"leave-to-class"
								]),
								createBaseVNode("div", {
									ref_key: "addUrlRow",
									ref: addUrlRow
								}, [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "small",
									icon: "plus",
									label: unref(i18n).baseText("settings.mcp.callbackUrls.trusted.addUrl"),
									"data-test-id": "mcp-callback-url-add",
									onClick: addUrl
								}, null, 8, ["label"])], 512)
							], 2)]),
							_: 1
						}, 8, ["class"])]),
						_: 1
					}, 8, ["open"])], 2)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("generic.cancel"),
						onClick: onCancel
					}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
						variant: "solid",
						label: unref(i18n).baseText("settings.mcp.callbackUrls.dialog.save"),
						disabled: !canSave.value,
						loading: __props.saving,
						"data-test-id": "mcp-callback-urls-save",
						onClick: onSave
					}, null, 8, [
						"label",
						"disabled",
						"loading"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_uhmvd_454",
	modes: "_modes_uhmvd_459",
	"mode-card": "_mode-card_uhmvd_465",
	"mode-card-active": "_mode-card-active_uhmvd_472",
	"trusted-content": "_trusted-content_uhmvd_479",
	trusted: "_trusted_uhmvd_479",
	"trusted-label": "_trusted-label_uhmvd_493",
	"url-list": "_url-list_uhmvd_497",
	slot: "_slot_uhmvd_505",
	"slot-collapsed": "_slot-collapsed_uhmvd_514",
	"slot-animating": "_slot-animating_uhmvd_520",
	"slot-clip": "_slot-clip_uhmvd_528",
	"url-row": "_url-row_uhmvd_485",
	error: "_error_uhmvd_485",
	shimmer: "_shimmer_uhmvd_1",
	spin: "_spin_uhmvd_1",
	"skeleton-pulse": "_skeleton-pulse_uhmvd_1",
	opacityPulse: "_opacityPulse_uhmvd_1",
	popoverIn: "_popoverIn_uhmvd_1",
	fadeIn: "_fadeIn_uhmvd_1",
	collapsibleSlideDown: "_collapsibleSlideDown_uhmvd_1",
	collapsibleSlideUp: "_collapsibleSlideUp_uhmvd_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_uhmvd_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_uhmvd_1",
	blurSwapIn: "_blurSwapIn_uhmvd_1",
	blurSwapOut: "_blurSwapOut_uhmvd_1",
	pulse: "_pulse_uhmvd_1",
	pulseGlow: "_pulseGlow_uhmvd_1",
	pulseGlowDelayed: "_pulseGlowDelayed_uhmvd_1",
	fade: "_fade_uhmvd_1",
	fadeInUp: "_fadeInUp_uhmvd_1",
	fadeInDown: "_fadeInDown_uhmvd_1",
	fadeInLeft: "_fadeInLeft_uhmvd_1",
	fadeInRight: "_fadeInRight_uhmvd_1",
	fadeOut: "_fadeOut_uhmvd_1",
	fadeOutDown: "_fadeOutDown_uhmvd_1",
	fadeOutUp: "_fadeOutUp_uhmvd_1",
	fadeOutLeft: "_fadeOutLeft_uhmvd_1",
	fadeOutRight: "_fadeOutRight_uhmvd_1",
	ping: "_ping_uhmvd_1",
	blinkBackground: "_blinkBackground_uhmvd_1",
	typingBlink: "_typingBlink_uhmvd_1"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/ConnectionParameter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$1 = ["for"];
var _hoisted_2 = ["id"];
var ConnectionParameter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ConnectionParameter",
	props: {
		id: {},
		label: {},
		value: {},
		valueLoading: {
			type: Boolean,
			default: false
		},
		infoTip: { default: void 0 },
		allowCopy: {
			type: Boolean,
			default: true
		}
	},
	emits: ["copy"],
	setup(__props, { emit: __emit }) {
		const { copy, copied, isSupported } = useClipboard();
		const i18n = useI18n();
		const props = __props;
		const emit = __emit;
		const handleCopy = async (value) => {
			await copy(value);
			emit("copy", value);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["label-wrapper"]) }, [createBaseVNode("label", {
				class: normalizeClass(_ctx.$style.label),
				for: `connection-parameter-${props.id}`
			}, toDisplayString(props.label), 11, _hoisted_1$1), props.infoTip ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style["info-tip"])
			}, [createVNode(unref(N8nInfoTip_default), {
				type: "tooltip",
				size: "small",
				enterable: false
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(props.infoTip), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true)], 2), createBaseVNode("div", {
				id: `connection-parameter-${props.id}`,
				class: normalizeClass({
					[_ctx.$style["parameter-value"]]: true,
					[_ctx.$style["parameter-value--loading"]]: props.valueLoading
				}),
				"data-test-id": "connection-parameter-value"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["input-wrapper"]) }, [props.valueLoading ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: props.valueLoading,
				variant: "h1",
				class: normalizeClass(_ctx.$style["parameter-skeleton"])
			}, null, 8, ["loading", "class"])) : (openBlock(), createBlock(unref(Input_default), {
				key: 1,
				modelValue: props.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => props.value = $event),
				type: "text",
				readonly: true
			}, null, 8, ["modelValue"]))], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style["copy-button-wrapper"]) }, [renderSlot(_ctx.$slots, "customActions"), createVNode(unref(N8nTooltip_default), {
				disabled: !unref(isSupported),
				content: unref(copied) ? unref(i18n).baseText("generic.copied") : unref(i18n).baseText("generic.copy"),
				"show-after": unref(100),
				placement: "bottom"
			}, {
				default: withCtx(() => [props.allowCopy && unref(isSupported) ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					"icon-only": "",
					icon: unref(copied) ? "check" : "copy",
					class: normalizeClass(_ctx.$style["copy-button"]),
					disabled: props.valueLoading,
					onClick: _cache[1] || (_cache[1] = ($event) => handleCopy(props.value))
				}, null, 8, [
					"icon",
					"class",
					"disabled"
				])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"disabled",
				"content",
				"show-after"
			])], 2)], 10, _hoisted_2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_149l3_1",
	"label-wrapper": "_label-wrapper_149l3_7",
	"info-tip": "_info-tip_149l3_12",
	label: "_label_149l3_7",
	"parameter-value": "_parameter-value_149l3_29",
	"parameter-value--loading": "_parameter-value--loading_149l3_40",
	"input-wrapper": "_input-wrapper_149l3_43",
	"parameter-skeleton": "_parameter-skeleton_149l3_69",
	"copy-button-wrapper": "_copy-button-wrapper_149l3_88",
	"copy-button": "_copy-button_149l3_88"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/McpConfigSnippet.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var McpConfigSnippet_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpConfigSnippet",
	props: {
		value: {},
		language: {},
		disabled: { type: Boolean }
	},
	emits: ["copy"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { copy, copied, isSupported } = useClipboard();
		const code = computed(() => `\`\`\`${props.language ?? "json"}\n${props.value}\n\`\`\``);
		const handleCopy = async () => {
			await copy(props.value);
			emit("copy", props.value);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "mcp-config-snippet"
			}, [createVNode(unref(N8nMarkdown_default), { content: code.value }, null, 8, ["content"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style["copy-wrapper"]) }, [createVNode(unref(N8nTooltip_default), {
				placement: "bottom-end",
				disabled: !unref(isSupported),
				content: unref(copied) ? unref(i18n).baseText("generic.copied") : unref(i18n).baseText("generic.copy"),
				"show-after": unref(100)
			}, {
				default: withCtx(() => [unref(isSupported) && !__props.disabled ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "ghost",
					"icon-only": "",
					icon: unref(copied) ? "check" : "copy",
					class: normalizeClass(_ctx.$style["copy-button"]),
					"data-test-id": "mcp-config-snippet-copy",
					onClick: handleCopy
				}, null, 8, ["icon", "class"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"disabled",
				"content",
				"show-after"
			])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1mh99_1",
	"copy-wrapper": "_copy-wrapper_1mh99_17",
	"copy-button": "_copy-button_1mh99_27"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/McpAccessTokenTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var McpAccessTokenTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpAccessTokenTab",
	props: { serverUrl: {} },
	emits: ["copied"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const mcpStore = useMCPStore();
		const loadingApiKey = ref(true);
		const keyRotating = ref(false);
		const apiKey = computed(() => mcpStore.currentUserMCPKey);
		const connectionString = computed(() => {
			return `{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "${props.serverUrl}",
      "headers": {
        "Authorization": "Bearer ${apiKeyText.value}"
      }
    }
  }
}`;
		});
		const isKeyRedacted = computed(() => {
			return apiKey.value?.apiKey?.includes("******") ?? false;
		});
		const apiKeyText = computed(() => {
			if (keyRotating.value) return `<${i18n.baseText("generic.loading")}...>`;
			return isKeyRedacted.value ? "<YOUR_ACCESS_TOKEN_HERE>" : apiKey.value?.apiKey;
		});
		const fetchApiKey = async () => {
			try {
				loadingApiKey.value = true;
				await mcpStore.getOrCreateApiKey();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.fetching.apiKey"));
			} finally {
				setTimeout(() => {
					loadingApiKey.value = false;
				}, 200);
			}
		};
		const rotateKey = async () => {
			try {
				keyRotating.value = true;
				await mcpStore.generateNewApiKey();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.rotating.apiKey"));
			} finally {
				setTimeout(() => {
					keyRotating.value = false;
				}, 200);
			}
		};
		const handleConnectionStringCopy = (value) => {
			emit("copied", "mcpJson", value);
		};
		const handleUrlCopy = (url) => {
			emit("copied", "serverUrl", url);
		};
		const handleAccessTokenCopy = () => {
			if (apiKey.value?.apiKey) emit("copied", "accessToken", apiKey.value.apiKey);
		};
		onMounted(async () => {
			if (!apiKey.value) await fetchApiKey();
			else loadingApiKey.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "mcp-access-token-tab"
			}, [createVNode(ConnectionParameter_default, {
				id: "oauth-server-url",
				label: unref(i18n).baseText("settings.mcp.connectDialog.serverUrl"),
				value: props.serverUrl,
				onCopy: handleUrlCopy
			}, null, 8, ["label", "value"]), loadingApiKey.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style["loading-container"])
			}, [createVNode(unref(N8nLoading_default), {
				loading: loadingApiKey.value,
				variant: "h1",
				class: normalizeClass(_ctx.$style["url-skeleton"])
			}, null, 8, ["loading", "class"]), createVNode(unref(N8nLoading_default), {
				loading: loadingApiKey.value,
				variant: "button",
				class: normalizeClass(_ctx.$style["code-skeleton"])
			}, null, 8, ["loading", "class"])], 2)) : apiKey.value?.apiKey ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style["parameters-container"])
			}, [
				createVNode(ConnectionParameter_default, {
					id: "access-token",
					value: apiKey.value.apiKey,
					"value-loading": keyRotating.value,
					label: unref(i18n).baseText("settings.mcp.connectDialog.tab.accessToken"),
					"info-tip": unref(i18n).baseText("settings.mcp.instructions.apiKey.tip"),
					"allow-copy": !isKeyRedacted.value,
					onCopy: handleAccessTokenCopy
				}, {
					customActions: withCtx(() => [createVNode(unref(N8nTooltip_default), {
						content: unref(i18n).baseText("settings.mcp.instructions.rotateKey.tooltip"),
						"show-after": unref(100)
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"icon-only": "",
							icon: "refresh-cw",
							disabled: keyRotating.value,
							onClick: rotateKey
						}, null, 8, ["disabled"])]),
						_: 1
					}, 8, ["content", "show-after"])]),
					_: 1
				}, 8, [
					"value",
					"value-loading",
					"label",
					"info-tip",
					"allow-copy"
				]),
				!isKeyRedacted.value ? (openBlock(), createBlock(unref(N8nNotice_default), { key: 0 }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.access.token.notice")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["json-container"]),
					"data-test-id": "mcp-access-token-json"
				}, [createBaseVNode("label", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(unref(i18n).baseText("settings.mcp.connectDialog.jsonConfig")), 3), createVNode(McpConfigSnippet_default, {
					value: connectionString.value,
					disabled: keyRotating.value,
					onCopy: handleConnectionStringCopy
				}, null, 8, ["value", "disabled"])], 2)
			], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1as3u_1",
	"loading-container": "_loading-container_1as3u_6",
	"url-skeleton": "_url-skeleton_1as3u_12",
	"code-skeleton": "_code-skeleton_1as3u_17",
	"parameters-container": "_parameters-container_1as3u_22",
	"json-container": "_json-container_1as3u_28",
	label: "_label_1as3u_32"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/McpConnectClientDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = {
	key: 1,
	"data-test-id": "mcp-connect-token-setup"
};
var McpConnectClientDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpConnectClientDialog",
	setup(__props) {
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const mcpStore = useMCPStore();
		const serverUrl = computed(() => mcpStore.serverUrl);
		const catalog = computed(() => getMcpClientCatalog(serverUrl.value));
		const clientsById = computed(() => new Map(catalog.value.flatMap((group) => group.clients.map((client) => [client.id, client]))));
		const activeMethod = ref("oauth");
		const methodTabs = computed(() => [{
			label: i18n.baseText("settings.mcp.connectDialog.method.oauth"),
			value: "oauth"
		}, {
			label: i18n.baseText("settings.mcp.connectDialog.method.apiKey"),
			value: "apiKey"
		}]);
		const activeClientId = ref("claude-ai");
		const activeClient = computed(() => clientsById.value.get(activeClientId.value));
		const clientMenuItems = computed(() => {
			const items = [];
			for (const group of catalog.value) {
				items.push({
					id: `header:${group.id}`,
					label: i18n.baseText(`settings.mcp.connectDialog.category.${group.id}`),
					disabled: true,
					divided: items.length > 0,
					data: { kind: "header" }
				});
				for (const client of group.clients) items.push({
					id: client.id,
					label: client.name,
					checked: client.id === activeClientId.value,
					data: {
						kind: "client",
						client
					}
				});
			}
			return items;
		});
		const onSelectClient = (id) => {
			if (clientMenuItems.value.find((menuItem) => menuItem.id === id)?.data?.kind !== "client") return;
			activeClientId.value = id;
			telemetry.track("User selected MCP client in connect dialog", { client: id });
		};
		const onOpenChange = (open) => {
			if (open) mcpStore.openConnectPopover();
			else {
				mcpStore.closeConnectPopover();
				mcpStore.resetCurrentUserMCPKey();
				activeMethod.value = "oauth";
			}
		};
		const trackCopy = (parameter) => {
			telemetry.track("User copied MCP connection parameter", {
				parameter,
				source: "connect-dialog"
			});
		};
		const handleTokenTabCopy = (type) => {
			trackCopy({
				serverUrl: "server-url",
				accessToken: "access-token",
				mcpJson: "mcp-json"
			}[type]);
		};
		const installTitle = computed(() => i18n.baseText("settings.mcp.connectDialog.install.title", { interpolate: { client: activeClient.value?.name ?? "" } }));
		const installDescription = computed(() => i18n.baseText("settings.mcp.connectDialog.install.description", { interpolate: { client: activeClient.value?.name ?? "" } }));
		const authenticateDescription = computed(() => activeClient.value?.authCommand ? i18n.baseText("settings.mcp.connectDialog.authenticate.description.command") : i18n.baseText("settings.mcp.connectDialog.authenticate.description.mcpCommand", { interpolate: { client: activeClient.value?.name ?? "" } }));
		const oneClickDescription = computed(() => activeClient.value?.category === "web" ? i18n.baseText("settings.mcp.connectDialog.oneClick.description.web", { interpolate: { client: activeClient.value?.name ?? "" } }) : i18n.baseText("settings.mcp.connectDialog.oneClick.description.ide", { interpolate: { client: activeClient.value?.name ?? "" } }));
		const addButtonLabel = computed(() => i18n.baseText("settings.mcp.connectDialog.oneClick.button", { interpolate: { client: activeClient.value?.name ?? "" } }));
		const sharedConfigFileDescriptionKeys = {
			antigravity: "settings.mcp.connectDialog.configure.antigravity.description",
			devin: "settings.mcp.connectDialog.configure.devin.description"
		};
		const configureDescription = computed(() => i18n.baseText(sharedConfigFileDescriptionKeys[activeClient.value?.id ?? ""] ?? "settings.mcp.connectDialog.configure.description"));
		const serverUrlDescription = computed(() => i18n.baseText("settings.mcp.connectDialog.serverUrl.description", { interpolate: { client: activeClient.value?.name ?? "" } }));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: unref(mcpStore).connectPopoverOpen,
				size: "large",
				"data-test-id": "mcp-connect-dialog",
				"onUpdate:open": onOpenChange
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), { class: normalizeClass(_ctx.$style.header) }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["header-main"]) }, [
						createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.connectDialog.title")), 1)]),
							_: 1
						}),
						createVNode(unref(DialogDescription_default), { class: normalizeClass(_ctx.$style.description) }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.connectDialog.description")), 1)]),
							_: 1
						}, 8, ["class"]),
						createVNode(unref(Tabs_default), {
							"model-value": activeMethod.value,
							options: methodTabs.value,
							class: normalizeClass(_ctx.$style.tabs),
							"data-test-id": "mcp-connect-method-tabs",
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeMethod.value = $event)
						}, null, 8, [
							"model-value",
							"options",
							"class"
						])
					], 2)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [activeMethod.value === "oauth" ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 0 }, {
						default: withCtx(() => [createVNode(unref(SettingsRow_default), {
							title: unref(i18n).baseText("settings.mcp.connectDialog.yourClient.title"),
							description: unref(i18n).baseText("settings.mcp.connectDialog.yourClient.description"),
							"show-divider": !!activeClient.value
						}, {
							action: withCtx(() => [createVNode(unref(DropdownMenu_default), {
								items: clientMenuItems.value,
								placement: "bottom-end",
								"max-height": "min(var(--reka-dropdown-menu-content-available-height), 30rem)",
								"extra-popper-class": _ctx.$style["picker-menu"],
								"data-test-id": "mcp-connect-client-picker",
								onSelect: onSelectClient
							}, {
								trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									"aria-label": unref(i18n).baseText("settings.mcp.connectDialog.yourClient.title"),
									"data-test-id": "mcp-connect-client-picker-trigger"
								}, {
									default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style["picker-trigger"]) }, [
										activeClient.value?.icon ? (openBlock(), createBlock(resolveDynamicComponent(activeClient.value.icon), {
											key: 0,
											class: normalizeClass(_ctx.$style["brand-icon"])
										}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
											key: 1,
											icon: "mcp",
											size: "small",
											color: "text-light"
										})),
										createTextVNode(" " + toDisplayString(activeClient.value?.name) + " ", 1),
										createVNode(unref(N8nIcon_default), {
											icon: "chevron-down",
											size: "small"
										})
									], 2)]),
									_: 1
								}, 8, ["aria-label"])]),
								"item-leading": withCtx(({ item }) => [item.data?.kind === "client" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [item.data.client.icon ? (openBlock(), createBlock(resolveDynamicComponent(item.data.client.icon), {
									key: 0,
									class: normalizeClass(_ctx.$style["brand-icon"])
								}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
									key: 1,
									icon: "mcp",
									size: "large",
									color: "text-light"
								}))], 64)) : createCommentVNode("", true)]),
								"item-label": withCtx(({ item }) => [item.data?.kind === "header" ? (openBlock(), createElementBlock("span", {
									key: 0,
									class: normalizeClass(_ctx.$style.category)
								}, toDisplayString(item.label), 3)) : (openBlock(), createBlock(unref(N8nText_default), {
									key: 1,
									size: "medium",
									color: "text-dark",
									class: normalizeClass(_ctx.$style["client-label"])
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
									_: 2
								}, 1032, ["class"]))]),
								_: 1
							}, 8, ["items", "extra-popper-class"])]),
							_: 1
						}, 8, [
							"title",
							"description",
							"show-divider"
						]), activeClient.value?.category === "cli" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createVNode(unref(SettingsRow_default), {
								layout: "vertical",
								"show-divider": false,
								title: installTitle.value,
								description: installDescription.value
							}, {
								action: withCtx(() => [createVNode(ConnectionParameter_default, {
									id: "mcp-install-command",
									class: normalizeClass(_ctx.$style["copy-field"]),
									label: "",
									value: activeClient.value.installCommand ?? "",
									onCopy: _cache[1] || (_cache[1] = ($event) => trackCopy("install-command"))
								}, null, 8, ["class", "value"])]),
								_: 1
							}, 8, ["title", "description"]),
							createVNode(unref(SettingsRow_default), {
								layout: "vertical",
								"show-divider": false,
								title: unref(i18n).baseText("settings.mcp.connectDialog.configure.titleAlt"),
								description: unref(i18n).baseText("settings.mcp.connectDialog.configure.descriptionAlt")
							}, {
								action: withCtx(() => [createVNode(McpConfigSnippet_default, {
									class: normalizeClass(_ctx.$style["copy-field"]),
									value: activeClient.value.configSnippet ?? "",
									language: activeClient.value.id === "codex" ? "toml" : "json",
									onCopy: _cache[2] || (_cache[2] = ($event) => trackCopy("config"))
								}, null, 8, [
									"class",
									"value",
									"language"
								])]),
								_: 1
							}, 8, ["title", "description"]),
							createVNode(unref(SettingsRow_default), {
								layout: "vertical",
								"show-divider": false,
								title: unref(i18n).baseText("settings.mcp.connectDialog.authenticate.title"),
								description: authenticateDescription.value
							}, {
								action: withCtx(() => [createVNode(ConnectionParameter_default, {
									id: "mcp-auth-command",
									class: normalizeClass(_ctx.$style["copy-field"]),
									label: "",
									value: activeClient.value.authCommand ?? "/mcp",
									onCopy: _cache[3] || (_cache[3] = ($event) => trackCopy("auth-command"))
								}, null, 8, ["class", "value"])]),
								_: 1
							}, 8, ["title", "description"])
						], 64)) : activeClient.value?.category === "web" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [activeClient.value.addUrl ? (openBlock(), createBlock(unref(SettingsRow_default), {
							key: 0,
							"show-divider": false,
							title: unref(i18n).baseText("settings.mcp.connectDialog.oneClick.title"),
							description: oneClickDescription.value
						}, {
							action: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "outline",
								size: "medium",
								href: activeClient.value.addUrl,
								target: "_blank",
								"data-test-id": "mcp-connect-one-click"
							}, {
								default: withCtx(() => [activeClient.value.icon ? (openBlock(), createBlock(resolveDynamicComponent(activeClient.value.icon), {
									key: 0,
									class: normalizeClass(_ctx.$style["brand-icon"])
								}, null, 8, ["class"])) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(addButtonLabel.value), 1)]),
								_: 1
							}, 8, ["href"])]),
							_: 1
						}, 8, ["title", "description"])) : createCommentVNode("", true), createVNode(unref(SettingsRow_default), {
							layout: "vertical",
							"show-divider": false,
							title: unref(i18n).baseText("settings.mcp.connectDialog.serverUrl"),
							description: serverUrlDescription.value
						}, {
							action: withCtx(() => [createVNode(ConnectionParameter_default, {
								id: "mcp-web-server-url",
								class: normalizeClass(_ctx.$style["copy-field"]),
								label: "",
								value: serverUrl.value,
								onCopy: _cache[4] || (_cache[4] = ($event) => trackCopy("server-url"))
							}, null, 8, ["class", "value"])]),
							_: 1
						}, 8, ["title", "description"])], 64)) : activeClient.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
							activeClient.value.deepLink ? (openBlock(), createBlock(unref(SettingsRow_default), {
								key: 0,
								"show-divider": false,
								title: unref(i18n).baseText("settings.mcp.connectDialog.oneClick.title"),
								description: oneClickDescription.value
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									href: activeClient.value.deepLink,
									"data-test-id": "mcp-connect-one-click"
								}, {
									default: withCtx(() => [activeClient.value.icon ? (openBlock(), createBlock(resolveDynamicComponent(activeClient.value.icon), {
										key: 0,
										class: normalizeClass(_ctx.$style["brand-icon"])
									}, null, 8, ["class"])) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(addButtonLabel.value), 1)]),
									_: 1
								}, 8, ["href"])]),
								_: 1
							}, 8, ["title", "description"])) : createCommentVNode("", true),
							createVNode(unref(SettingsRow_default), {
								layout: "vertical",
								"show-divider": false,
								title: unref(i18n).baseText("settings.mcp.connectDialog.serverUrl"),
								description: serverUrlDescription.value
							}, {
								action: withCtx(() => [createVNode(ConnectionParameter_default, {
									id: "mcp-server-url",
									class: normalizeClass(_ctx.$style["copy-field"]),
									label: "",
									value: serverUrl.value,
									onCopy: _cache[5] || (_cache[5] = ($event) => trackCopy("server-url"))
								}, null, 8, ["class", "value"])]),
								_: 1
							}, 8, ["title", "description"]),
							createVNode(unref(SettingsRow_default), {
								layout: "vertical",
								"show-divider": false,
								title: unref(i18n).baseText("settings.mcp.connectDialog.configure.title"),
								description: configureDescription.value
							}, {
								action: withCtx(() => [createVNode(McpConfigSnippet_default, {
									class: normalizeClass(_ctx.$style["copy-field"]),
									value: activeClient.value.configSnippet ?? "",
									onCopy: _cache[6] || (_cache[6] = ($event) => trackCopy("config"))
								}, null, 8, ["class", "value"])]),
								_: 1
							}, 8, ["title", "description"])
						], 64)) : createCommentVNode("", true)]),
						_: 1
					})) : (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(McpAccessTokenTab_default, {
						"server-url": serverUrl.value,
						onCopied: handleTokenTabCopy
					}, null, 8, ["server-url"])]))]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1qcm8_1",
	"header-main": "_header-main_1qcm8_8",
	description: "_description_1qcm8_17",
	tabs: "_tabs_1qcm8_21",
	body: "_body_1qcm8_25",
	"picker-trigger": "_picker-trigger_1qcm8_29",
	"picker-menu": "_picker-menu_1qcm8_36",
	"client-label": "_client-label_1qcm8_40",
	"brand-icon": "_brand-icon_1qcm8_44",
	category: "_category_1qcm8_51",
	"copy-field": "_copy-field_1qcm8_63"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/McpConnectedClientRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var McpConnectedClientRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpConnectedClientRow",
	props: {
		client: {},
		scopeTools: {}
	},
	emits: ["click", "revoke"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const brand = computed(() => getClientBrand(props.client.name));
		const typeLabel = computed(() => {
			const type = brand.value.type;
			if (!type) return null;
			return i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}`);
		});
		const offeredScopes = computed(() => props.scopeTools ? Object.keys(props.scopeTools) : void 0);
		const accessSummary = computed(() => getAccessSummary(i18n, props.client, offeredScopes.value));
		const grantedAt = computed(() => new Date(props.client.grantedAt).toISOString());
		const metaKeypath = computed(() => typeLabel.value ? "settings.mcp.connectedClients.preview.meta" : "settings.mcp.connectedClients.preview.metaWithoutType");
		const revokeLabel = computed(() => i18n.baseText("settings.mcp.oAuthClients.table.action.revokeAccessFor", { interpolate: { name: props.client.name } }));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsRow_default), {
				title: __props.client.name,
				"show-visual": "",
				clickable: "",
				"reveal-actions-on-hover": "",
				"data-test-id": "mcp-client-preview-row",
				onClick: _cache[1] || (_cache[1] = ($event) => emit("click"))
			}, {
				visual: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.tile) }, [brand.value.icon ? (openBlock(), createBlock(resolveDynamicComponent(brand.value.icon), {
					key: 0,
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "mcp",
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"]))], 2)]),
				info: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.info) }, [
					createVNode(unref(N8nText_default), {
						bold: "",
						size: "medium",
						color: "text-dark",
						class: normalizeClass(_ctx.$style.line),
						"data-test-id": "mcp-client-preview-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.client.name), 1)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.line)
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: metaKeypath.value,
							scope: "global",
							tag: "span"
						}, createSlots({
							timeAgo: withCtx(() => [createVNode(unref(N8nTimeAgo_default), {
								date: grantedAt.value,
								locale: unref(rootStore).defaultLocale
							}, null, 8, ["date", "locale"])]),
							_: 2
						}, [typeLabel.value ? {
							name: "type",
							fn: withCtx(() => [createTextVNode(toDisplayString(typeLabel.value), 1)]),
							key: "0"
						} : void 0]), 1032, ["keypath"])]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-light",
						class: normalizeClass(_ctx.$style.line),
						"data-test-id": "mcp-client-preview-access"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(accessSummary.value), 1)]),
						_: 1
					}, 8, ["class"])
				], 2)]),
				action: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					label: unref(i18n).baseText("settings.mcp.oAuthClients.table.action.revokeAccess"),
					"aria-label": revokeLabel.value,
					"data-test-id": "mcp-client-preview-revoke-button",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("revoke"))
				}, null, 8, ["label", "aria-label"])]),
				_: 1
			}, 8, ["title"]);
		};
	}
}), [["__cssModules", { "$style": {
	tile: "_tile_oqi6l_2",
	icon: "_icon_oqi6l_11",
	info: "_info_oqi6l_19",
	line: "_line_oqi6l_26"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/McpStatusControl.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var McpStatusControl_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpStatusControl",
	props: {
		disabled: {
			type: Boolean,
			default: false
		},
		loading: {
			type: Boolean,
			default: false
		},
		managedByEnv: {
			type: Boolean,
			default: false
		}
	},
	emits: ["disable"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const disabledTooltip = computed(() => props.managedByEnv ? i18n.baseText("settings.mcp.managedByEnv.tooltip") : i18n.baseText("settings.mcp.toggle.disabled.tooltip"));
		const menuItems = computed(() => [{
			id: "disable",
			label: i18n.baseText("settings.mcp.status.disable")
		}]);
		const onSelect = (id) => {
			if (id === "disable") emit("disable");
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				content: disabledTooltip.value,
				disabled: !props.disabled,
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(DropdownMenu_default), {
					items: menuItems.value,
					placement: "bottom-end",
					disabled: props.disabled || props.loading,
					"data-test-id": "mcp-status-control",
					onSelect
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "medium",
						disabled: props.disabled,
						loading: props.loading,
						"aria-label": unref(i18n).baseText("settings.mcp.status.ariaLabel"),
						"data-test-id": "mcp-status-control-trigger"
					}, {
						default: withCtx(() => [
							createBaseVNode("span", { class: normalizeClass(_ctx.$style.dot) }, null, 2),
							createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.mcp.header.toggle.enabled")) + " ", 1),
							createVNode(unref(N8nIcon_default), {
								icon: "chevron-down",
								size: "small"
							})
						]),
						_: 1
					}, 8, [
						"disabled",
						"loading",
						"aria-label"
					])]),
					"item-leading": withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "power",
						size: "large",
						color: "danger"
					})]),
					"item-label": withCtx(({ item }) => [createVNode(unref(N8nText_default), {
						size: "medium",
						color: "danger",
						"data-test-id": "mcp-status-disable-item"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
						_: 2
					}, 1024)]),
					_: 1
				}, 8, ["items", "disabled"])]),
				_: 1
			}, 8, ["content", "disabled"]);
		};
	}
}), [["__cssModules", { "$style": {
	dot: "_dot_ex8jt_1",
	"mcp-status-pulse": "_mcp-status-pulse_ex8jt_1"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/SettingsMCPView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SettingsMCPView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsMCPView",
	setup(__props) {
		const i18n = useI18n();
		const discoverySettings = tryUse(mcpDiscoverySettings);
		const discoveryOverrides = computed(() => discoverySettings?.overrides());
		const connectHintDismissed = ref(false);
		const toast = useToast();
		const documentTitle = useDocumentTitle({ releaseChannel: useSettingsStore().settings.releaseChannel });
		const mcp = useMcp();
		const router = useRouter();
		const mcpStore = useMCPStore();
		const settingsStore = useSettingsStore();
		const rbacStore = useRBACStore();
		const exposeAllOffer = tryUse(mcpExposeAllOffer);
		const isExposeAllOfferEnabled = computed(() => exposeAllOffer?.isEnabled() ?? false);
		const agentsEnabled = computed(() => settingsStore.isAgentsEnabled);
		const mcpStatusLoading = ref(false);
		const showDisableDialog = ref(false);
		const isLoadingClients = ref(true);
		const canManageMcpInstance = computed(() => rbacStore.hasScope("mcp:manage"));
		const canToggleMCP = computed(() => canManageMcpInstance.value && !mcpStore.mcpManagedByEnv);
		const exposedWorkflowsCount = ref(null);
		const autoExposeSaving = ref(false);
		const showCallbackUrlsDialog = ref(false);
		const savingCallbackUrls = ref(false);
		const onAutoExposeSwitchUpdate = (value) => {
			onToggleAutoExpose(value === true);
		};
		const onToggleAutoExpose = async (value) => {
			autoExposeSaving.value = true;
			try {
				const updated = await mcpStore.setAutoExposeNewWorkflows(value);
				mcp.trackAutoExposeToggled({
					enabled: updated,
					source: "settings"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.autoExpose.error.title"));
			} finally {
				autoExposeSaving.value = false;
			}
		};
		const showInstanceCapacityNotice = computed(() => canManageMcpInstance.value && mcpStore.instanceClientStats?.atCapacity === true);
		const instanceCapacityNoticeContent = computed(() => {
			const stats = mcpStore.instanceClientStats;
			if (!stats) return "";
			return i18n.baseText("settings.mcp.instanceCapacity.warning", { interpolate: {
				count: String(stats.count),
				limit: String(stats.limit)
			} });
		});
		const workflowsExposedValue = computed(() => exposedWorkflowsCount.value === null ? "—" : i18n.baseText("settings.mcp.workflowsExposed.count", {
			adjustToNumber: exposedWorkflowsCount.value,
			interpolate: { count: String(exposedWorkflowsCount.value) }
		}));
		const exposedAgentsCount = ref(null);
		const agentsExposedValue = computed(() => exposedAgentsCount.value === null ? "—" : i18n.baseText("settings.mcp.agentsExposed.count", {
			adjustToNumber: exposedAgentsCount.value,
			interpolate: { count: String(exposedAgentsCount.value) }
		}));
		const callbackUrlsValue = computed(() => mcpStore.allowedRedirectUris.length === 0 ? i18n.baseText("settings.mcp.callbackUrls.value.all") : i18n.baseText("settings.mcp.callbackUrls.value.count", {
			adjustToNumber: mcpStore.allowedRedirectUris.length,
			interpolate: { count: String(mcpStore.allowedRedirectUris.length) }
		}));
		const fetchExposedWorkflowsCount = async () => {
			try {
				const response = await mcpStore.fetchWorkflowsAvailableForMCP(1, 1);
				exposedWorkflowsCount.value = response.count;
			} catch (error) {
				toast.showError(error, i18n.baseText("workflows.list.error.fetching"));
			}
		};
		const fetchExposedAgentsCount = async () => {
			if (!agentsEnabled.value) return;
			try {
				const response = await mcpStore.fetchAgentsAvailableForMCP(1, 1);
				exposedAgentsCount.value = response.count;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.agents.list.error.fetching"));
			}
		};
		const onToggleMCPAccess = async (enabled) => {
			try {
				mcpStatusLoading.value = true;
				const updated = await mcpStore.setMcpAccessEnabled(enabled);
				if (updated) await Promise.all([
					fetchExposedWorkflowsCount(),
					fetchExposedAgentsCount(),
					fetchConnectedClientsPreview()
				]);
				mcp.trackUserToggledMcpAccess(enabled);
				if (enabled && updated) exposeAllOffer?.offer(async () => {
					await Promise.all([fetchExposedWorkflowsCount(), fetchExposedAgentsCount()]);
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.toggle.error"));
			} finally {
				mcpStatusLoading.value = false;
			}
		};
		const onConfirmDisable = async () => {
			showDisableDialog.value = false;
			await onToggleMCPAccess(false);
		};
		/**
		* Loads the user's own first clients for the inline preview, along with the
		* totals the "N clients have access" count renders. Only the user's own clients
		* are previewed here; other users' clients stay behind the clients page, which
		* gates them by permission.
		*/
		const fetchConnectedClientsPreview = async () => {
			isLoadingClients.value = true;
			try {
				await mcpStore.fetchOAuthClientsPreview();
				isLoadingClients.value = false;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.fetching.oAuthClients"));
			}
		};
		const previewClients = computed(() => mcpStore.oauthClientsPreview);
		/** Instance-wide count when the user can see it, own count otherwise. */
		const connectedClientsTotal = computed(() => mcpStore.oauthClientTotals.all ?? mcpStore.oauthClientTotals.mine);
		const showViewAllRow = computed(() => previewClients.value.length === 0 || connectedClientsTotal.value > previewClients.value.length);
		const onConnectClient = () => {
			mcp.trackConnectClientClicked("settings");
			mcpStore.openConnectPopover();
		};
		const openClientsView = () => {
			const { mine, all } = mcpStore.oauthClientTotals;
			const tab = mine === 0 && (all ?? 0) > 0 ? "all" : "mine";
			router.push({
				name: MCP_CLIENTS_VIEW,
				query: { tab }
			});
		};
		const detailsClient = ref(null);
		const detailsOpen = ref(false);
		const openClientDetails = (client) => {
			detailsClient.value = client;
			detailsOpen.value = true;
		};
		const { revokeClient, revoking, isRevokingForOther, requestRevoke, cancelRevoke, confirmRevoke } = useOAuthClientRevoke({
			refreshList: false,
			onRevoked: fetchConnectedClientsPreview
		});
		const openWorkflowsView = () => {
			router.push({ name: MCP_WORKFLOWS_VIEW });
		};
		const openAgentsView = () => {
			router.push({ name: MCP_AGENTS_VIEW });
		};
		const loadRedirectUris = async () => {
			try {
				await mcpStore.fetchAllowedRedirectUris();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.allowedRedirectUris.error.loading"));
			}
		};
		const onSaveCallbackUrls = async (uris) => {
			try {
				savingCallbackUrls.value = true;
				await mcpStore.setAllowedRedirectUris(uris);
				showCallbackUrlsDialog.value = false;
				toast.showMessage({
					type: "success",
					title: i18n.baseText("settings.mcp.allowedRedirectUris.success")
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.allowedRedirectUris.error.saving"));
			} finally {
				savingCallbackUrls.value = false;
			}
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.mcp"));
			if (!mcpStore.mcpAccessEnabled) return;
			const fetches = [
				fetchExposedWorkflowsCount(),
				fetchExposedAgentsCount(),
				fetchConnectedClientsPreview()
			];
			if (canManageMcpInstance.value) {
				fetches.push(loadRedirectUris());
				fetches.push(mcpStore.getInstanceClientStats());
			}
			await Promise.all(fetches);
		});
		onBeforeUnmount(() => {
			mcpStore.clearOAuthClientsPreview();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), { class: normalizeClass(_ctx.$style.layout) }, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.mcp.page.title"),
						description: discoveryOverrides.value?.description ?? unref(i18n).baseText("settings.mcp.page.description"),
						"docs-leading-text": discoveryOverrides.value?.docsLeadingText,
						"docs-url": unref(MCP_DOCS_PAGE_URL),
						"docs-label": unref(i18n).baseText("settings.mcp.page.docsLabel"),
						"data-test-id": "mcp-settings-header"
					}, null, 8, [
						"title",
						"description",
						"docs-leading-text",
						"docs-url",
						"docs-label"
					]),
					!unref(mcpStore).mcpAccessEnabled ? (openBlock(), createBlock(MCPEmptyState_default, {
						key: 0,
						disabled: !canToggleMCP.value,
						loading: mcpStatusLoading.value,
						"managed-by-env": unref(mcpStore).mcpManagedByEnv,
						onTurnOnMcp: _cache[0] || (_cache[0] = ($event) => onToggleMCPAccess(true))
					}, null, 8, [
						"disabled",
						"loading",
						"managed-by-env"
					])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						showInstanceCapacityNotice.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
							key: 0,
							theme: "warning",
							"data-test-id": "mcp-instance-capacity-notice",
							content: instanceCapacityNoticeContent.value
						}, null, 8, ["content"])) : createCommentVNode("", true),
						createVNode(unref(SettingsSection_default), {
							title: unref(i18n).baseText("settings.mcp.connectionDetails.title"),
							"data-test-id": "mcp-enabled-section"
						}, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [createVNode(unref(SettingsRow_default), {
									title: unref(i18n).baseText("settings.mcp.status.title"),
									description: unref(i18n).baseText("settings.mcp.status.description")
								}, {
									action: withCtx(() => [createVNode(McpStatusControl_default, {
										disabled: !canToggleMCP.value,
										loading: mcpStatusLoading.value,
										"managed-by-env": unref(mcpStore).mcpManagedByEnv,
										onDisable: _cache[1] || (_cache[1] = ($event) => showDisableDialog.value = true)
									}, null, 8, [
										"disabled",
										"loading",
										"managed-by-env"
									])]),
									_: 1
								}, 8, ["title", "description"]), createVNode(unref(SettingsRow_default), {
									title: discoveryOverrides.value?.clientTitle ?? unref(i18n).baseText("settings.mcp.yourClient.title"),
									description: discoveryOverrides.value?.clientDescription ?? unref(i18n).baseText("settings.mcp.yourClient.description")
								}, {
									action: withCtx(() => [(openBlock(), createBlock(resolveDynamicComponent(unref(discoverySettings)?.connectHint ?? "span"), {
										dismissed: connectHintDismissed.value,
										"onUpdate:dismissed": _cache[2] || (_cache[2] = ($event) => connectHintDismissed.value = $event)
									}, {
										default: withCtx(() => [createVNode(unref(N8nButton_default), {
											variant: discoveryOverrides.value?.connectVariant ?? "outline",
											size: "medium",
											icon: "mcp",
											label: unref(i18n).baseText("settings.mcp.yourClient.connect"),
											"data-test-id": "mcp-connect-client-button",
											onClick: onConnectClient
										}, null, 8, ["variant", "label"])]),
										_: 1
									}, 40, ["dismissed"]))]),
									_: 1
								}, 8, ["title", "description"])]),
								_: 1
							})]),
							_: 1
						}, 8, ["title"]),
						createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("settings.mcp.access.title") }, {
							default: withCtx(() => [
								createVNode(unref(SettingsRowGroup_default), null, {
									default: withCtx(() => [createVNode(unref(SettingsRow_default), {
										title: unref(i18n).baseText("settings.mcp.workflowsExposed.title"),
										description: unref(i18n).baseText("settings.mcp.workflowsExposed.description"),
										clickable: "",
										"data-test-id": "mcp-workflows-exposed-row",
										onClick: openWorkflowsView
									}, {
										action: withCtx(() => [createVNode(unref(SettingsRowConfigure_default), { value: workflowsExposedValue.value }, null, 8, ["value"])]),
										_: 1
									}, 8, ["title", "description"]), canManageMcpInstance.value && isExposeAllOfferEnabled.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
										key: 0,
										title: unref(i18n).baseText("settings.mcp.autoExpose.title"),
										description: unref(i18n).baseText("settings.mcp.autoExpose.description")
									}, {
										action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
											"data-test-id": "mcp-auto-expose-toggle",
											size: "large",
											"model-value": unref(mcpStore).autoExposeNewWorkflows,
											disabled: unref(mcpStore).mcpManagedByEnv || autoExposeSaving.value,
											"onUpdate:modelValue": onAutoExposeSwitchUpdate
										}, null, 8, ["model-value", "disabled"])]),
										_: 1
									}, 8, ["title", "description"])) : createCommentVNode("", true)]),
									_: 1
								}),
								agentsEnabled.value ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 0 }, {
									default: withCtx(() => [createVNode(unref(SettingsRow_default), {
										title: unref(i18n).baseText("settings.mcp.agentsExposed.title"),
										description: unref(i18n).baseText("settings.mcp.agentsExposed.description"),
										clickable: "",
										"data-test-id": "mcp-agents-exposed-row",
										onClick: openAgentsView
									}, {
										action: withCtx(() => [createVNode(unref(SettingsRowConfigure_default), { value: agentsExposedValue.value }, null, 8, ["value"])]),
										_: 1
									}, 8, ["title", "description"])]),
									_: 1
								})) : createCommentVNode("", true),
								canManageMcpInstance.value ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 1 }, {
									default: withCtx(() => [createVNode(unref(SettingsRow_default), {
										title: unref(i18n).baseText("settings.mcp.callbackUrls.title"),
										description: unref(i18n).baseText("settings.mcp.callbackUrls.description"),
										clickable: "",
										"data-test-id": "mcp-callback-urls-row",
										onClick: _cache[3] || (_cache[3] = ($event) => showCallbackUrlsDialog.value = true)
									}, {
										action: withCtx(() => [createVNode(unref(SettingsRowConfigure_default), { value: callbackUrlsValue.value }, null, 8, ["value"])]),
										_: 1
									}, 8, ["title", "description"])]),
									_: 1
								})) : createCommentVNode("", true)
							]),
							_: 1
						}, 8, ["title"]),
						createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("settings.mcp.connectedClients.title") }, {
							default: withCtx(() => [previewClients.value.length > 0 ? (openBlock(), createBlock(unref(SettingsRowGroup_default), {
								key: 0,
								"data-test-id": "mcp-clients-preview"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(previewClients.value, (client) => {
									return openBlock(), createBlock(McpConnectedClientRow_default, {
										key: client.id,
										client,
										"scope-tools": unref(mcpStore).oauthClientScopeTools,
										onClick: ($event) => openClientDetails(client),
										onRevoke: ($event) => unref(requestRevoke)(client)
									}, null, 8, [
										"client",
										"scope-tools",
										"onClick",
										"onRevoke"
									]);
								}), 128))]),
								_: 1
							})) : createCommentVNode("", true), showViewAllRow.value ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 1 }, {
								default: withCtx(() => [createVNode(unref(SettingsRow_default), {
									title: unref(i18n).baseText("settings.mcp.connectedClients.viewAll.title"),
									description: isLoadingClients.value ? unref("—") : unref(i18n).baseText("settings.mcp.connectedClients.viewAll.description", {
										adjustToNumber: connectedClientsTotal.value,
										interpolate: { count: String(connectedClientsTotal.value) }
									}),
									clickable: "",
									"data-test-id": "mcp-clients-view-all-row",
									onClick: openClientsView
								}, {
									action: withCtx(() => [createVNode(unref(SettingsRowConfigure_default), { value: unref(i18n).baseText("settings.mcp.connectedClients.viewAll.action") }, null, 8, ["value"])]),
									_: 1
								}, 8, ["title", "description"])]),
								_: 1
							})) : createCommentVNode("", true)]),
							_: 1
						}, 8, ["title"])
					], 64)),
					createVNode(unref(Dialog_default), {
						open: showDisableDialog.value,
						"onUpdate:open": _cache[4] || (_cache[4] = ($event) => showDisableDialog.value = $event),
						size: "small",
						header: unref(i18n).baseText("settings.mcp.status.disableDialog.title"),
						"data-test-id": "mcp-disable-dialog"
					}, {
						default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
							default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.status.disableDialog.description")), 1)]),
								_: 1
							})]),
							_: 1
						}), createVNode(unref(DialogFooter_default), null, {
							default: withCtx(() => [createVNode(unref(DialogClose_default), { "as-child": "" }, {
								default: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									label: unref(i18n).baseText("generic.cancel")
								}, null, 8, ["label"])]),
								_: 1
							}), createVNode(unref(N8nButton_default), {
								variant: "destructive",
								label: unref(i18n).baseText("settings.mcp.status.disableDialog.confirm"),
								"data-test-id": "mcp-disable-dialog-confirm",
								onClick: onConfirmDisable
							}, null, 8, ["label"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["open", "header"]),
					createVNode(McpConnectClientDialog_default),
					createVNode(OAuthClientDetailsModal_default, {
						open: detailsOpen.value,
						"onUpdate:open": _cache[5] || (_cache[5] = ($event) => detailsOpen.value = $event),
						client: detailsClient.value,
						onRevoke: unref(requestRevoke)
					}, null, 8, [
						"open",
						"client",
						"onRevoke"
					]),
					createVNode(RevokeOAuthClientConfirmModal_default, {
						client: unref(revokeClient),
						open: !!unref(revokeClient),
						loading: unref(revoking),
						"revoking-for-other": !!unref(revokeClient) && unref(isRevokingForOther)(unref(revokeClient)),
						onConfirm: unref(confirmRevoke),
						onCancel: unref(cancelRevoke),
						"onUpdate:open": unref(cancelRevoke)
					}, null, 8, [
						"client",
						"open",
						"loading",
						"revoking-for-other",
						"onConfirm",
						"onCancel",
						"onUpdate:open"
					]),
					createVNode(McpAllowedCallbackUrlsDialog_default, {
						open: showCallbackUrlsDialog.value,
						"onUpdate:open": _cache[6] || (_cache[6] = ($event) => showCallbackUrlsDialog.value = $event),
						uris: unref(mcpStore).allowedRedirectUris,
						saving: savingCallbackUrls.value,
						onSave: onSaveCallbackUrls
					}, null, 8, [
						"open",
						"uris",
						"saving"
					])
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": { layout: "_layout_121n7_2" } }]]);
//#endregion
export { SettingsMCPView_default as default };
