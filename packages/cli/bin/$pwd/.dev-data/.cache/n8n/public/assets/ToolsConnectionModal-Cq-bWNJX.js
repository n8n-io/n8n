import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Ju as useResizeObserver, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xd as guardReactiveProps, Xf as unref, _p as normalizeClass, ef as inject, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, pd as useDebounceFn, rf as mergeProps, vf as resolveDynamicComponent, vp as normalizeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { KA as Dialog_default, Oj as N8nRecycleScroller_default, SN as _plugin_vue_export_helper_default, WA as DialogBody_default, Yf as RestrictedNodePopover_default, _N as N8nText_default, bN as N8nSpinner_default, cN as Input_default, eC as DEBOUNCE_TIME, fN as N8nTooltip_default, jN as useI18n, nN as N8nBadge_default, qj as N8nNodeIcon_default, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default, yj as Tabs_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as partitionLast } from "./partition-last-BsUCZ1RN.js";
import { i as TOOL_CONNECTION_CREDITS_LABEL_KEY, n as CATEGORY_BY_KIND, o as hasToolConnection, r as TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, t as ToolCredentialPicker_default } from "./ToolCredentialPicker-Clmo6S9M.js";
import { t as ToolIcon_default } from "./ToolIcon-JHi_v9xF.js";
//#region src/features/shared/toolsConnection/toolItemIcon.ts
function resolveToolItemIcon(item) {
	return item.iconSource ?? null;
}
/**
* Variant of `resolveToolItemIcon` for consumers that render through
* `N8nNodeIcon`, which cannot draw an avatar tile — an avatar source
* degrades to its glyph instead.
*/
function resolveToolItemNodeIcon(item) {
	const source = item.iconSource;
	if (!source) return null;
	if (source.type === "avatar") return {
		type: "icon",
		name: source.personalisation.icon
	};
	return source;
}
//#endregion
//#region src/features/shared/toolsConnection/ToolRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["data-row-kind"];
var _hoisted_2$1 = ["aria-label"];
var ToolRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolRow",
	props: {
		item: {},
		showConnectAction: { type: Boolean },
		connectLabel: {},
		connectAriaLabel: {},
		connectedLabel: {}
	},
	emits: [
		"open-detail",
		"connect",
		"select-credential",
		"credential-dropdown-open",
		"first-credential-connect",
		"new-credential-connect"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const credentialAdapter = inject(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, null);
		const creditsLabelKey = inject(TOOL_CONNECTION_CREDITS_LABEL_KEY, null);
		/**
		* Gateway-backed rows share the credits pill copy with the node creator and
		* model selector: "Free credits" until a top-up or a depleted allowance flips
		* it to a blue "n8n credits" pill. Defaults to "Free credits" when no consumer
		* injects the store-backed key.
		*/
		const creditsPill = computed(() => {
			const key = creditsLabelKey?.value ?? "generic.freeCredits";
			return {
				text: i18n.baseText(key),
				type: key === "generic.freeCredits" ? "default" : "info"
			};
		});
		/**
		* The picker needs both credential definitions and an injected adapter.
		* Consumers that manage credentials elsewhere simply get the static marker below.
		*/
		const shouldShowCredentialPicker = computed(() => {
			if (!credentialAdapter || !props.item.credentials?.length) return false;
			if (props.item.status === "connecting") return false;
			if (hasToolConnection(props.item.status)) return true;
			if (props.item.credentials?.some(({ aiGateway }) => aiGateway)) return true;
			return Boolean(props.item.credentials?.some(({ authType }) => credentialAdapter.getCredentialsByType(authType).length > 0));
		});
		const placeholderIcon = computed(() => {
			switch (props.item.kind) {
				case "service":
				case "mcp-server": return "plug";
				case "workflow": return "workflow";
				case "agent": return "bot";
				case "data-store": return "database";
				default: return "toolbox";
			}
		});
		const resolvedIcon = computed(() => resolveToolItemIcon(props.item));
		const serviceActionLabel = computed(() => i18n.baseText(props.item.status === "connected" ? "generic.settings" : "tools.connection.action.setup"));
		const actionLabel = computed(() => {
			if (props.item.communityPreview) return i18n.baseText("communityNodeDetails.install");
			if (props.item.status === "disconnected") return i18n.baseText("tools.connection.action.reconnect");
			return props.connectLabel ?? i18n.baseText("tools.connection.action.connect");
		});
		const installBlocked = computed(() => Boolean(props.item.communityPreview) && Boolean(props.item.installDisabled));
		const isDisabled = computed(() => Boolean(props.item.disabled));
		const isRowNavigable = computed(() => props.item.kind !== "service");
		const restriction = computed(() => props.item.kind === "node" ? props.item.restriction : void 0);
		const isActivationBlocked = computed(() => Boolean(restriction.value) && !hasToolConnection(props.item.status));
		const rowRef = ref(null);
		/**
		* Skill descriptions can be long, so a skill row cuts its description to two lines. The full
		* text shows in a tooltip, but only when the text is cut.
		*/
		const clampsDescription = computed(() => props.item.kind === "skill");
		const descriptionRef = ref(null);
		const isDescriptionTruncated = ref(false);
		function measureDescription() {
			const element = descriptionRef.value?.$el;
			isDescriptionTruncated.value = element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 1;
		}
		onMounted(() => {
			if (clampsDescription.value) measureDescription();
		});
		useResizeObserver(computed(() => clampsDescription.value ? descriptionRef.value?.$el : null), measureDescription);
		watch(() => props.item.description, async () => {
			if (!clampsDescription.value) return;
			await nextTick();
			measureDescription();
		});
		/**
		* For most rows the button only repeated what clicking the row already does.
		* What survives is the pair that goes somewhere the row body cannot: installing
		* a community package, and connecting an MCP server without a detour through
		* its detail view.
		*/
		const hasDirectAction = computed(() => props.showConnectAction || Boolean(props.item.communityPreview) || props.item.kind === "mcp-server");
		function handleRowClick() {
			if (props.item.disabled) return;
			if (isActivationBlocked.value) return;
			if (props.item.status === "connecting") return;
			emit("open-detail", props.item);
		}
		const mainActionRef = ref(null);
		/** Set when "Add" had focus, so focus can move once the button is gone. */
		let refocusAfterAdd = false;
		function handleSkillAdd(event) {
			refocusAfterAdd = event.currentTarget instanceof HTMLElement && event.currentTarget.contains(document.activeElement);
			emit("connect", props.item);
		}
		/**
		* "Added" is static text, so the focused "Add" button leaves the page when the
		* skill is added. Move focus to the row's own button (it opens the skill) so
		* keyboard users stay on the same row instead of falling back to the page.
		*/
		watch(() => props.item.kind === "skill" && props.item.attached, async (attached) => {
			if (!attached || !refocusAfterAdd) return;
			refocusAfterAdd = false;
			await nextTick();
			mainActionRef.value?.focus();
		});
		function handleConnect() {
			emit("connect", props.item);
			if (props.item.credentials?.length) emit("first-credential-connect", props.item);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "rowRef",
				ref: rowRef,
				class: normalizeClass([
					_ctx.$style.row,
					_ctx.$style[`row--${__props.item.kind}`],
					{
						[_ctx.$style.rowDisabled]: isDisabled.value,
						[_ctx.$style.rowRestricted]: !!restriction.value,
						[_ctx.$style.rowBlocked]: isActivationBlocked.value
					}
				]),
				"data-test-id": `tools-connection-row`,
				"data-row-kind": __props.item.kind
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.main) }, [(openBlock(), createBlock(resolveDynamicComponent(isRowNavigable.value ? "button" : "div"), {
				ref_key: "mainActionRef",
				ref: mainActionRef,
				type: isRowNavigable.value ? "button" : void 0,
				class: normalizeClass([_ctx.$style.mainAction, { [_ctx.$style.mainActionStatic]: !isRowNavigable.value }]),
				disabled: isRowNavigable.value ? isDisabled.value || __props.item.status === "connecting" : void 0,
				"aria-disabled": isActivationBlocked.value || void 0,
				"data-test-id": "tools-connection-row-main",
				onClick: _cache[0] || (_cache[0] = ($event) => isRowNavigable.value && handleRowClick())
			}, {
				default: withCtx(() => [__props.item.kind === "workflow" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
					createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.workflowIcon),
						"aria-hidden": "true"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "workflow",
						size: 20
					})], 2),
					createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.workflowTitle),
						tag: "span",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.title), 1)]),
						_: 1
					}, 8, ["class"]),
					__props.item.warning ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.workflowWarning),
						tag: "span",
						size: "small",
						color: "warning",
						"data-test-id": "tools-connection-row-warning"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.warning), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [__props.item.kind !== "skill" ? (openBlock(), createBlock(ToolIcon_default, {
					key: 0,
					source: resolvedIcon.value,
					"fallback-icon": placeholderIcon.value
				}, null, 8, ["source", "fallback-icon"])) : createCommentVNode("", true), createBaseVNode("span", { class: normalizeClass(_ctx.$style.text) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.titleRow) }, [
					createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.title),
						tag: "span",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.title), 1)]),
						_: 1
					}, 8, ["class"]),
					__props.item.verified ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("communityNodeInfo.approved"),
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "shield-half",
							size: 14,
							class: normalizeClass(_ctx.$style.verifiedIcon),
							"aria-label": unref(i18n).baseText("communityNodeInfo.approved"),
							"data-test-id": "tools-connection-row-verified-badge"
						}, null, 8, ["class", "aria-label"])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true),
					__props.item.freeCredits ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 1,
						size: "xxsmall",
						variant: creditsPill.value.type === "info" ? "info" : "success",
						"data-test-id": "tools-connection-row-free-credits"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(creditsPill.value.text), 1)]),
						_: 1
					}, 8, ["variant"])) : createCommentVNode("", true)
				], 2), __props.item.description ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					disabled: !isDescriptionTruncated.value,
					"as-child": "",
					placement: "top-start",
					"content-class": _ctx.$style.descriptionTooltip
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(__props.item.description), 1)]),
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						ref_key: "descriptionRef",
						ref: descriptionRef,
						class: normalizeClass([_ctx.$style.description, clampsDescription.value && _ctx.$style.descriptionClamped]),
						tag: "span",
						size: "small",
						color: "text-light",
						"data-cut": isDescriptionTruncated.value || void 0,
						"data-test-id": "tools-connection-row-description"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.description), 1)]),
						_: 1
					}, 8, ["class", "data-cut"])]),
					_: 1
				}, 8, ["disabled", "content-class"])) : createCommentVNode("", true)], 2)], 64))]),
				_: 1
			}, 8, [
				"type",
				"class",
				"disabled",
				"aria-disabled"
			])), renderSlot(_ctx.$slots, "footer")], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.action) }, [restriction.value ? (openBlock(), createBlock(unref(RestrictedNodePopover_default), {
				key: 0,
				"node-type-name": __props.item.title,
				restriction: restriction.value,
				anchor: rowRef.value,
				"side-offset": 48
			}, null, 8, [
				"node-type-name",
				"restriction",
				"anchor"
			])) : isDisabled.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 1,
				disabled: !__props.item.disabledReason,
				placement: "top"
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(__props.item.disabledReason), 1)]),
				default: withCtx(() => [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.disabledMarker),
					role: "img",
					tabindex: "0",
					"aria-label": __props.item.disabledReason,
					"data-test-id": "tools-connection-row-disabled"
				}, [createVNode(unref(N8nIcon_default), {
					icon: "info",
					size: 14,
					color: "text-light"
				})], 10, _hoisted_2$1)]),
				_: 1
			}, 8, ["disabled"])) : __props.item.kind === "skill" && !__props.item.attached ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 2,
				variant: "outline",
				size: "small",
				"aria-label": __props.connectAriaLabel,
				"data-test-id": "tools-connection-row-attach",
				onClick: handleSkillAdd
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.connectLabel ?? unref(i18n).baseText("generic.add")), 1)]),
				_: 1
			}, 8, ["aria-label"])) : __props.item.kind === "skill" ? (openBlock(), createElementBlock("span", {
				key: 3,
				class: normalizeClass(_ctx.$style.statusMarker),
				"data-test-id": "tools-connection-row-added"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "check",
				size: 14,
				class: normalizeClass(_ctx.$style.statusIconConnected),
				"aria-hidden": "true"
			}, null, 8, ["class"]), createTextVNode(" " + toDisplayString(__props.connectedLabel ?? unref(i18n).baseText("tools.connection.action.added")), 1)], 2)) : __props.item.kind === "service" ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 4,
				variant: "outline",
				size: "small",
				label: serviceActionLabel.value,
				"data-test-id": "tools-connection-row-service-action",
				onClick: handleRowClick
			}, null, 8, ["label"])) : shouldShowCredentialPicker.value ? (openBlock(), createBlock(ToolCredentialPicker_default, {
				key: 5,
				item: __props.item,
				credentials: __props.item.credentials ?? [],
				"connect-variant": "outline",
				onSelectCredential: _cache[1] || (_cache[1] = (toolItem, authType, credentialId) => emit("select-credential", toolItem, authType, credentialId)),
				onCredentialDropdownOpen: _cache[2] || (_cache[2] = ($event) => emit("credential-dropdown-open", $event)),
				onFirstCredentialConnect: _cache[3] || (_cache[3] = ($event) => emit("first-credential-connect", $event)),
				onNewCredentialConnect: _cache[4] || (_cache[4] = ($event) => emit("new-credential-connect", $event))
			}, null, 8, ["item", "credentials"])) : __props.item.status === "connected" ? (openBlock(), createElementBlock("span", {
				key: 6,
				class: normalizeClass(_ctx.$style.statusMarker),
				"data-test-id": "tools-connection-row-connected"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "check",
				size: 14,
				class: normalizeClass(_ctx.$style.statusIconConnected),
				"aria-hidden": "true"
			}, null, 8, ["class"]), createTextVNode(" " + toDisplayString(__props.connectedLabel ?? unref(i18n).baseText("tools.connection.action.connected")), 1)], 2)) : __props.item.status === "connecting" ? (openBlock(), createElementBlock("span", {
				key: 7,
				class: normalizeClass(_ctx.$style.statusMarker),
				"data-test-id": "tools-connection-row-connecting"
			}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("tools.connection.action.connecting")), 1)], 2)) : hasDirectAction.value ? (openBlock(), createElementBlock(Fragment, { key: 8 }, [installBlocked.value && !__props.item.installing ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: unref(i18n).baseText("tools.connection.install.contactAdmin"),
				placement: "top"
			}, {
				default: withCtx(() => [createBaseVNode("span", null, [createVNode(unref(N8nButton_default), {
					label: actionLabel.value,
					variant: "outline",
					size: "small",
					disabled: "",
					"data-test-id": "tools-connection-row-install"
				}, null, 8, ["label"])])]),
				_: 1
			}, 8, ["content"])) : (openBlock(), createBlock(unref(N8nButton_default), {
				key: 1,
				variant: "outline",
				size: "small",
				loading: __props.item.installing,
				"aria-label": __props.connectAriaLabel,
				"data-test-id": __props.item.communityPreview ? "tools-connection-row-install" : "tools-connection-row-connect",
				onClick: handleConnect
			}, {
				default: withCtx(() => [!__props.item.communityPreview && __props.item.status === "disconnected" ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: "circle-x",
					size: 14,
					class: normalizeClass(_ctx.$style.statusIconDisconnected),
					"aria-hidden": "true"
				}, null, 8, ["class"])) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(actionLabel.value), 1)]),
				_: 1
			}, 8, [
				"loading",
				"aria-label",
				"data-test-id"
			]))], 64)) : __props.item.status === "disconnected" ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 9,
				variant: "outline",
				size: "small",
				"data-test-id": "tools-connection-row-disconnected",
				onClick: handleRowClick
			}, {
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "circle-x",
					size: 14,
					class: normalizeClass(_ctx.$style.statusIconDisconnected),
					"aria-hidden": "true"
				}, null, 8, ["class"]), createTextVNode(" " + toDisplayString(unref(i18n).baseText("tools.connection.action.reconnect")), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 2)], 10, _hoisted_1$1);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_148z1_1",
	"row--skill": "_row--skill_148z1_15",
	rowDisabled: "_rowDisabled_148z1_19",
	rowRestricted: "_rowRestricted_148z1_26",
	mainAction: "_mainAction_148z1_26",
	rowBlocked: "_rowBlocked_148z1_30",
	main: "_main_148z1_26",
	mainActionStatic: "_mainActionStatic_148z1_67",
	"row--workflow": "_row--workflow_148z1_71",
	workflowIcon: "_workflowIcon_148z1_75",
	text: "_text_148z1_85",
	workflowTitle: "_workflowTitle_148z1_93",
	workflowWarning: "_workflowWarning_148z1_99",
	titleRow: "_titleRow_148z1_103",
	title: "_title_148z1_103",
	verifiedIcon: "_verifiedIcon_148z1_114",
	description: "_description_148z1_120",
	descriptionClamped: "_descriptionClamped_148z1_125",
	descriptionTooltip: "_descriptionTooltip_148z1_133",
	action: "_action_148z1_139",
	statusMarker: "_statusMarker_148z1_146",
	statusIconConnected: "_statusIconConnected_148z1_156",
	statusIconDisconnected: "_statusIconDisconnected_148z1_157",
	disabledMarker: "_disabledMarker_148z1_161"
} }]]);
//#endregion
//#region src/features/shared/toolsConnection/DefaultDetailBody.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var DefaultDetailBody_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DefaultDetailBody",
	props: { item: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const hasContent = computed(() => Boolean(props.item.longDescription));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "tools-connection-default-detail-body"
			}, [hasContent.value ? (openBlock(), createElementBlock("p", {
				key: 0,
				class: normalizeClass(_ctx.$style.description)
			}, toDisplayString(__props.item.longDescription), 3)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.placeholder),
				"data-test-id": "tools-connection-detail-placeholder"
			}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("tools.connection.detail.noAdditionalDetails")), 1)]),
				_: 1
			})], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_15856_1",
	description: "_description_15856_6",
	placeholder: "_placeholder_15856_13"
} }]]);
//#endregion
//#region src/features/shared/toolsConnection/ToolDetailView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ToolDetailView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolDetailView",
	props: {
		item: {},
		hideBackButton: { type: Boolean }
	},
	emits: [
		"back",
		"close",
		"select-credential",
		"credential-dropdown-open",
		"first-credential-connect",
		"new-credential-connect"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const placeholderIcon = computed(() => {
			switch (props.item.kind) {
				case "service":
				case "mcp-server": return "plug";
				case "workflow": return "workflow";
				case "agent": return "bot";
				case "data-store": return "database";
				default: return "toolbox";
			}
		});
		const resolvedIcon = computed(() => resolveToolItemNodeIcon(props.item));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "tools-connection-detail"
			}, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerLeft) }, [
				!__props.hideBackButton ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					icon: "arrow-left",
					variant: "ghost",
					size: "medium",
					"aria-label": unref(i18n).baseText("tools.connection.detail.back"),
					"data-test-id": "tools-connection-detail-back",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("back"))
				}, null, 8, ["aria-label"])) : createCommentVNode("", true),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.iconWrapper),
					"aria-hidden": "true"
				}, [resolvedIcon.value ? (openBlock(), createBlock(unref(N8nNodeIcon_default), {
					key: 0,
					type: resolvedIcon.value.type,
					src: resolvedIcon.value.type === "file" ? resolvedIcon.value.src : void 0,
					name: resolvedIcon.value.type === "icon" ? resolvedIcon.value.name : void 0,
					color: resolvedIcon.value.type === "icon" ? resolvedIcon.value.color : void 0,
					size: 20
				}, null, 8, [
					"type",
					"src",
					"name",
					"color"
				])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: placeholderIcon.value,
					size: 20,
					class: normalizeClass(_ctx.$style.iconFallback)
				}, null, 8, ["icon", "class"]))], 2),
				createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.title),
					tag: "h2",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.item.title), 1)]),
					_: 1
				}, 8, ["class"])
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [__props.item.credentials?.length ? (openBlock(), createBlock(ToolCredentialPicker_default, {
				key: 0,
				item: __props.item,
				credentials: __props.item.credentials,
				onSelectCredential: _cache[1] || (_cache[1] = (toolItem, authType, credentialId) => emit("select-credential", toolItem, authType, credentialId)),
				onCredentialDropdownOpen: _cache[2] || (_cache[2] = ($event) => emit("credential-dropdown-open", $event)),
				onFirstCredentialConnect: _cache[3] || (_cache[3] = ($event) => emit("first-credential-connect", $event)),
				onNewCredentialConnect: _cache[4] || (_cache[4] = ($event) => emit("new-credential-connect", $event))
			}, null, 8, ["item", "credentials"])) : createCommentVNode("", true), createVNode(unref(N8nIconButton_default), {
				icon: "x",
				variant: "ghost",
				size: "medium",
				"aria-label": unref(i18n).baseText("tools.connection.action.close"),
				"data-test-id": "tools-connection-detail-close",
				onClick: _cache[5] || (_cache[5] = ($event) => emit("close"))
			}, null, 8, ["aria-label"])], 2)], 2), renderSlot(_ctx.$slots, "body", { item: __props.item }, () => [createVNode(DefaultDetailBody_default, { item: __props.item }, null, 8, ["item"])])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_19r5e_1",
	header: "_header_19r5e_7",
	headerLeft: "_headerLeft_19r5e_14",
	headerActions: "_headerActions_19r5e_22",
	iconWrapper: "_iconWrapper_19r5e_29",
	iconFallback: "_iconFallback_19r5e_39",
	title: "_title_19r5e_43"
} }]]);
//#endregion
//#region src/features/shared/toolsConnection/ToolSettingsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ToolSettingsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolSettingsView",
	props: {
		item: {},
		hideBackButton: { type: Boolean }
	},
	emits: [
		"back",
		"close",
		"disconnect",
		"save",
		"select-credential",
		"credential-dropdown-open",
		"first-credential-connect",
		"new-credential-connect"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const credentialPickerRef = useTemplateRef("credentialPickerRef");
		const resolvedIcon = computed(() => resolveToolItemNodeIcon(props.item));
		function onSave(settings) {
			emit("save", props.item, settings);
		}
		function onDisconnect() {
			emit("disconnect", props.item);
		}
		function onClose() {
			emit("close");
		}
		function onReconnect() {
			credentialPickerRef.value?.open();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "tools-connection-settings"
			}, [createBaseVNode("header", {
				class: normalizeClass(_ctx.$style.header),
				"data-slot": "dialog-header"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerLeft) }, [
				!__props.hideBackButton ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					icon: "arrow-left",
					variant: "ghost",
					size: "medium",
					class: normalizeClass(_ctx.$style.backButton),
					"aria-label": unref(i18n).baseText("tools.connection.detail.back"),
					"data-test-id": "tools-connection-settings-back",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("back"))
				}, null, 8, ["class", "aria-label"])) : createCommentVNode("", true),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.iconWrapper),
					"aria-hidden": "true"
				}, [resolvedIcon.value ? (openBlock(), createBlock(unref(N8nNodeIcon_default), {
					key: 0,
					type: resolvedIcon.value.type,
					src: resolvedIcon.value.type === "file" ? resolvedIcon.value.src : void 0,
					name: resolvedIcon.value.type === "icon" ? resolvedIcon.value.name : void 0,
					color: resolvedIcon.value.type === "icon" ? resolvedIcon.value.color : void 0,
					size: 20
				}, null, 8, [
					"type",
					"src",
					"name",
					"color"
				])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "plug",
					size: 20,
					class: normalizeClass(_ctx.$style.iconFallback)
				}, null, 8, ["class"]))], 2),
				createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.title),
					tag: "h2",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.item.title), 1)]),
					_: 1
				}, 8, ["class"])
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [__props.item.credentials?.length ? (openBlock(), createBlock(ToolCredentialPicker_default, {
				key: 0,
				ref_key: "credentialPickerRef",
				ref: credentialPickerRef,
				item: __props.item,
				credentials: __props.item.credentials,
				onSelectCredential: _cache[1] || (_cache[1] = (toolItem, authType, credentialId) => emit("select-credential", toolItem, authType, credentialId)),
				onCredentialDropdownOpen: _cache[2] || (_cache[2] = ($event) => emit("credential-dropdown-open", $event)),
				onFirstCredentialConnect: _cache[3] || (_cache[3] = ($event) => emit("first-credential-connect", $event)),
				onNewCredentialConnect: _cache[4] || (_cache[4] = ($event) => emit("new-credential-connect", $event))
			}, null, 8, ["item", "credentials"])) : createCommentVNode("", true), createVNode(unref(N8nIconButton_default), {
				icon: "x",
				variant: "ghost",
				size: "medium",
				"aria-label": unref(i18n).baseText("tools.connection.action.close"),
				"data-test-id": "tools-connection-settings-close",
				onClick: onClose
			}, null, 8, ["aria-label"])], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.bodyWrapper) }, [renderSlot(_ctx.$slots, "body", {
				item: __props.item,
				onSave,
				onDisconnect,
				onClose,
				onReconnect
			})], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1vbom_1",
	header: "_header_1vbom_10",
	headerLeft: "_headerLeft_1vbom_19",
	headerActions: "_headerActions_1vbom_27",
	iconWrapper: "_iconWrapper_1vbom_34",
	iconFallback: "_iconFallback_1vbom_44",
	title: "_title_1vbom_48",
	bodyWrapper: "_bodyWrapper_1vbom_57"
} }]]);
//#endregion
//#region src/features/shared/toolsConnection/ToolsConnectionModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["aria-label"];
var _hoisted_2 = [
	"disabled",
	"aria-busy",
	"data-test-id"
];
var _hoisted_3 = ["data-test-id"];
var ITEM_HEIGHT = 58;
var MAX_DISPLAYED_COUNT = 99;
var ToolsConnectionModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolsConnectionModal",
	props: {
		open: {
			type: Boolean,
			default: false
		},
		items: {},
		categories: {},
		hideEmptyCategories: {
			type: Boolean,
			default: false
		},
		iconlessRows: {
			type: Boolean,
			default: false
		},
		title: {},
		searchPlaceholder: {},
		detailItem: { default: null },
		detailMode: { default: "detail" },
		hideBackButton: { type: Boolean },
		size: { default: "xlarge" },
		showSuggestionFooter: {
			type: Boolean,
			default: false
		},
		createAction: { default: void 0 },
		createActionLoading: {
			type: Boolean,
			default: false
		},
		loading: {
			type: Boolean,
			default: false
		},
		emptyMessage: { default: void 0 },
		noResultsMessage: { default: void 0 },
		embedded: {
			type: Boolean,
			default: false
		},
		showConnectActions: {
			type: Boolean,
			default: false
		},
		groupSearchResults: {
			type: Boolean,
			default: false
		},
		persistentScrollbar: {
			type: Boolean,
			default: false
		},
		connectLabel: {},
		connectAriaLabel: {},
		connectedLabel: {},
		categoryLabels: {}
	},
	emits: [
		"update:open",
		"update:searchQuery",
		"update:detailItem",
		"disconnect",
		"save",
		"select-credential",
		"credential-dropdown-open",
		"first-credential-connect",
		"new-credential-connect",
		"open-detail",
		"connect",
		"create"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const modalTitle = computed(() => props.title ?? i18n.baseText("tools.connection.title"));
		const containerComponent = computed(() => props.embedded ? "div" : Dialog_default);
		const SlotOnly = defineComponent({
			name: "SlotOnly",
			setup(_, { slots }) {
				return () => slots.default?.();
			}
		});
		const bodyComponent = computed(() => props.embedded ? SlotOnly : DialogBody_default);
		const containerProps = computed(() => props.embedded ? {} : {
			open: props.open,
			size: props.size,
			header: props.detailItem ? "" : modalTitle.value,
			showCloseButton: !props.detailItem,
			"aria-label": modalTitle.value
		});
		const searchPlaceholder = computed(() => props.searchPlaceholder ?? i18n.baseText("tools.connection.search.placeholder"));
		const searchQuery = ref("");
		const debouncedSearchQuery = ref("");
		const setDebouncedSearch = useDebounceFn((value) => {
			debouncedSearchQuery.value = value;
			emit("update:searchQuery", value);
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		watch(searchQuery, (value) => {
			setDebouncedSearch(value);
		});
		const activeCategory = ref(props.categories[0] ?? "connected");
		const isMcpCategory = computed(() => activeCategory.value === "mcp");
		const searchInputRef = useTemplateRef("searchInputRef");
		const scrollerRef = useTemplateRef("scrollerRef");
		function focusSearchInput() {
			nextTick(() => {
				searchInputRef.value?.focus();
			});
		}
		/**
		* Search text and active tab live as long as this component, which a consumer
		* mounts for exactly one modal session — so stepping aside for a follow-up
		* dialog leaves them intact. The scroll offset does not survive on its own:
		* the dialog content unmounts while hidden, so carry it across by hand.
		*/
		const savedScrollTop = ref(0);
		watch(() => props.open, async (isOpen) => {
			if (!isOpen) {
				savedScrollTop.value = scrollerRef.value?.scrollTop ?? 0;
				return;
			}
			focusSearchInput();
			await nextTick();
			scrollerRef.value?.scrollTo(savedScrollTop.value);
		});
		onMounted(() => {
			if (props.open) focusSearchInput();
		});
		watch(() => props.loading, (isLoading) => {
			if (!isLoading && props.open) focusSearchInput();
		});
		const normalizedSearchQuery = computed(() => debouncedSearchQuery.value.trim());
		const hasActiveSearch = computed(() => normalizedSearchQuery.value.length > 0);
		const isGroupedSearch = computed(() => props.groupSearchResults && hasActiveSearch.value);
		function matchesQuery(item) {
			if (!normalizedSearchQuery.value) return true;
			const query = normalizedSearchQuery.value.toLowerCase();
			return item.title.toLowerCase().includes(query) || (item.description ?? "").toLowerCase().includes(query);
		}
		const hasConnectedTab = computed(() => props.categories.includes("connected"));
		function categoryOf(item) {
			return item.category ?? CATEGORY_BY_KIND[item.kind];
		}
		/**
		* "All" ranks connected tools first, then those backed by n8n credits, then the
		* rest — so the most immediately usable tools sit on top. Lower rank sorts first.
		*/
		function allSortRank(item) {
			if (hasToolConnection(item.status)) return 0;
			if (item.freeCredits) return 1;
			return 2;
		}
		function isRestrictedItem(item) {
			return item.kind === "node" && item.restriction !== void 0;
		}
		/** Node types that also have a row in the Gateway credits tab. */
		const gatewayNodeTypeNames = computed(() => new Set(props.items.flatMap((item) => item.kind === "node" && categoryOf(item) === "n8n-connect" ? [item.nodeTypeName] : [])));
		/**
		* A gateway-eligible node has a second, plain row for users who bring their own
		* credential. Its own tab keeps that row, but "All" shows the node only once.
		*/
		function isGatewayDuplicate(item) {
			return item.kind === "node" && categoryOf(item) !== "n8n-connect" && !hasToolConnection(item.status) && gatewayNodeTypeNames.value.has(item.nodeTypeName);
		}
		function itemsForCategory(category) {
			if (category === "all") return props.items.filter((item) => !isGatewayDuplicate(item) && categoryOf(item) !== "recommended").sort((a, b) => allSortRank(a) - allSortRank(b));
			if (category === "connected") return props.items.filter((item) => hasToolConnection(item.status));
			const categoryItems = props.items.filter((item) => categoryOf(item) === category && (hasConnectedTab.value ? !hasToolConnection(item.status) : true));
			return category === "mcp" ? partitionLast(categoryItems, (item) => !item.freeCredits) : categoryItems;
		}
		const countByCategory = computed(() => {
			const counts = {};
			for (const category of props.categories) counts[category] = itemsForCategory(category).filter(matchesQuery).length;
			return counts;
		});
		/** Past this the exact number stops being useful and starts crowding the tab. */
		function tabCount(category) {
			const count = countByCategory.value[category] ?? 0;
			return count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(count);
		}
		const toolRows = computed(() => partitionLast(itemsForCategory(activeCategory.value).filter(matchesQuery), isRestrictedItem).map((item) => ({
			key: `item:${item.id}`,
			item
		})));
		/** Categories only worth a tab once they hold something. */
		const HIDE_WHEN_EMPTY = ["community"];
		/**
		* Deliberately independent of the search query, so the tab strip stays put
		* while typing and the counts alone show where the matches are.
		*/
		const visibleCategories = computed(() => props.categories.filter((category) => {
			return !(props.hideEmptyCategories ? category !== "all" : HIDE_WHEN_EMPTY.includes(category)) || itemsForCategory(category).length > 0;
		}));
		const tabsVisible = computed(() => props.hideEmptyCategories ? visibleCategories.value.length > 1 : props.categories.length > 1 && visibleCategories.value.length > 0);
		async function selectCategory(category) {
			activeCategory.value = category;
			await nextTick();
			const firstKey = flattenedRows.value[0]?.key;
			if (firstKey) scrollerRef.value?.scrollToKey(firstKey);
		}
		const CATEGORY_I18N = {
			all: "tools.connection.categories.all",
			connected: "tools.connection.categories.connected",
			"built-in": "tools.connection.categories.builtIn",
			mcp: "tools.connection.categories.mcp",
			ai: "tools.connection.categories.ai",
			n8n: "tools.connection.categories.n8n",
			"n8n-connect": "tools.connection.categories.n8nConnect",
			"app-action": "tools.connection.categories.appAction",
			community: "tools.connection.categories.community",
			workflows: "tools.connection.categories.workflows",
			agents: "tools.connection.categories.agents",
			project: "tools.connection.categories.project",
			global: "tools.connection.categories.global",
			data: "tools.connection.categories.data",
			recommended: "tools.connection.categories.recommended"
		};
		function categoryLabel(category) {
			return props.categoryLabels?.[category] ?? i18n.baseText(CATEGORY_I18N[category]);
		}
		const groupedSearchRows = computed(() => {
			const rows = [];
			for (const category of visibleCategories.value) {
				if (category === "all") continue;
				const matches = itemsForCategory(category).filter(matchesQuery);
				if (matches.length === 0) continue;
				rows.push({
					key: `category:${category}`,
					category
				});
				rows.push(...matches.map((item) => ({
					key: `item:${item.id}`,
					item
				})));
			}
			return rows;
		});
		const flattenedRows = computed(() => {
			if (isGroupedSearch.value) return groupedSearchRows.value;
			return isMcpCategory.value || props.showSuggestionFooter ? [...toolRows.value, { key: "suggestion" }] : toolRows.value;
		});
		/**
		* The count rides in the label rather than `tag`, which would render a chip per
		* tab — far louder than a muted number next to the name.
		*/
		const tabOptions = computed(() => visibleCategories.value.map((category) => ({
			value: category,
			label: `${categoryLabel(category)} (${tabCount(category)})`
		})));
		watch(visibleCategories, (categories) => {
			if (categories.length > 0 && !categories.includes(activeCategory.value)) activeCategory.value = categories[0];
		}, { immediate: true });
		const isListEmpty = computed(() => isGroupedSearch.value ? groupedSearchRows.value.length === 0 : toolRows.value.length === 0);
		const resolvedEmptyMessage = computed(() => {
			if (hasActiveSearch.value) {
				if (props.noResultsMessage) return props.noResultsMessage;
				return i18n.baseText("tools.connection.empty.noResults", { interpolate: { query: normalizedSearchQuery.value } });
			}
			return props.emptyMessage ?? i18n.baseText("tools.connection.empty.title");
		});
		const showCreateAction = computed(() => props.createAction !== void 0 && (props.createAction.category === void 0 || props.createAction.category === activeCategory.value));
		function openDetail(item) {
			emit("open-detail", item);
			emit("update:detailItem", item);
		}
		function closeDetail() {
			emit("update:detailItem", null);
		}
		function handleOpenChange(value) {
			emit("update:open", value);
			if (!value) closeDetail();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(containerComponent.value), mergeProps(containerProps.value, {
				class: props.embedded && _ctx.$style.embedded,
				"data-test-id": "tools-connection-modal",
				"onUpdate:open": handleOpenChange
			}), {
				default: withCtx(() => [__props.loading ? (openBlock(), createBlock(resolveDynamicComponent(bodyComponent.value), { key: 0 }, {
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass([_ctx.$style.body, _ctx.$style.loading]),
						role: "status",
						"aria-label": unref(i18n).baseText("generic.loading"),
						"data-test-id": "tools-connection-loading"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "loader-circle",
						size: "xlarge",
						spin: ""
					}), createVNode(unref(N8nText_default), { color: "text-light" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.loading")), 1)]),
						_: 1
					})], 10, _hoisted_1)]),
					_: 1
				})) : __props.detailItem && __props.detailMode === "settings" ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.body)
				}, [(openBlock(), createBlock(ToolSettingsView_default, {
					key: __props.detailItem.id,
					item: __props.detailItem,
					"hide-back-button": __props.hideBackButton,
					onBack: closeDetail,
					onClose: _cache[0] || (_cache[0] = ($event) => handleOpenChange(false)),
					onDisconnect: _cache[1] || (_cache[1] = ($event) => emit("disconnect", $event)),
					onSave: _cache[2] || (_cache[2] = (item, settings) => emit("save", item, settings)),
					onSelectCredential: _cache[3] || (_cache[3] = (item, authType, credentialId) => emit("select-credential", item, authType, credentialId)),
					onCredentialDropdownOpen: _cache[4] || (_cache[4] = ($event) => emit("credential-dropdown-open", $event)),
					onFirstCredentialConnect: _cache[5] || (_cache[5] = ($event) => emit("first-credential-connect", $event)),
					onNewCredentialConnect: _cache[6] || (_cache[6] = ($event) => emit("new-credential-connect", $event))
				}, createSlots({ _: 2 }, [_ctx.$slots["settings-body"] ? {
					name: "body",
					fn: withCtx((slotProps) => [renderSlot(_ctx.$slots, "settings-body", normalizeProps(guardReactiveProps(slotProps)))]),
					key: "0"
				} : void 0]), 1032, ["item", "hide-back-button"]))], 2)) : (openBlock(), createBlock(resolveDynamicComponent(bodyComponent.value), { key: 2 }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [__props.detailItem ? (openBlock(), createBlock(ToolDetailView_default, {
						key: 0,
						item: __props.detailItem,
						"hide-back-button": __props.hideBackButton,
						onBack: closeDetail,
						onClose: _cache[7] || (_cache[7] = ($event) => handleOpenChange(false)),
						onSelectCredential: _cache[8] || (_cache[8] = (item, authType, credentialId) => emit("select-credential", item, authType, credentialId)),
						onCredentialDropdownOpen: _cache[9] || (_cache[9] = ($event) => emit("credential-dropdown-open", $event)),
						onFirstCredentialConnect: _cache[10] || (_cache[10] = ($event) => emit("first-credential-connect", $event)),
						onNewCredentialConnect: _cache[11] || (_cache[11] = ($event) => emit("new-credential-connect", $event))
					}, createSlots({ _: 2 }, [_ctx.$slots["detail-body"] ? {
						name: "body",
						fn: withCtx((slotProps) => [renderSlot(_ctx.$slots, "detail-body", normalizeProps(guardReactiveProps(slotProps)))]),
						key: "0"
					} : void 0]), 1032, ["item", "hide-back-button"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						createVNode(unref(Input_default), {
							ref_key: "searchInputRef",
							ref: searchInputRef,
							modelValue: searchQuery.value,
							"onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => searchQuery.value = $event),
							placeholder: searchPlaceholder.value,
							clearable: "",
							"data-test-id": "tools-connection-search",
							class: normalizeClass(_ctx.$style.searchInput)
						}, {
							prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
							_: 1
						}, 8, [
							"modelValue",
							"placeholder",
							"class"
						]),
						tabsVisible.value && !isGroupedSearch.value ? (openBlock(), createBlock(unref(Tabs_default), {
							key: 0,
							"model-value": activeCategory.value,
							options: tabOptions.value,
							size: "small",
							variant: "modern",
							justified: "",
							class: normalizeClass(_ctx.$style.tabs),
							"data-test-id": "tools-connection-tabs",
							"onUpdate:modelValue": selectCategory
						}, null, 8, [
							"model-value",
							"options",
							"class"
						])) : createCommentVNode("", true),
						showCreateAction.value && __props.createAction ? (openBlock(), createElementBlock("button", {
							key: 1,
							type: "button",
							class: normalizeClass([_ctx.$style.createRow, __props.iconlessRows && _ctx.$style.createRowIconless]),
							disabled: __props.createActionLoading,
							"aria-busy": __props.createActionLoading,
							"data-test-id": __props.createAction.testId ?? "tools-connection-create",
							onClick: _cache[13] || (_cache[13] = ($event) => emit("create", activeCategory.value))
						}, [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.createIcon),
							"aria-hidden": "true"
						}, [createVNode(unref(N8nIcon_default), {
							icon: __props.createActionLoading ? "loader-circle" : "plus",
							size: 20,
							spin: __props.createActionLoading
						}, null, 8, ["icon", "spin"])], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.createText) }, [createVNode(unref(N8nText_default), {
							tag: "span",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.createAction.label), 1)]),
							_: 1
						}), __props.createAction.description ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							tag: "span",
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.createAction.description), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2)], 10, _hoisted_2)) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.listWrapper) }, [isListEmpty.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("div", {
							class: normalizeClass(_ctx.$style.empty),
							"data-test-id": "tools-connection-empty"
						}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(resolvedEmptyMessage.value), 1)]),
							_: 1
						})], 2), isMcpCategory.value || __props.showSuggestionFooter ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.suggestionRow)
						}, [renderSlot(_ctx.$slots, "suggestion-footer")], 2)) : createCommentVNode("", true)], 64)) : (openBlock(), createBlock(unref(N8nRecycleScroller_default), {
							key: 1,
							ref_key: "scrollerRef",
							ref: scrollerRef,
							items: flattenedRows.value,
							"item-size": ITEM_HEIGHT,
							"item-key": "key",
							class: normalizeClass([_ctx.$style.scroller, __props.persistentScrollbar && _ctx.$style.persistentScrollbar])
						}, {
							default: withCtx(({ item: row }) => ["category" in row ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.categoryHeader),
								"data-test-id": `tools-connection-search-category-${row.category}`
							}, [createVNode(unref(N8nText_default), {
								tag: "h3",
								size: "small",
								bold: "",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(categoryLabel(row.category)), 1)]),
								_: 2
							}, 1024)], 10, _hoisted_3)) : "item" in row ? (openBlock(), createBlock(ToolRow_default, {
								key: 1,
								item: row.item,
								"show-connect-action": props.showConnectActions,
								"connect-label": props.connectLabel?.(row.item),
								"connect-aria-label": props.connectAriaLabel?.(row.item),
								"connected-label": props.connectedLabel?.(row.item),
								onOpenDetail: _cache[14] || (_cache[14] = ($event) => openDetail($event)),
								onConnect: _cache[15] || (_cache[15] = ($event) => emit("connect", $event)),
								onSelectCredential: _cache[16] || (_cache[16] = (item, authType, credentialId) => emit("select-credential", item, authType, credentialId)),
								onCredentialDropdownOpen: _cache[17] || (_cache[17] = ($event) => emit("credential-dropdown-open", $event)),
								onFirstCredentialConnect: _cache[18] || (_cache[18] = ($event) => emit("first-credential-connect", $event)),
								onNewCredentialConnect: _cache[19] || (_cache[19] = ($event) => emit("new-credential-connect", $event))
							}, createSlots({ _: 2 }, [_ctx.$slots["row-footer"] ? {
								name: "footer",
								fn: withCtx(() => [renderSlot(_ctx.$slots, "row-footer", { item: row.item })]),
								key: "0"
							} : void 0]), 1032, [
								"item",
								"show-connect-action",
								"connect-label",
								"connect-aria-label",
								"connected-label"
							])) : (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass(_ctx.$style.suggestionRow)
							}, [renderSlot(_ctx.$slots, "suggestion-footer")], 2))]),
							_: 3
						}, 8, ["items", "class"]))], 2)
					], 64))], 2)]),
					_: 3
				}))]),
				_: 3
			}, 16, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1q311_122",
	loading: "_loading_1q311_130",
	embedded: "_embedded_1q311_136",
	searchInput: "_searchInput_1q311_144",
	listWrapper: "_listWrapper_1q311_148",
	scroller: "_scroller_1q311_152",
	tabs: "_tabs_1q311_164",
	createRow: "_createRow_1q311_169",
	createIcon: "_createIcon_1q311_196",
	createRowIconless: "_createRowIconless_1q311_206",
	createText: "_createText_1q311_213",
	categoryHeader: "_categoryHeader_1q311_236",
	persistentScrollbar: "_persistentScrollbar_1q311_245",
	empty: "_empty_1q311_268",
	suggestionRow: "_suggestionRow_1q311_277"
} }]]);
//#endregion
export { DefaultDetailBody_default as n, ToolsConnectionModal_default as t };
