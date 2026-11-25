import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Kf as toRef, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, ui as require_debounce, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Gt as useMCPStore, Ho as listAgentsPage, Jg as useUIStore, Kd as useDocumentTitle, Kn as toAgentListItem, Kr as useAgentPermissions, Lc as useCreateAgent, M_ as FOLDER_LIST_ITEM_ACTIONS, NM as N8nCard_default, Ph as PROJECT_AGENTS, Rc as useAgentTelemetry, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Uo as listAgentsPageGlobal, Wt as useMcp, YM as N8nActionToggle_default, Yo as moveAgent, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, _S as AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT, aN as N8nChatInput_default, bC as useRootStore, bm as useSourceControlStore, by as useDebounce, dC as useToast, dc as getProjectFolders, eC as DEBOUNCE_TIME, eh as AGENT_DUPLICATE_MODAL_KEY, fN as N8nTooltip_default, fc as moveFolder, hM as N8nLink_default, jN as useI18n, kh as AGENT_BUILDER_VIEW, nD as getResourcePermissions, nN as N8nBadge_default, od as useInstanceAiReady, so as duplicateAgent, tM as N8nInfoTip_default, tj as N8nBreadcrumbs_default, to as deleteAgent, vN as N8nIconButton_default, vm as useProjectsStore, vy as usePostHog, wy as TELEMETRY_EVENT, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yh as NEW_SESSION_PARAM, ym as useFavoritesStore, yu as TimeAgo_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as ResourcesListLayout_default } from "./ResourcesListLayout-DF4MauKJ.js";
import { t as ResourcesListEmptyState_default } from "./ResourcesListEmptyState-CgwRE9Zu.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
import { t as ProjectBreadcrumb_default } from "./ProjectBreadcrumb-BccE-39r.js";
import { n as removeProjectAgentFromListCache, r as upsertProjectAgentsListCache, t as invalidateProjectAgentsListCache } from "./useProjectAgentsList-yCWZeTO1.js";
import { n as FolderCardSubtitle_default, r as FolderCardActions_default, t as PublicationIndicator_default } from "./PublicationIndicator-Dpv8bq0f.js";
import { t as ProjectHeader_default } from "./ProjectHeader-D25_B2LW.js";
import { t as useInsightsStore } from "./insights.store-DnugpkOH.js";
import { t as InsightsSummary_default } from "./InsightsSummary-di7i8i9y.js";
import "./src-DnjiQGBn.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { t as hasAgentUnpublishedChanges } from "./agentPublication-B0tlGvRZ.js";
import { l as useAgentArchive, n as useAgentPublish, t as AgentTemplateList_default, u as AgentFolderDialog_default } from "./AgentTemplateList-CZUUs0fS.js";
import { t as useAgentFolderBreadcrumb } from "./useAgentFolderBreadcrumb-BeD-Ouo7.js";
//#region src/experiments/agentsListEmptyStateTemplates/useAgentsListEmptyStateTemplatesExperiment.ts
var import_debounce = /* @__PURE__ */ __toESM(require_debounce(), 1);
init_runtime_core_esm_bundler();
var AGENTS_LIST_EMPTY_STATE_TEMPLATES_VARIANTS = [AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.control, AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test];
function isAgentsListEmptyStateTemplatesVariant(value) {
	return AGENTS_LIST_EMPTY_STATE_TEMPLATES_VARIANTS.some((variant) => variant === value);
}
function useAgentsListEmptyStateTemplatesExperiment() {
	const posthogStore = usePostHog();
	const instanceAiReady = useInstanceAiReady();
	const variant = computed(() => {
		if (!instanceAiReady.value) return void 0;
		const assigned = posthogStore.getVariant(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
		return isAgentsListEmptyStateTemplatesVariant(assigned) ? assigned : void 0;
	});
	const isFeatureEnabled = computed(() => variant.value === AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test);
	function trackExposure() {
		if (!variant.value) return;
		posthogStore.trackExposure(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
	}
	return {
		isFeatureEnabled,
		variant,
		trackExposure
	};
}
//#endregion
//#region src/features/agents/components/AgentCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var AgentCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentCard",
	props: {
		agent: {},
		projectId: {},
		showFolderPath: { type: Boolean }
	},
	emits: [
		"select",
		"published",
		"unpublished",
		"deleted",
		"archived",
		"unarchived",
		"new-chat",
		"duplicate",
		"move"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const locale = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const mcpStore = useMCPStore();
		const mcp = useMcp();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const { publish, unpublish } = useAgentPublish();
		const { archive, unarchive } = useAgentArchive();
		const { canCreate, canUpdate, canDelete, canPublish, canUnpublish } = useAgentPermissions(() => props.projectId);
		const isPublished = computed(() => props.agent.activeVersionId !== null);
		const hasUnpublishedChanges = computed(() => hasAgentUnpublishedChanges(props.agent));
		const isUntitled = computed(() => props.agent.name === locale.baseText("agents.new.defaultName"));
		const isMcpEnabled = computed(() => settingsStore.isModuleActive("mcp") && !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
		const mcpToggleStatus = ref(null);
		const isAvailableInMCP = computed(() => mcpToggleStatus.value ?? props.agent.availableInMCP ?? false);
		watch([() => props.agent, () => props.agent.availableInMCP], () => {
			mcpToggleStatus.value = null;
		});
		const showMcpIndicator = computed(() => isMcpEnabled.value && isAvailableInMCP.value && !props.agent.isArchived);
		const favoriteStore = useFavoritesStore();
		const isFavorite = computed(() => favoriteStore.isFavorite(props.agent.id, "agent"));
		const archiveActions = computed(() => {
			if (!canDelete.value) return [];
			if (!props.agent.isArchived) return [{
				value: "archive",
				label: locale.baseText("menuActions.archive"),
				divided: true
			}];
			return [{
				value: "delete",
				label: locale.baseText("agents.list.actions.delete"),
				divided: true,
				destructive: true
			}, {
				value: "unarchive",
				label: locale.baseText("menuActions.unarchive")
			}];
		});
		const favoriteAction = computed(() => ({
			value: "toggleFavorite",
			label: locale.baseText(isFavorite.value ? "favorites.remove" : "favorites.add")
		}));
		const actions = computed(() => {
			if (props.agent.isArchived) return [favoriteAction.value, ...archiveActions.value];
			const items = [];
			if (canUpdate.value && settingsStore.isFoldersFeatureEnabled) items.push({
				value: "move",
				label: locale.baseText("agents.folders.move")
			});
			items.push({
				...favoriteAction.value,
				divided: !isPublished.value ? !canPublish.value : !canUnpublish.value
			});
			if (canCreate.value) items.push({
				value: "duplicate",
				label: locale.baseText("agents.list.actions.duplicate")
			});
			if (isPublished.value && canUnpublish.value) items.push({
				value: "unpublish",
				label: locale.baseText("agents.list.actions.unpublish")
			});
			else if (!isPublished.value && canPublish.value) items.push({
				value: "publish",
				label: locale.baseText("agents.list.actions.publish")
			});
			if (isMcpEnabled.value && canUpdate.value) items.push({
				value: "toggleMCPAccess",
				label: locale.baseText(isAvailableInMCP.value ? "agents.list.actions.disableMCPAccess" : "agents.list.actions.enableMCPAccess"),
				divided: true
			});
			return [...items, ...archiveActions.value];
		});
		const showActions = computed(() => actions.value.length > 0);
		const formattedCreatedAtDate = computed(() => {
			const currentYear = (/* @__PURE__ */ new Date()).getFullYear().toString();
			return (0, import_dateformat.default)(props.agent.createdAt, `d mmmm${String(props.agent.createdAt).startsWith(currentYear) ? "" : ", yyyy"}`);
		});
		async function deleteArchivedAgent() {
			if (await openAgentConfirmationModal({
				title: locale.baseText("agents.delete.modal.title", { interpolate: { name: props.agent.name } }),
				description: locale.baseText("agents.delete.modal.description", { interpolate: { name: props.agent.name } }),
				isDestructive: true,
				confirmButtonText: locale.baseText("agents.delete.modal.button.delete"),
				cancelButtonText: locale.baseText("generic.cancel")
			}) !== "confirm") return;
			await deleteAgent(rootStore.restApiContext, props.projectId, props.agent.id);
			removeProjectAgentFromListCache(props.projectId, props.agent.id);
			favoriteStore.removeFavoriteLocally(props.agent.id, "agent");
			emit("deleted", props.agent.id);
		}
		async function onAction(action) {
			if (action === "move") {
				emit("move", props.agent.id);
				return;
			}
			if (action === "archive") {
				const updated = await archive(props.agent);
				if (updated) emit("archived", updated);
			} else if (action === "unarchive") {
				const updated = await unarchive(props.agent);
				if (updated) emit("unarchived", updated);
			} else if (action === "publish") {
				const updated = await publish(props.projectId, props.agent.id);
				if (updated) emit("published", updated);
			} else if (action === "unpublish") {
				const updated = await unpublish(props.projectId, props.agent.id, props.agent.name);
				if (updated) emit("unpublished", updated);
			} else if (action === "toggleFavorite") await favoriteStore.toggleFavorite(props.agent.id, "agent");
			else if (action === "toggleMCPAccess") await toggleMCPAccess(!isAvailableInMCP.value);
			else if (action === "delete") await deleteArchivedAgent();
			else if (action === "duplicate") emit("duplicate", props.agent.id);
		}
		async function toggleMCPAccess(enabled) {
			try {
				await mcpStore.toggleAgentMcpAccess(props.agent.id, enabled);
				mcpToggleStatus.value = enabled;
				if (enabled) mcp.trackMcpAccessEnabledForAgent(props.agent.id);
			} catch (error) {
				toast.showError(error, locale.baseText("agents.toggleMCP.error.title"));
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass([_ctx.$style.cardLink, { [_ctx.$style.cardArchived]: __props.agent.isArchived }]),
				"data-test-id": "agent-card",
				onClick: _cache[2] || (_cache[2] = ($event) => emit("select", __props.agent.id))
			}, {
				header: withCtx(() => [createVNode(unref(N8nText_default), {
					tag: "h2",
					bold: !isUntitled.value,
					color: isUntitled.value ? "text-light" : void 0,
					class: normalizeClass([_ctx.$style.cardHeading, {
						[_ctx.$style.untitledName]: isUntitled.value,
						[_ctx.$style.cardHeadingArchived]: __props.agent.isArchived
					}]),
					"data-test-id": "agent-card-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.agent.name) + " ", 1), !unref(canUpdate) ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.readonlyBadge),
						variant: "outline",
						"data-test-id": "agent-card-readonly-badge"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("agents.list.readonly")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"bold",
					"color",
					"class"
				])]),
				append: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.cardActions),
					onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
				}, [
					__props.agent.isArchived ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-light",
						size: "small",
						bold: "",
						class: "mr-2xs",
						"data-test-id": "agent-card-archived"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.item.archived")), 1)]),
						_: 1
					})) : isPublished.value ? (openBlock(), createBlock(PublicationIndicator_default, {
						key: 1,
						label: unref(locale).baseText(hasUnpublishedChanges.value ? "agents.list.changesToPublish" : "agents.list.published"),
						variant: hasUnpublishedChanges.value ? "warning" : "success",
						"data-state": hasUnpublishedChanges.value ? "changes-to-publish" : "published",
						"data-test-id": "agent-card-publish-indicator"
					}, null, 8, [
						"label",
						"variant",
						"data-state"
					])) : createCommentVNode("", true),
					!__props.agent.isArchived ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 2,
						content: unref(locale).baseText("agents.list.actions.newTest")
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "flask-conical",
							variant: "ghost",
							size: "medium",
							"aria-label": unref(locale).baseText("agents.list.actions.newTest"),
							"data-test-id": "agent-card-new-chat",
							onClick: _cache[0] || (_cache[0] = ($event) => emit("new-chat", __props.agent.id, __props.projectId))
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true),
					showActions.value ? (openBlock(), createBlock(unref(N8nActionToggle_default), {
						key: 3,
						actions: actions.value,
						theme: "dark",
						"data-test-id": "agent-card-actions",
						onAction
					}, null, 8, ["actions"])) : createCommentVNode("", true)
				], 2)]),
				default: withCtx(() => [__props.showFolderPath && __props.agent.folderPath?.length ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.folderPath),
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.agent.folderPath.join(" / ")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardDescription) }, [
					createBaseVNode("span", null, [createTextVNode(toDisplayString(unref(locale).baseText("agents.list.updated")) + " ", 1), createVNode(TimeAgo_default, { date: String(__props.agent.updatedAt) }, null, 8, ["date"])]),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.divider) }, "|", 2),
					createBaseVNode("span", null, toDisplayString(unref(locale).baseText("agents.list.created")) + " " + toDisplayString(formattedCreatedAtDate.value), 1),
					showMcpIndicator.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.divider)
					}, "|", 2)) : createCommentVNode("", true),
					showMcpIndicator.value ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.mcpIndicator),
						"data-test-id": "agent-card-mcp"
					}, [createVNode(unref(N8nTooltip_default), {
						placement: "right",
						content: unref(locale).baseText("agents.list.availableInMCP")
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "mcp",
							size: "medium"
						})]),
						_: 1
					}, 8, ["content"])], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	cardLink: "_cardLink_7h7hx_113",
	cardHeading: "_cardHeading_7h7hx_119",
	untitledName: "_untitledName_7h7hx_127",
	cardHeadingArchived: "_cardHeadingArchived_7h7hx_131",
	cardArchived: "_cardArchived_7h7hx_135",
	readonlyBadge: "_readonlyBadge_7h7hx_141",
	cardDescription: "_cardDescription_7h7hx_145",
	folderPath: "_folderPath_7h7hx_156",
	mcpIndicator: "_mcpIndicator_7h7hx_161",
	divider: "_divider_7h7hx_166",
	cardActions: "_cardActions_7h7hx_170"
} }]]);
//#endregion
//#region src/features/agents/components/AgentsListIntro.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentsListIntro_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentsListIntro",
	props: { disabled: { type: Boolean } },
	emits: [
		"create-blank",
		"submit",
		"select"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const draft = ref("");
		const chatInputRef = ref(null);
		let isUnmounted = false;
		function focusComposer() {
			if (isUnmounted || props.disabled) return;
			chatInputRef.value?.focusInput();
		}
		onMounted(() => {
			nextTick(() => focusComposer());
		});
		onBeforeUnmount(() => {
			isUnmounted = true;
		});
		function onComposerBlur() {
			nextTick(() => focusComposer());
		}
		function onSubmit() {
			const text = draft.value.trim();
			if (!text || props.disabled) return;
			emit("submit", text);
		}
		function onSelectTemplate(template) {
			if (props.disabled) return;
			emit("select", template);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.intro),
				"data-test-id": "agents-list-intro"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
					createVNode(unref(N8nIcon_default), {
						icon: "bot",
						size: "xxlarge",
						color: "text-light"
					}),
					createVNode(unref(N8nHeading_default), {
						tag: "h2",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.templates.title")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), { color: "text-light" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.templates.subtitle")), 1)]),
						_: 1
					})
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.composerContainer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.createBlank) }, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					disabled: __props.disabled,
					"data-test-id": "agents-list-intro-create-blank",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("create-blank"))
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "pencil" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.list.intro.createBlank")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2), createVNode(unref(N8nChatInput_default), {
					ref_key: "chatInputRef",
					ref: chatInputRef,
					modelValue: draft.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => draft.value = $event),
					layout: "multiline",
					autofocus: true,
					disabled: __props.disabled,
					placeholder: unref(i18n).baseText("agents.list.intro.placeholder"),
					"input-test-id": "agents-list-intro-input",
					onBlur: onComposerBlur,
					onSubmit
				}, null, 8, [
					"modelValue",
					"disabled",
					"placeholder"
				])], 2),
				createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.templatesLabel)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.list.intro.templatesLabel")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(AgentTemplateList_default, { onSelect: onSelectTemplate })
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	intro: "_intro_4uvb4_1",
	header: "_header_4uvb4_11",
	createBlank: "_createBlank_4uvb4_20",
	composerContainer: "_composerContainer_4uvb4_29",
	templatesLabel: "_templatesLabel_4uvb4_33"
} }]]);
//#endregion
//#region src/features/agents/components/AgentFolderBrowser.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var AgentFolderBrowser_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentFolderBrowser",
	props: {
		projectId: {},
		folderId: {},
		folders: {},
		search: {},
		folderPermissions: {}
	},
	emits: ["changed"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const rootStore = useRootStore();
		const favorites = useFavoritesStore();
		const i18n = useI18n();
		const toast = useToast();
		const { safeTrack } = useAgentTelemetry();
		const router = useRouter();
		const route = useRoute();
		const { canCreate, canUpdate, canDelete } = useAgentPermissions(() => props.projectId);
		const { createAgent } = useCreateAgent();
		const path = useAgentFolderBreadcrumb(toRef(props, "projectId"), toRef(props, "folderId"));
		const action = ref(null);
		const dragged = ref(null);
		function navigate(id) {
			router.push({
				name: PROJECT_AGENTS,
				params: { projectId: props.projectId },
				query: {
					...route.query,
					folderId: id === "0" ? void 0 : id
				}
			});
		}
		const folderActions = computed(() => [
			{
				value: FOLDER_LIST_ITEM_ACTIONS.OPEN,
				label: i18n.baseText("generic.open"),
				disabled: false
			},
			{
				value: FOLDER_LIST_ITEM_ACTIONS.CREATE,
				label: i18n.baseText("folders.actions.create"),
				disabled: !props.folderPermissions.create
			},
			{
				value: FOLDER_LIST_ITEM_ACTIONS.CREATE_AGENT,
				label: i18n.baseText("agents.folders.createAgentInside"),
				disabled: !canCreate.value
			},
			{
				value: FOLDER_LIST_ITEM_ACTIONS.RENAME,
				label: i18n.baseText("generic.rename"),
				disabled: !props.folderPermissions.update || !canUpdate.value
			},
			{
				value: FOLDER_LIST_ITEM_ACTIONS.MOVE,
				label: i18n.baseText("folders.actions.moveToFolder"),
				disabled: !props.folderPermissions.update || !canUpdate.value
			},
			{
				value: FOLDER_LIST_ITEM_ACTIONS.DELETE,
				label: i18n.baseText("generic.delete"),
				disabled: !props.folderPermissions.delete || !canDelete.value && !canUpdate.value
			}
		]);
		function onAction(value, folder) {
			const selectedAction = folderActions.value.find((item) => item.value === value);
			if (!selectedAction || selectedAction.disabled) return;
			if (value === "open") {
				navigate(folder.id);
				return;
			}
			if (value === "create_agent") {
				createAgent("dropdown", props.projectId, void 0, folder.id);
				return;
			}
			if (value === "create") action.value = {
				mode: "create",
				parentFolderId: folder.id
			};
			if (value === "rename" || value === "move" || value === "delete") action.value = {
				mode: value === "move" ? "moveFolder" : value,
				canRelocate: canUpdate.value,
				canDelete: canDelete.value,
				id: folder.id,
				name: folder.name,
				parentFolderId: folder.parentFolder?.id
			};
		}
		function changed() {
			invalidateProjectAgentsListCache(props.projectId);
			favorites.fetchFavorites(true);
			emit("changed");
		}
		function startAgentDrag(id) {
			dragged.value = {
				type: "agent",
				id
			};
		}
		async function drop(targetId) {
			const source = dragged.value;
			dragged.value = null;
			if (!source || source.id === targetId || !canUpdate.value) return;
			try {
				if (source.type === "agent") {
					await moveAgent(rootStore.restApiContext, props.projectId, source.id, targetId === "0" ? null : targetId);
					safeTrack(TELEMETRY_EVENT.PLATFORM.USER_MOVED_CONTENT, {
						agent_id: source.id,
						resource_type: "agent",
						source_folder_id: props.search ? void 0 : props.folderId,
						destination_folder_id: targetId
					});
				} else if (props.folderPermissions.update) await moveFolder(rootStore.restApiContext, props.projectId, source.id, targetId);
				changed();
			} catch (cause) {
				toast.showError(cause, i18n.baseText("agents.folders.error"));
			}
		}
		__expose({
			breadcrumbs: path,
			isDragging: computed(() => dragged.value !== null),
			navigate,
			drop,
			startAgentDrag,
			endDrag: () => {
				dragged.value = null;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.browser),
				"data-testid": "agent-folders"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.folders, (folder) => {
				return openBlock(), createBlock(unref(N8nCard_default), {
					key: folder.id,
					class: normalizeClass(_ctx.$style.folder),
					draggable: __props.folderPermissions.update && unref(canUpdate),
					"data-testid": "agent-folder-card",
					role: "link",
					tabindex: "0",
					onKeydown: [withKeys(($event) => navigate(folder.id), ["enter"]), withKeys(withModifiers(($event) => navigate(folder.id), ["prevent"]), ["space"])],
					onClick: ($event) => navigate(folder.id),
					onDragstart: ($event) => dragged.value = {
						type: "folder",
						id: folder.id
					},
					onDragend: _cache[0] || (_cache[0] = ($event) => dragged.value = null),
					onDragover: _cache[1] || (_cache[1] = withModifiers(() => {}, ["prevent"])),
					onDrop: withModifiers(($event) => drop(folder.id), ["prevent", "stop"])
				}, {
					prepend: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "folder",
						size: "xlarge"
					})]),
					header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.name) }, [createVNode(unref(N8nText_default), {
						tag: "h2",
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(folder.name), 1)]),
						_: 2
					}, 1024)], 2)]),
					footer: withCtx(() => [createVNode(FolderCardSubtitle_default, {
						"resource-count": folder.agentCount ?? 0,
						"resource-label": unref(i18n).baseText("agents.folders.agentCount", { interpolate: { count: folder.agentCount ?? 0 } }),
						"sub-folder-count": folder.subFolderCount,
						"updated-at": folder.updatedAt,
						"created-at": folder.createdAt,
						"test-id-prefix": "agent-folder"
					}, null, 8, [
						"resource-count",
						"resource-label",
						"sub-folder-count",
						"updated-at",
						"created-at"
					])]),
					append: withCtx(() => [createVNode(FolderCardActions_default, {
						folder,
						actions: folderActions.value,
						onAction: ($event) => onAction($event, folder)
					}, null, 8, [
						"folder",
						"actions",
						"onAction"
					])]),
					default: withCtx(() => [__props.search ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(folder.path.join(" / ")), 1)]),
						_: 2
					}, 1024)) : createCommentVNode("", true)]),
					_: 2
				}, 1032, [
					"class",
					"draggable",
					"onKeydown",
					"onClick",
					"onDragstart",
					"onDrop"
				]);
			}), 128)), createVNode(AgentFolderDialog_default, {
				"project-id": __props.projectId,
				action: action.value,
				onClose: _cache[2] || (_cache[2] = ($event) => action.value = null),
				onSaved: changed
			}, null, 8, ["project-id", "action"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	browser: "_browser_1ya9e_1",
	folder: "_folder_1ya9e_8",
	name: "_name_1ya9e_12"
} }]]);
//#endregion
//#region src/features/agents/components/AgentFolderToolbar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["data-resourceid"];
var _hoisted_2$1 = ["data-resourceid"];
var AgentFolderToolbar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentFolderToolbar",
	props: {
		project: {},
		items: {},
		folderId: {},
		canCreate: { type: Boolean },
		dragActive: { type: Boolean }
	},
	emits: [
		"navigate",
		"drop",
		"create"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const projectRoute = computed(() => props.project ? {
			name: PROJECT_AGENTS,
			params: { projectId: props.project.id }
		} : void 0);
		const menuItems = computed(() => props.canCreate ? [{
			id: "create",
			label: i18n.baseText("folders.actions.create")
		}] : []);
		function onDrop(event) {
			const target = event.target;
			const item = target instanceof Element ? target.closest("[data-resourceid]") : null;
			emit("drop", item?.dataset.resourceid ?? props.folderId ?? "0");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.toolbar),
				"data-test-id": "agent-folder-breadcrumbs",
				onDragover: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
				onDrop: withModifiers(onDrop, ["prevent"])
			}, [__props.items.length ? (openBlock(), createBlock(unref(N8nBreadcrumbs_default), {
				key: 0,
				items: __props.items,
				"drag-active": __props.dragActive,
				onItemSelected: _cache[0] || (_cache[0] = ($event) => emit("navigate", $event.id))
			}, {
				prepend: withCtx(() => [createBaseVNode("span", { "data-resourceid": unref("0") }, [createVNode(ProjectBreadcrumb_default, {
					"current-project": __props.project,
					to: projectRoute.value
				}, null, 8, ["current-project", "to"])], 8, _hoisted_1$1)]),
				_: 1
			}, 8, ["items", "drag-active"])) : (openBlock(), createElementBlock("span", {
				key: 1,
				"data-resourceid": unref("0")
			}, [createVNode(ProjectBreadcrumb_default, {
				"current-project": __props.project,
				to: projectRoute.value
			}, null, 8, ["current-project", "to"])], 8, _hoisted_2$1)), menuItems.value.length ? (openBlock(), createBlock(unref(DropdownMenu_default), {
				key: 2,
				items: menuItems.value,
				placement: "bottom-end",
				onSelect: _cache[1] || (_cache[1] = ($event) => emit("create"))
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					class: "action-toggle",
					variant: "ghost",
					icon: "ellipsis-12",
					size: "small",
					"icon-size": "medium",
					"aria-label": unref(i18n).baseText("generic.more"),
					"data-test-id": "agent-folder-breadcrumbs-actions"
				}, null, 8, ["aria-label"])]),
				_: 1
			}, 8, ["items"])) : createCommentVNode("", true)], 34);
		};
	}
}), [["__cssModules", { "$style": { toolbar: "_toolbar_y3lme_1" } }]]);
//#endregion
//#region src/features/agents/views/AgentsListView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { style: { "display": "contents" } };
var _hoisted_2 = ["draggable", "onDragstart"];
//#endregion
//#region src/features/agents/views/AgentsListView.vue
var AgentsListView_default = /* @__PURE__ */ defineComponent({
	__name: "AgentsListView",
	setup(__props) {
		function isAgentListItem(value) {
			return typeof value === "object" && value !== null && "id" in value;
		}
		const AGENTS_SORT_MAP = {
			lastUpdated: "updatedAt:desc",
			lastCreated: "createdAt:desc",
			nameAsc: "name:asc",
			nameDesc: "name:desc"
		};
		const locale = useI18n();
		const documentTitle = useDocumentTitle();
		const route = useRoute();
		const router = useRouter();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const folderBrowser = ref();
		const folders = ref([]);
		const folderAction = ref(null);
		const folderActionProjectId = ref("");
		const folderId = computed(() => typeof route.query.folderId === "string" ? route.query.folderId : null);
		const projectsStore = useProjectsStore();
		const sourceControlStore = useSourceControlStore();
		const insightsStore = useInsightsStore();
		const projectPages = useProjectPages();
		const uiStore = useUIStore();
		const toast = useToast();
		const agentTelemetry = useAgentTelemetry();
		const { createAgent } = useCreateAgent();
		const { callDebounced } = useDebounce();
		const { isFeatureEnabled: templatesExperimentEnabled, variant: templatesVariant, trackExposure: trackTemplatesExposure } = useAgentsListEmptyStateTemplatesExperiment();
		const showTemplatesIntro = computed(() => templatesExperimentEnabled.value);
		const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);
		const { canCreate: canCreateAgent, canUpdate: canUpdateAgent } = useAgentPermissions(() => projectId.value ?? homeProject.value?.id);
		const allAgents = ref([]);
		/** The shared list layout only accepts resource-typed rows; the wrapper is added at render time. */
		const agentRows = computed(() => allAgents.value.map((agent) => ({
			...agent,
			resourceType: "agent"
		})));
		const filters = ref({
			search: "",
			homeProject: "",
			showArchived: route.query.showArchived === "true"
		});
		const currentPage = ref(1);
		const pageSize = ref(50);
		const currentSort = ref("updatedAt:desc");
		const totalItems = ref(0);
		const hasArchivedAgents = ref(false);
		const loading = ref(true);
		const projectId = computed(() => typeof route.params.projectId === "string" ? route.params.projectId : void 0);
		const folderPermissions = computed(() => {
			const global = getResourcePermissions(usersStore.currentUser?.globalScopes).folder;
			const project = getResourcePermissions(projectsStore.myProjects.find((item) => item.id === projectId.value)?.scopes).folder;
			const canWrite = !sourceControlStore.preferences.branchReadOnly;
			return {
				create: canWrite && Boolean(global.create || project.create),
				update: canWrite && Boolean(global.update || project.update),
				delete: canWrite && Boolean(global.delete || project.delete),
				list: Boolean(global.list || project.list)
			};
		});
		const showFolders = computed(() => Boolean(projectId.value && settingsStore.isFoldersFeatureEnabled && folderPermissions.value.list));
		watch(() => !loading.value && totalItems.value === 0 && !filters.value.search && templatesVariant.value !== void 0, (surfaceVisible) => {
			if (surfaceVisible) trackTemplatesExposure();
		});
		const sortFns = {
			lastUpdated: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
			lastCreated: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			nameAsc: (a, b) => a.name.localeCompare(b.name),
			nameDesc: (a, b) => b.name.localeCompare(a.name)
		};
		function buildListFilter() {
			const filter = {
				...filters.value.search ? showFolders.value && folderId.value ? {
					parentFolderId: folderId.value,
					includeDescendants: true
				} : {} : showFolders.value ? { parentFolderId: folderId.value } : {},
				...filters.value.search ? { query: filters.value.search } : {},
				...filters.value.showArchived === true ? { includeArchived: true } : {}
			};
			return Object.keys(filter).length > 0 ? filter : void 0;
		}
		let fetchGeneration = 0;
		async function fetchAgents() {
			const requestGeneration = ++fetchGeneration;
			const requestProjectId = projectId.value;
			const requestFolderId = folderId.value;
			const search = filters.value.search;
			const skip = (currentPage.value - 1) * pageSize.value;
			const take = pageSize.value;
			const sortBy = currentSort.value;
			const includeFolders = showFolders.value;
			const filter = buildListFilter();
			const shouldDelayLoading = allAgents.value.length > 0 || folders.value.length > 0;
			const delayedLoading = (0, import_debounce.default)(() => {
				if (requestGeneration === fetchGeneration) loading.value = true;
			}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
			if (shouldDelayLoading) delayedLoading();
			else loading.value = true;
			try {
				const folderPage = requestProjectId && includeFolders ? await getProjectFolders(rootStore.restApiContext, requestProjectId, {
					resourceType: "agent",
					skip,
					take,
					sortBy
				}, {
					parentFolderId: requestFolderId ?? "0",
					...search ? { name: search } : {}
				}, [
					"id",
					"name",
					"parentFolder",
					"agentCount",
					"subFolderCount",
					"path",
					"updatedAt",
					"createdAt"
				]) : {
					data: [],
					count: 0
				};
				if (requestGeneration !== fetchGeneration) return;
				const agentSlots = take - folderPage.data.length;
				const fetchOptions = {
					offset: Math.max(0, skip - folderPage.count),
					limit: Math.max(1, agentSlots),
					sortBy,
					filter
				};
				const { count, data } = requestProjectId ? await listAgentsPage(rootStore.restApiContext, requestProjectId, fetchOptions) : await listAgentsPageGlobal(rootStore.restApiContext, fetchOptions);
				if (requestGeneration !== fetchGeneration) return;
				let archivedAgentsExist = false;
				if (!search && !filter?.includeArchived && count === 0 && folderPage.count === 0 && (!includeFolders || !requestFolderId)) {
					const archivedOptions = {
						offset: 0,
						limit: 1,
						filter: {
							...filter,
							includeArchived: true
						}
					};
					archivedAgentsExist = (requestProjectId ? await listAgentsPage(rootStore.restApiContext, requestProjectId, archivedOptions) : await listAgentsPageGlobal(rootStore.restApiContext, archivedOptions)).count > 0;
				}
				if (requestGeneration !== fetchGeneration) return;
				folders.value = folderPage.data;
				allAgents.value = agentSlots > 0 ? data : [];
				totalItems.value = folderPage.count + count;
				hasArchivedAgents.value = archivedAgentsExist;
			} catch (error) {
				if (requestGeneration === fetchGeneration) toast.showError(error, locale.baseText("agents.list.loadError"));
			} finally {
				delayedLoading.cancel();
				if (requestGeneration === fetchGeneration) loading.value = false;
			}
		}
		function onSelectAgent(agentId, agentProjectId) {
			router.push({
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: agentProjectId,
					agentId
				}
			});
		}
		function onNewAgentChat(agentId, agentProjectId) {
			router.push({
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: agentProjectId,
					agentId
				},
				query: { [NEW_SESSION_PARAM]: "true" }
			});
		}
		function onAgentDuplicate(agentId) {
			const agent = allAgents.value.find((a) => a.id === agentId);
			if (!agent) return;
			if (!agent.hasConfig) {
				toast.showMessage({
					title: locale.baseText("agents.duplicate.modal.unconfigured"),
					type: "info"
				});
				return;
			}
			uiStore.openModalWithData({
				name: AGENT_DUPLICATE_MODAL_KEY,
				data: {
					projectId: agent.projectId,
					agentId: agent.id,
					name: agent.name,
					existingNames: allAgents.value.map((a) => a.name),
					onConfirm: async (newName) => {
						try {
							const duplicated = await duplicateAgent(rootStore.restApiContext, agent.projectId, agent.id, newName);
							agentTelemetry.trackDuplicatedAgent({
								sourceAgentId: agent.id,
								agentId: duplicated.id,
								projectId: agent.projectId
							});
							upsertProjectAgentsListCache(agent.projectId, duplicated);
							toast.showMessage({
								title: locale.baseText("agents.duplicate.modal.success"),
								type: "success"
							});
							onSelectAgent(duplicated.id, agent.projectId);
						} catch (error) {
							toast.showError(error, locale.baseText("agents.duplicate.modal.error"));
							throw error;
						}
					}
				}
			});
		}
		function onAgentPublished(updated) {
			const item = toAgentListItem(updated);
			allAgents.value = allAgents.value.map((a) => a.id === item.id ? item : a);
			fetchAgents();
		}
		function createFolder() {
			if (!projectId.value || !showFolders.value) return;
			folderActionProjectId.value = projectId.value;
			folderAction.value = {
				mode: "create",
				parentFolderId: folderId.value
			};
		}
		function openMove(agent) {
			folderActionProjectId.value = agent.projectId;
			folderAction.value = {
				mode: "moveAgent",
				id: agent.id,
				name: agent.name,
				parentFolderId: agent.parentFolderId
			};
		}
		watch([
			projectId,
			folderId,
			showFolders
		], () => {
			currentPage.value = 1;
			folders.value = [];
			allAgents.value = [];
			totalItems.value = 0;
			hasArchivedAgents.value = false;
			fetchAgents();
		});
		function onAgentUnpublished(updated) {
			const item = toAgentListItem(updated);
			allAgents.value = allAgents.value.map((a) => a.id === item.id ? item : a);
			fetchAgents();
		}
		function onAgentDeleted(agentId) {
			allAgents.value = allAgents.value.filter((a) => a.id !== agentId);
			totalItems.value = Math.max(0, totalItems.value - 1);
			if (allAgents.value.length === 0 && folders.value.length === 0 && currentPage.value > 1) currentPage.value -= 1;
			fetchAgents();
		}
		function onAgentArchived(updated) {
			if (filters.value.showArchived === true) {
				onAgentUnpublished(updated);
				return;
			}
			onAgentDeleted(updated.id);
		}
		watch(() => filters.value.showArchived === true, async (showArchived) => {
			const query = { ...route.query };
			if (showArchived) query.showArchived = "true";
			else delete query.showArchived;
			await router.replace({ query });
			currentPage.value = 1;
			await fetchAgents();
		});
		async function onSearchUpdated(search) {
			filters.value = {
				...filters.value,
				search
			};
			currentPage.value = 1;
			if (search) await callDebounced(fetchAgents, {
				debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
				trailing: true
			});
			else await fetchAgents();
		}
		async function setPaginationAndSort(payload) {
			if (payload.page) currentPage.value = payload.page;
			if (payload.pageSize) pageSize.value = payload.pageSize;
			if (payload.sort) currentSort.value = AGENTS_SORT_MAP[payload.sort] ?? "updatedAt:desc";
			if (!loading.value) await callDebounced(fetchAgents, {
				debounceTime: DEBOUNCE_TIME.API.RESOURCE_SEARCH,
				trailing: true
			});
		}
		function targetProjectIdForCreate() {
			return projectId.value ?? projectsStore.personalProject?.id ?? "";
		}
		function onCreateAgentClick() {
			createAgent("button", targetProjectIdForCreate());
		}
		function onCreateBlank() {
			createAgent("empty_state_blank", targetProjectIdForCreate());
		}
		function onCreateFromPrompt(text) {
			createAgent("empty_state_prompt", targetProjectIdForCreate(), {
				kind: "prompt",
				text
			});
		}
		function onCreateFromTemplate(template) {
			createAgent("empty_state_template", targetProjectIdForCreate(), {
				kind: "template",
				templateId: template.id
			});
		}
		onMounted(async () => {
			documentTitle.set(locale.baseText("agents.heading"));
			if (projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled) insightsStore.weeklySummary.execute();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(ResourcesListLayout_default, {
				filters: filters.value,
				"onUpdate:filters": _cache[4] || (_cache[4] = ($event) => filters.value = $event),
				"resource-key": "agents",
				type: "list-paginated",
				resources: agentRows.value,
				initialize: fetchAgents,
				loading: false,
				"resources-refreshing": loading.value,
				disabled: false,
				"sort-fns": sortFns,
				"sort-options": [
					"lastUpdated",
					"lastCreated",
					"nameAsc",
					"nameDesc"
				],
				"type-props": { itemSize: 80 },
				"custom-page-size": unref(50),
				"total-items": totalItems.value,
				"has-empty-state": !showFolders.value || totalItems.value === 0 && !folderId.value,
				"dont-perform-sorting-and-filtering": true,
				shareable: false,
				"ui-config": {
					searchEnabled: true,
					showFiltersDropdown: true,
					sortEnabled: true
				},
				"display-name": (agent) => agent.name,
				"tab-key": "agents",
				"onUpdate:search": onSearchUpdated,
				"onUpdate:paginationAndSort": setPaginationAndSort
			}, createSlots({
				header: withCtx(() => [createVNode(ProjectHeader_default, {
					"main-button": "agent",
					onCreateFolder: createFolder
				}, {
					default: withCtx(() => [unref(projectPages).isOverviewSubPage && unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(unref(InsightsSummary_default), {
						key: 0,
						loading: unref(insightsStore).weeklySummary.isLoading,
						summary: unref(insightsStore).weeklySummary.state,
						"time-range": "week"
					}, null, 8, ["loading", "summary"])) : createCommentVNode("", true)]),
					_: 1
				})]),
				empty: withCtx(() => [hasArchivedAgents.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
					key: 0,
					class: "mb-s",
					bold: false
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("agents.list.archivedOnly.hint")) + " ", 1), createVNode(unref(N8nLink_default), {
						size: "small",
						"data-test-id": "show-archived-agents",
						onClick: _cache[2] || (_cache[2] = ($event) => filters.value.showArchived = true)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("agents.list.filters.showArchived")), 1)]),
						_: 1
					})]),
					_: 1
				})) : createCommentVNode("", true), showTemplatesIntro.value ? (openBlock(), createBlock(AgentsListIntro_default, {
					key: 1,
					disabled: !unref(canCreateAgent),
					onCreateBlank,
					onSubmit: onCreateFromPrompt,
					onSelect: onCreateFromTemplate
				}, null, 8, ["disabled"])) : (openBlock(), createBlock(ResourcesListEmptyState_default, {
					key: 2,
					"resource-key": "agents",
					"button-disabled": !unref(canCreateAgent),
					"onClick:button": onCreateAgentClick
				}, null, 8, ["button-disabled"]))]),
				filters: withCtx(({ setKeyValue }) => [createVNode(unref(Checkbox_default), {
					label: unref(locale).baseText("agents.list.filters.showArchived"),
					"model-value": filters.value.showArchived === true,
					"data-test-id": "agents-show-archived-checkbox",
					"onUpdate:modelValue": ($event) => setKeyValue("showArchived", $event)
				}, null, 8, [
					"label",
					"model-value",
					"onUpdate:modelValue"
				])]),
				item: withCtx(({ item: data }) => [isAgentListItem(data) ? (openBlock(), createElementBlock("div", {
					key: 0,
					draggable: showFolders.value && unref(canUpdateAgent),
					onDragstart: ($event) => folderBrowser.value?.startAgentDrag(data.id),
					onDragend: _cache[3] || (_cache[3] = ($event) => folderBrowser.value?.endDrag())
				}, [createVNode(AgentCard_default, {
					class: "mb-2xs",
					agent: data,
					"show-folder-path": Boolean(filters.value.search),
					"project-id": data.projectId,
					onSelect: ($event) => onSelectAgent(data.id, data.projectId),
					onNewChat: onNewAgentChat,
					onPublished: onAgentPublished,
					onUnpublished: onAgentUnpublished,
					onDeleted: onAgentDeleted,
					onArchived: onAgentArchived,
					onUnarchived: onAgentUnpublished,
					onDuplicate: onAgentDuplicate,
					onMove: ($event) => openMove(data)
				}, null, 8, [
					"agent",
					"show-folder-path",
					"project-id",
					"onSelect",
					"onMove"
				])], 40, _hoisted_2)) : createCommentVNode("", true)]),
				_: 2
			}, [showFolders.value ? {
				name: "breadcrumbs",
				fn: withCtx(() => [createVNode(AgentFolderToolbar_default, {
					project: homeProject.value ?? void 0,
					items: folderBrowser.value?.breadcrumbs ?? [],
					"folder-id": folderId.value,
					"can-create": folderPermissions.value.create,
					"drag-active": folderBrowser.value?.isDragging ?? false,
					onNavigate: _cache[0] || (_cache[0] = ($event) => folderBrowser.value?.navigate($event)),
					onDrop: _cache[1] || (_cache[1] = ($event) => folderBrowser.value?.drop($event)),
					onCreate: createFolder
				}, null, 8, [
					"project",
					"items",
					"folder-id",
					"can-create",
					"drag-active"
				])]),
				key: "0"
			} : void 0, showFolders.value && projectId.value ? {
				name: "list-prepend",
				fn: withCtx(() => [createVNode(AgentFolderBrowser_default, {
					ref_key: "folderBrowser",
					ref: folderBrowser,
					"project-id": projectId.value,
					"folder-id": folderId.value,
					folders: folders.value,
					search: filters.value.search,
					"folder-permissions": folderPermissions.value,
					onChanged: fetchAgents
				}, null, 8, [
					"project-id",
					"folder-id",
					"folders",
					"search",
					"folder-permissions"
				]), !loading.value && totalItems.value === 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [filters.value.search ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-base",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("agents.noResults")), 1)]),
					_: 1
				})) : folderId.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
					key: 1,
					"data-test-id": "empty-agent-folder-action-box",
					heading: unref(locale).baseText("folders.empty.actionbox.title", { interpolate: { folderName: folderBrowser.value?.breadcrumbs.at(-1)?.label ?? "" } }),
					"button-text": unref(locale).baseText("projects.header.create.agent"),
					"button-type": "secondary",
					"button-disabled": !unref(canCreateAgent),
					"onClick:button": onCreateAgentClick
				}, null, 8, [
					"heading",
					"button-text",
					"button-disabled"
				])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)]),
				key: "1"
			} : void 0]), 1032, [
				"filters",
				"resources",
				"resources-refreshing",
				"custom-page-size",
				"total-items",
				"has-empty-state",
				"display-name"
			]), createVNode(AgentFolderDialog_default, {
				"project-id": folderActionProjectId.value,
				action: folderAction.value,
				onClose: _cache[5] || (_cache[5] = ($event) => folderAction.value = null),
				onSaved: fetchAgents
			}, null, 8, ["project-id", "action"])]);
		};
	}
});
//#endregion
export { AgentsListView_default as default };
