import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Jd as defineComponent, Jo as onBeforeRouteUpdate, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, lo as defineStore, mf as renderList, qo as onBeforeRouteLeave, vf as resolveDynamicComponent, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Bj as SettingsRow_default, Fw as makeRestApiRequest, HM as N8nAvatar_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, J as SELF_HEALING_CONFIGURATION_VIEW, K as PERSONAL_SELF_HEALING_CONFIGURATION_VIEW, PA as useMessage, Pj as SettingsSection_default, SN as _plugin_vue_export_helper_default, Uj as SettingsLayout_default, YM as N8nActionToggle_default, Zj as PreviewBadge_default, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, dC as useToast, dM as N8nSwitch_default, ej as N8nDataTableServer_default, fC as VIEWS, fN as N8nTooltip_default, gj as N8nTimeAgo_default, jN as useI18n, kA as Combobox_default, kj as N8nSegmentControl_default, nN as N8nBadge_default, q as PERSONAL_SELF_HEALING_VIEW, tN as N8nLoading_default, vN as N8nIconButton_default, vj as N8nTag_default, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, zj as EnterpriseReadinessBadge_default } from "./app-D5flEmb-.js";
//#region ../../modules/self-healing/frontend/src/self-healing.api.ts
var path = (projectId) => `/projects/${projectId}/self-healing-configurations`;
var fetchConfigurations = async (context, projectId) => await makeRestApiRequest(context, "GET", path(projectId));
var fetchConfigurationOptions = async (context, projectId) => await makeRestApiRequest(context, "GET", `${path(projectId)}/options`);
var saveConfiguration = async (context, projectId, input, id) => {
	if (id === void 0) return await makeRestApiRequest(context, "POST", path(projectId), input);
	return await makeRestApiRequest(context, "PATCH", `${path(projectId)}/${id}`, input);
};
var setConfigurationEnabled = async (context, projectId, id, enabled) => await makeRestApiRequest(context, "PATCH", `${path(projectId)}/${id}/enabled`, { enabled });
var removeConfiguration = async (context, projectId, id) => await makeRestApiRequest(context, "DELETE", `${path(projectId)}/${id}`);
var fetchWorkflowDependencies = async (context, workflowIds) => await makeRestApiRequest(context, "POST", "/workflow-dependencies/details", {
	resourceIds: workflowIds,
	resourceType: "workflow"
});
//#endregion
//#region ../../modules/self-healing/frontend/src/self-healing.store.ts
init_reactivity_esm_bundler();
var useSelfHealingStore = defineStore("selfHealing", () => {
	const root = useRootStore();
	const configurations = ref({});
	const options = ref({});
	const pendingLoads = /* @__PURE__ */ new Map();
	async function load(projectId) {
		const request = Symbol();
		pendingLoads.set(projectId, request);
		const [rows, choices] = await Promise.all([fetchConfigurations(root.restApiContext, projectId), fetchConfigurationOptions(root.restApiContext, projectId)]);
		if (pendingLoads.get(projectId) !== request) return;
		pendingLoads.delete(projectId);
		configurations.value[projectId] = rows;
		options.value[projectId] = choices;
	}
	function remember(projectId, configuration) {
		pendingLoads.delete(projectId);
		const rows = configurations.value[projectId] ?? [];
		configurations.value[projectId] = rows.some(({ id }) => id === configuration.id) ? rows.map((row) => row.id === configuration.id ? configuration : row) : [...rows, configuration];
	}
	async function save(projectId, input, id) {
		const configuration = await saveConfiguration(root.restApiContext, projectId, input, id);
		remember(projectId, configuration);
		return configuration;
	}
	async function setEnabled(projectId, id, enabled) {
		remember(projectId, await setConfigurationEnabled(root.restApiContext, projectId, id, enabled));
	}
	async function remove(projectId, id) {
		await removeConfiguration(root.restApiContext, projectId, id);
		pendingLoads.delete(projectId);
		configurations.value[projectId] = (configurations.value[projectId] ?? []).filter((row) => row.id !== id);
	}
	return {
		configurations,
		options,
		load,
		save,
		setEnabled,
		remove
	};
});
//#endregion
//#region ../../modules/self-healing/frontend/src/components/ProjectMembersIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ProjectMembersIcon_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectMembersIcon",
	props: {
		icon: { default: null },
		size: { default: "small" }
	},
	setup(__props) {
		const iconSizes = {
			xsmall: "small",
			small: "medium",
			medium: "large"
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				class: normalizeClass([_ctx.$style.icon, _ctx.$style[__props.size]]),
				"aria-hidden": "true",
				"data-test-id": "project-members-icon"
			}, [__props.icon?.type === "emoji" ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.emoji)
			}, toDisplayString(__props.icon.value), 3)) : (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 1,
				icon: __props.icon?.value ?? "layers",
				color: __props.icon?.color ?? "text-base",
				size: iconSizes[__props.size]
			}, null, 8, [
				"icon",
				"color",
				"size"
			]))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	icon: "_icon_4a7um_1",
	xsmall: "_xsmall_4a7um_10",
	emoji: "_emoji_4a7um_14",
	small: "_small_4a7um_18",
	medium: "_medium_4a7um_26"
} }]]);
//#endregion
//#region ../../modules/self-healing/frontend/src/components/ProjectSelfHealingSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ProjectSelfHealingSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectSelfHealingSection",
	props: {
		projectId: {},
		variant: { default: "projectSettings" }
	},
	setup(__props) {
		const props = __props;
		const isPersonalTab = computed(() => props.variant === "personalTab");
		const store = useSelfHealingStore();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const toast = useToast();
		const message = useMessage();
		const router = useRouter();
		const route = useRoute();
		const sectionRef = ref(null);
		const loading = ref(false);
		const isUpdating = ref(false);
		const failed = ref(false);
		const configurations = computed(() => store.configurations[props.projectId] ?? []);
		const headers = computed(() => [
			{
				title: i18n.baseText("selfHealing.config.scope"),
				key: "scope",
				width: 240,
				disableSort: true
			},
			...isPersonalTab.value ? [] : [{
				title: i18n.baseText("selfHealing.config.peopleToNotify"),
				key: "reviewerIds",
				width: 200,
				disableSort: true
			}],
			{
				title: i18n.baseText("selfHealing.config.lastActivity"),
				key: "lastActivity",
				width: 200,
				disableSort: true
			},
			{
				title: i18n.baseText("selfHealing.config.active"),
				key: "enabled",
				width: 110,
				disableSort: true
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 46,
				disableSort: true,
				value: () => void 0
			}
		]);
		const configActions = computed(() => [{
			label: i18n.baseText("generic.edit"),
			value: "edit"
		}, {
			label: i18n.baseText("generic.delete"),
			value: "delete",
			destructive: true
		}]);
		const reviewersById = computed(() => new Map(store.options[props.projectId]?.reviewers.map((reviewer) => [reviewer.id, reviewer])));
		const project = computed(() => store.options[props.projectId]?.project);
		const projectMembersLabel = computed(() => i18n.baseText("selfHealing.config.projectMembers", { interpolate: { project: project.value?.name ?? "" } }));
		const workflowNamesById = computed(() => new Map(store.options[props.projectId]?.workflows.map((workflow) => [workflow.id, workflow.name])));
		const hasSelectedWorkflowConfiguration = computed(() => configurations.value.some(({ scope, workflowIds }) => scope === "selected" && workflowIds.length > 0));
		function scopeLabel(configuration) {
			if (configuration.scope === "all") return i18n.baseText(hasSelectedWorkflowConfiguration.value ? "selfHealing.config.allOther" : "selfHealing.config.all");
			const [onlyWorkflowId] = configuration.workflowIds;
			const onlyWorkflowName = configuration.workflowIds.length === 1 ? workflowNamesById.value.get(onlyWorkflowId) : void 0;
			if (onlyWorkflowName) return onlyWorkflowName;
			return i18n.baseText("selfHealing.config.selectedCount", {
				adjustToNumber: configuration.workflowIds.length,
				interpolate: { count: configuration.workflowIds.length }
			});
		}
		async function load() {
			loading.value = true;
			failed.value = false;
			try {
				await store.load(props.projectId);
			} catch (error) {
				failed.value = true;
				toast.showError(error, i18n.baseText("selfHealing.config.loadError"));
			} finally {
				loading.value = false;
				if (route.hash === "#self-healing") {
					await nextTick();
					sectionRef.value?.scrollIntoView({ block: "start" });
				}
			}
		}
		watch(() => props.projectId, load, { immediate: true });
		function edit(id) {
			router.push({
				name: isPersonalTab.value ? PERSONAL_SELF_HEALING_CONFIGURATION_VIEW : SELF_HEALING_CONFIGURATION_VIEW,
				params: {
					projectId: props.projectId,
					configurationId: String(id)
				}
			});
		}
		function reviewerName(id) {
			const user = reviewersById.value.get(id);
			return user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email : i18n.baseText("selfHealing.config.unavailableReviewer");
		}
		async function toggle(configuration) {
			isUpdating.value = true;
			try {
				await store.setEnabled(props.projectId, configuration.id, !configuration.enabled);
			} catch (error) {
				toast.showError(error, i18n.baseText("selfHealing.config.saveError"));
			} finally {
				isUpdating.value = false;
			}
		}
		async function remove(configuration) {
			if (await message.confirm(i18n.baseText("selfHealing.config.removeMessage"), i18n.baseText("selfHealing.config.removeTitle"), {
				confirmButtonText: i18n.baseText("generic.delete"),
				cancelButtonText: i18n.baseText("generic.cancel"),
				type: "warning"
			}) !== "confirm") return;
			isUpdating.value = true;
			try {
				await store.remove(props.projectId, configuration.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("selfHealing.config.removeError"));
			} finally {
				isUpdating.value = false;
			}
		}
		async function onAction(configuration, action) {
			if (action === "edit") edit(configuration.id);
			else if (action === "delete") await remove(configuration);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(isPersonalTab.value ? "div" : "fieldset"), {
				id: "self-healing",
				ref_key: "sectionRef",
				ref: sectionRef,
				class: normalizeClass({ [_ctx.$style.personalTab]: isPersonalTab.value }),
				"data-test-id": "project-self-healing"
			}, {
				default: withCtx(() => [
					!isPersonalTab.value ? (openBlock(), createElementBlock("h3", {
						key: 0,
						class: normalizeClass(_ctx.$style.heading)
					}, [
						createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("selfHealing.config.heading")), 1),
						createVNode(unref(PreviewBadge_default), {
							size: "xsmall",
							"data-test-id": "self-healing-preview-badge"
						}),
						unref(settingsStore).isEnterprisePlan ? (openBlock(), createBlock(unref(EnterpriseReadinessBadge_default), {
							key: 0,
							size: "xsmall",
							"data-test-id": "self-healing-enterprise-readiness-badge"
						})) : createCommentVNode("", true)
					], 2)) : createCommentVNode("", true),
					isPersonalTab.value && loading.value ? renderSlot(_ctx.$slots, "loading", { key: 1 }) : failed.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						type: "button",
						variant: "outline",
						onClick: load
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.retry")), 1)]),
						_: 1
					})) : loading.value && !configurations.value.length ? (openBlock(), createBlock(unref(N8nLoading_default), {
						key: 3,
						class: normalizeClass(_ctx.$style.loadingLine),
						"data-test-id": "self-healing-config-loading"
					}, null, 8, ["class"])) : !configurations.value.length && isPersonalTab.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 4,
						icon: {
							type: "icon",
							value: "life-buoy"
						},
						heading: unref(i18n).baseText("selfHealing.config.emptyHeading"),
						description: unref(i18n).baseText("selfHealing.config.emptyDescription"),
						"button-text": unref(i18n).baseText("selfHealing.config.create"),
						"onClick:button": _cache[0] || (_cache[0] = ($event) => edit("new"))
					}, null, 8, [
						"heading",
						"description",
						"button-text"
					])) : !configurations.value.length ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 5,
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.empty)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.empty")), 1)]),
						_: 1
					}, 8, ["class"])) : (openBlock(), createElementBlock("div", {
						key: 6,
						class: normalizeClass(_ctx.$style.table)
					}, [createVNode(unref(N8nDataTableServer_default), {
						loading: loading.value,
						"items-per-page": configurations.value.length,
						headers: headers.value,
						items: configurations.value,
						"items-length": configurations.value.length,
						"page-sizes": [configurations.value.length + 1]
					}, {
						[`item.scope`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), {
							size: "medium",
							color: "text-dark",
							class: normalizeClass(_ctx.$style.scope),
							title: scopeLabel(item),
							"data-test-id": "self-healing-configuration-row"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(scopeLabel(item)), 1)]),
							_: 2
						}, 1032, ["class", "title"])]),
						[`item.reviewerIds`]: withCtx(({ item }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.people) }, [item.includeAllProjectMembers ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.person),
							"data-test-id": "self-healing-project-members"
						}, [createVNode(ProjectMembersIcon_default, {
							icon: project.value?.icon,
							size: "xsmall"
						}, null, 8, ["icon"]), createVNode(unref(N8nText_default), {
							size: "medium",
							color: "text-dark",
							class: normalizeClass(_ctx.$style.personName),
							title: projectMembersLabel.value
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(projectMembersLabel.value), 1)]),
							_: 1
						}, 8, ["class", "title"])], 2)) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(item.reviewerIds, (id) => {
							return openBlock(), createElementBlock("div", {
								key: id,
								class: normalizeClass(_ctx.$style.person)
							}, [createVNode(unref(N8nAvatar_default), {
								"first-name": reviewersById.value.get(id)?.firstName,
								"last-name": reviewersById.value.get(id)?.lastName,
								size: "xsmall"
							}, null, 8, ["first-name", "last-name"]), createVNode(unref(N8nText_default), {
								size: "medium",
								color: "text-dark",
								class: normalizeClass(_ctx.$style.personName),
								title: reviewerName(id)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(reviewerName(id)), 1)]),
								_: 2
							}, 1032, ["class", "title"])], 2);
						}), 128))], 2)]),
						[`item.lastActivity`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), {
							size: "medium",
							color: item.lastActivity ? "text-dark" : "text-light"
						}, {
							default: withCtx(() => [item.lastActivity ? (openBlock(), createBlock(unref(N8nTimeAgo_default), {
								key: 0,
								date: item.lastActivity,
								locale: unref(rootStore).defaultLocale
							}, null, 8, ["date", "locale"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.noActivity")), 1)], 64))]),
							_: 2
						}, 1032, ["color"])]),
						[`item.enabled`]: withCtx(({ item }) => [createVNode(unref(N8nSwitch_default), {
							"model-value": item.enabled,
							disabled: isUpdating.value,
							"aria-label": unref(i18n).baseText("selfHealing.config.enabled"),
							"data-test-id": "self-healing-config-active",
							"onUpdate:modelValue": ($event) => toggle(item)
						}, null, 8, [
							"model-value",
							"disabled",
							"aria-label",
							"onUpdate:modelValue"
						])]),
						[`item.actions`]: withCtx(({ item }) => [createVNode(unref(N8nActionToggle_default), {
							actions: configActions.value,
							placement: "bottom",
							disabled: isUpdating.value,
							"data-test-id": "self-healing-config-actions",
							onAction: ($event) => onAction(item, $event)
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "ellipsis-12",
								"icon-size": "small",
								variant: "ghost",
								size: "small",
								disabled: isUpdating.value,
								"aria-label": unref(i18n).baseText("selfHealing.config.actions")
							}, null, 8, ["disabled", "aria-label"])]),
							_: 1
						}, 8, [
							"actions",
							"disabled",
							"onAction"
						])]),
						_: 2
					}, 1032, [
						"loading",
						"items-per-page",
						"headers",
						"items",
						"items-length",
						"page-sizes"
					])], 2)),
					!isPersonalTab.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 7,
						variant: "outline",
						size: "large",
						icon: "plus",
						type: "button",
						"data-test-id": "self-healing-create",
						onClick: _cache[1] || (_cache[1] = ($event) => edit("new"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.create")), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				]),
				_: 3
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	personalTab: "_personalTab_nytks_1",
	heading: "_heading_nytks_5",
	table: "_table_nytks_12",
	people: "_people_nytks_19",
	person: "_person_nytks_1",
	scope: "_scope_nytks_33",
	personName: "_personName_nytks_34",
	empty: "_empty_nytks_41",
	loadingLine: "_loadingLine_nytks_46"
} }]]);
//#endregion
//#region ../../modules/self-healing/frontend/src/components/SubWorkflowPill.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var HEADER_ID = "__sub-workflows-header__";
var SubWorkflowPill_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SubWorkflowPill",
	props: { subWorkflows: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		function statusLabel(status) {
			if (status === "external") return i18n.baseText("selfHealing.config.subWorkflows.external");
			if (status === "uncovered") return i18n.baseText("selfHealing.config.subWorkflows.notCovered");
			return null;
		}
		const items = computed(() => [{
			id: HEADER_ID,
			label: i18n.baseText("selfHealing.config.subWorkflows.heading"),
			icon: {
				type: "icon",
				value: "log-in"
			},
			disabled: true
		}, ...props.subWorkflows.map((subWorkflow) => ({
			id: subWorkflow.id,
			label: subWorkflow.name,
			data: statusLabel(subWorkflow.status),
			testId: `self-healing-sub-workflow-${subWorkflow.id}`
		}))]);
		function onSelect(workflowId) {
			if (workflowId === HEADER_ID) return;
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId }
			});
			window.open(href, "_blank", "noopener");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				items: items.value,
				placement: "bottom-end",
				"max-height": 280,
				"data-test-id": "self-healing-sub-workflow-pill",
				onSelect
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					content: unref(i18n).baseText("selfHealing.config.subWorkflows.tooltip"),
					placement: "top",
					"as-child": ""
				}, {
					default: withCtx(() => [createVNode(unref(N8nBadge_default), {
						variant: "outline",
						clickable: "",
						"aria-label": unref(i18n).baseText("selfHealing.config.subWorkflows.count", {
							adjustToNumber: __props.subWorkflows.length,
							interpolate: { count: String(__props.subWorkflows.length) }
						})
					}, {
						leading: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "graph-12",
							size: "small",
							class: normalizeClass(_ctx.$style.icon)
						}, null, 8, ["class"])]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(__props.subWorkflows.length), 1)]),
						_: 1
					}, 8, ["aria-label"])]),
					_: 1
				}, 8, ["content"])]),
				"item-trailing": withCtx(({ item }) => [item.data ? (openBlock(), createBlock(unref(N8nTag_default), {
					key: 0,
					text: item.data,
					clickable: false
				}, null, 8, ["text"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["items"]);
		};
	}
}), [["__cssModules", { "$style": { icon: "_icon_5jcct_1" } }]]);
//#endregion
//#region ../../modules/self-healing/frontend/src/composables/useSubWorkflowScope.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var BATCH_SIZE = 100;
function useSubWorkflowScope(options) {
	const root = useRootStore();
	const calls = ref(/* @__PURE__ */ new Map());
	const pendingIds = ref(/* @__PURE__ */ new Set());
	const latestRequests = /* @__PURE__ */ new Map();
	let requestCount = 0;
	async function fetchCalls(workflowIds) {
		for (let start = 0; start < workflowIds.length; start += BATCH_SIZE) {
			const batch = workflowIds.slice(start, start + BATCH_SIZE);
			const request = ++requestCount;
			for (const id of batch) latestRequests.set(id, request);
			const result = await fetchWorkflowDependencies(root.restApiContext, batch);
			for (const id of batch) {
				if (latestRequests.get(id) !== request) continue;
				calls.value.set(id, (result[id]?.dependencies ?? []).filter(({ type }) => type === "workflowCall").map(({ id: calledId, name }) => ({
					id: calledId,
					name
				})));
			}
		}
	}
	async function load(workflowIds, { refresh = false } = {}) {
		const visited = /* @__PURE__ */ new Set();
		let level = workflowIds;
		while (level.length > 0) {
			for (const id of level) visited.add(id);
			const missing = level.filter((id) => refresh || !calls.value.has(id));
			for (const id of missing) pendingIds.value.add(id);
			try {
				if (missing.length > 0) await fetchCalls(missing);
			} catch {
				return;
			} finally {
				for (const id of missing) pendingIds.value.delete(id);
			}
			const next = /* @__PURE__ */ new Set();
			for (const id of level) for (const { id: calledId } of calls.value.get(id) ?? []) if (!visited.has(calledId) && options.projectWorkflowNames.value.has(calledId)) next.add(calledId);
			level = [...next];
		}
	}
	function statusOf(workflowId) {
		if (!options.projectWorkflowNames.value.has(workflowId)) return "external";
		return options.includeSubWorkflows.value ? "covered" : "uncovered";
	}
	function subWorkflowsOf(rootId) {
		const entries = [];
		const seen = /* @__PURE__ */ new Set([rootId]);
		const walk = (parentId) => {
			for (const { id, name } of calls.value.get(parentId) ?? []) {
				if (seen.has(id)) continue;
				seen.add(id);
				const status = statusOf(id);
				entries.push({
					id,
					name: options.projectWorkflowNames.value.get(id) ?? name,
					status
				});
				if (status !== "external") walk(id);
			}
		};
		walk(rootId);
		return entries;
	}
	return {
		load,
		coverage: computed(() => new Map(options.selectedIds.value.map((id) => {
			const subWorkflows = subWorkflowsOf(id);
			return [id, {
				subWorkflows,
				uncoveredCount: subWorkflows.filter(({ status }) => status === "uncovered").length,
				externalCount: subWorkflows.filter(({ status }) => status === "external").length,
				checking: pendingIds.value.has(id) && !calls.value.has(id)
			}];
		})))
	};
}
//#endregion
//#region ../../modules/self-healing/frontend/src/views/SelfHealingConfigView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	key: 0,
	"data-test-id": "self-healing-config-loading"
};
var PROJECT_MEMBERS_OPTION = "__project-members__";
var SelfHealingConfigView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingConfigView",
	props: {
		projectId: {},
		configurationId: {}
	},
	setup(__props) {
		const props = __props;
		const store = useSelfHealingStore();
		const users = useUsersStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const toast = useToast();
		const message = useMessage();
		const router = useRouter();
		const route = useRoute();
		const pageRef = ref(null);
		const costNote = computed(() => i18n.baseText(settingsStore.moduleSettings["instance-ai"]?.proxyEnabled ? "selfHealing.config.costCredits" : "selfHealing.config.costProvider"));
		const loading = ref(true);
		const saving = ref(false);
		const loadError = ref(false);
		const savedForm = ref();
		const form = ref({
			scope: "all",
			workflowIds: [],
			reviewerIds: [],
			includeAllProjectMembers: false,
			includeSubWorkflows: true,
			enabled: true
		});
		const isNew = computed(() => props.configurationId === "new");
		const isPersonalTab = computed(() => route.name === PERSONAL_SELF_HEALING_CONFIGURATION_VIEW);
		const choices = computed(() => store.options[props.projectId]);
		const otherConfigurations = computed(() => (store.configurations[props.projectId] ?? []).filter(({ id }) => String(id) !== props.configurationId));
		const hasAllWorkflowsConfiguration = computed(() => otherConfigurations.value.some(({ scope }) => scope === "all"));
		const reservedWorkflows = computed(() => new Set(otherConfigurations.value.flatMap(({ workflowIds }) => workflowIds)));
		const scopeOptions = computed(() => [{
			value: "all",
			label: i18n.baseText("selfHealing.config.allScope"),
			disabled: hasAllWorkflowsConfiguration.value
		}, {
			value: "selected",
			label: i18n.baseText("selfHealing.config.selected")
		}]);
		const workflowPickerItems = computed(() => (choices.value?.workflows ?? []).filter(({ id }) => !form.value.workflowIds.includes(id)).map(({ id, name }) => ({
			value: id,
			label: name,
			icon: "workflow",
			disabled: reservedWorkflows.value.has(id)
		})));
		const projectWorkflowNames = computed(() => new Map(choices.value?.workflows.map(({ id, name }) => [id, name])));
		const subWorkflowScope = useSubWorkflowScope({
			selectedIds: computed(() => form.value.workflowIds),
			projectWorkflowNames,
			includeSubWorkflows: computed(() => form.value.includeSubWorkflows)
		});
		const selectedWorkflows = computed(() => form.value.workflowIds.map((id) => ({
			id,
			name: projectWorkflowNames.value.get(id) ?? i18n.baseText("selfHealing.config.unavailableWorkflow"),
			coverage: subWorkflowScope.coverage.value.get(id)
		})));
		function coverageNote(coverage) {
			if (!coverage) return void 0;
			if (coverage.checking) return i18n.baseText("selfHealing.config.subWorkflows.checking");
			const notes = [];
			if (coverage.uncoveredCount > 0) notes.push(i18n.baseText("selfHealing.config.subWorkflows.uncovered", {
				adjustToNumber: coverage.uncoveredCount,
				interpolate: { count: String(coverage.uncoveredCount) }
			}));
			if (coverage.externalCount > 0) notes.push(i18n.baseText("selfHealing.config.subWorkflows.externalUncovered", {
				adjustToNumber: coverage.externalCount,
				interpolate: { count: String(coverage.externalCount) }
			}));
			return notes.length > 0 ? notes.join(" ") : void 0;
		}
		const reviewersById = computed(() => new Map(choices.value?.reviewers.map((reviewer) => [reviewer.id, reviewer])));
		function reviewerName(id) {
			const reviewer = reviewersById.value.get(id);
			if (!reviewer) return i18n.baseText("selfHealing.config.unavailableReviewer");
			const name = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") || reviewer.email;
			if (id === users.currentUser?.id) return i18n.baseText("selfHealing.config.you", { interpolate: { name } });
			return name;
		}
		const selectedReviewers = computed(() => form.value.reviewerIds.map((id) => ({
			id,
			user: reviewersById.value.get(id)
		})));
		const projectMembersLabel = computed(() => i18n.baseText("selfHealing.config.projectMembers", { interpolate: { project: choices.value?.project.name ?? "" } }));
		const reviewerPickerItems = computed(() => [{
			value: PROJECT_MEMBERS_OPTION,
			label: projectMembersLabel.value
		}, ...(choices.value?.reviewers ?? []).filter(({ id }) => !form.value.reviewerIds.includes(id)).map((reviewer) => ({
			value: reviewer.id,
			label: reviewerName(reviewer.id),
			keywords: [reviewer.email]
		})).sort((a, b) => a.label.localeCompare(b.label, void 0, { sensitivity: "base" }))]);
		function addWorkflow(value) {
			if (typeof value === "string" && value && !form.value.workflowIds.includes(value)) {
				form.value.workflowIds.push(value);
				subWorkflowScope.load([value]);
			}
		}
		function addReviewer(value) {
			if (value === PROJECT_MEMBERS_OPTION) form.value.includeAllProjectMembers = true;
			else if (typeof value === "string" && value && !form.value.reviewerIds.includes(value)) form.value.reviewerIds.push(value);
		}
		onMounted(() => pageRef.value?.scrollIntoView({ block: "start" }));
		const dirty = computed(() => !!savedForm.value && JSON.stringify(form.value) !== JSON.stringify(savedForm.value));
		const hasReviewers = computed(() => form.value.includeAllProjectMembers || form.value.reviewerIds.length > 0);
		const isFormValid = computed(() => {
			if (!hasReviewers.value) return false;
			if (form.value.scope === "all") return !hasAllWorkflowsConfiguration.value;
			return form.value.workflowIds.length > 0 && form.value.workflowIds.every((id) => !reservedWorkflows.value.has(id));
		});
		const title = computed(() => i18n.baseText(isNew.value ? "selfHealing.config.new" : "selfHealing.config.edit"));
		let pendingLoad;
		async function load() {
			const request = Symbol();
			pendingLoad = request;
			loading.value = true;
			loadError.value = false;
			savedForm.value = void 0;
			try {
				await store.load(props.projectId);
				if (pendingLoad !== request) return;
				const configuration = store.configurations[props.projectId]?.find(({ id }) => String(id) === props.configurationId);
				if (!isNew.value && !configuration) throw new Error(i18n.baseText(isPersonalTab.value ? "selfHealing.config.personalNotFound" : "selfHealing.config.notFound"));
				if (configuration) form.value = {
					scope: configuration.scope,
					workflowIds: [...configuration.workflowIds],
					reviewerIds: [...configuration.reviewerIds],
					includeAllProjectMembers: configuration.includeAllProjectMembers,
					includeSubWorkflows: configuration.includeSubWorkflows,
					enabled: configuration.enabled
				};
				else {
					const currentUserId = users.currentUser?.id;
					form.value = {
						scope: hasAllWorkflowsConfiguration.value ? "selected" : "all",
						workflowIds: [],
						reviewerIds: currentUserId && reviewersById.value.has(currentUserId) ? [currentUserId] : [],
						includeAllProjectMembers: false,
						includeSubWorkflows: true,
						enabled: true
					};
				}
				if (isPersonalTab.value) {
					form.value.reviewerIds = [];
					form.value.includeAllProjectMembers = true;
				}
				savedForm.value = structuredClone(toRaw(form.value));
				subWorkflowScope.load(form.value.workflowIds, { refresh: true });
			} catch (error) {
				if (pendingLoad !== request) return;
				loadError.value = true;
				toast.showError(error, i18n.baseText("selfHealing.config.loadError"));
			} finally {
				if (pendingLoad === request) loading.value = false;
			}
		}
		watch(() => [props.projectId, props.configurationId], load, { immediate: true });
		function discard() {
			if (savedForm.value) form.value = structuredClone(toRaw(savedForm.value));
		}
		function back() {
			router.push(isPersonalTab.value ? {
				name: PERSONAL_SELF_HEALING_VIEW,
				params: { projectId: props.projectId }
			} : {
				name: VIEWS.PROJECT_SETTINGS,
				params: { projectId: props.projectId },
				hash: "#self-healing"
			});
		}
		async function save() {
			saving.value = true;
			try {
				const payload = structuredClone(toRaw(form.value));
				if (payload.scope === "all") payload.workflowIds = [];
				const { enabled, ...edit } = payload;
				await store.save(props.projectId, isNew.value ? payload : edit, isNew.value ? void 0 : Number(props.configurationId));
				form.value = payload;
				savedForm.value = structuredClone(payload);
				toast.showMessage({
					title: i18n.baseText("selfHealing.config.saved"),
					type: "success"
				});
				if (isNew.value) back();
			} catch (error) {
				toast.showError(error, i18n.baseText("selfHealing.config.saveError"));
			} finally {
				saving.value = false;
			}
		}
		async function confirmDiscardChanges() {
			if (!dirty.value) return true;
			return await message.confirm(i18n.baseText("selfHealing.config.unsavedMessage"), i18n.baseText("selfHealing.config.unsavedTitle"), {
				confirmButtonText: i18n.baseText("selfHealing.config.discard"),
				cancelButtonText: i18n.baseText("generic.cancel"),
				type: "warning"
			}) === "confirm";
		}
		onBeforeRouteLeave(confirmDiscardChanges);
		onBeforeRouteUpdate(async (to, from) => {
			if (to.params.projectId !== from.params.projectId || to.params.configurationId !== from.params.configurationId) return await confirmDiscardChanges();
			return true;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "pageRef",
				ref: pageRef,
				class: normalizeClass(_ctx.$style.page)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.backBar) }, [createVNode(unref(N8nButton_default), {
				variant: "ghost",
				size: "small",
				class: normalizeClass(_ctx.$style.backButton),
				onClick: back
			}, {
				icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "arrow-left" })]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText(isPersonalTab.value ? "selfHealing.config.heading" : "selfHealing.config.back")), 1)]),
				_: 1
			}, 8, ["class"])], 2), createVNode(unref(SettingsLayout_default), {
				class: normalizeClass(_ctx.$style.layout),
				"data-test-id": "self-healing-config-page"
			}, {
				default: withCtx(() => [createVNode(unref(SettingsPageHeader_default), {
					title: title.value,
					"show-docs-link": false
				}, {
					description: withCtx(() => [createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isPersonalTab.value ? "selfHealing.config.personalDescription" : "selfHealing.config.description")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base",
						class: normalizeClass(_ctx.$style.costNote),
						"data-test-id": "self-healing-cost-note"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(costNote.value), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["title"]), loading.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("selfHealing.config.scope") }, {
					default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
						default: withCtx(() => [createVNode(unref(SettingsRow_default), null, {
							info: withCtx(() => [createVNode(unref(N8nLoading_default), {
								rows: 2,
								class: normalizeClass(_ctx.$style.skeleton)
							}, null, 8, ["class"])]),
							action: withCtx(() => [createVNode(unref(N8nLoading_default), { variant: "button" })]),
							_: 1
						})]),
						_: 1
					})]),
					_: 1
				}, 8, ["title"]), !isPersonalTab.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
					key: 0,
					title: unref(i18n).baseText("selfHealing.config.reviewers"),
					description: unref(i18n).baseText("selfHealing.config.reviewersHelp")
				}, {
					default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
						default: withCtx(() => [createVNode(unref(SettingsRow_default), { layout: "custom" }, {
							default: withCtx(() => [createVNode(unref(N8nLoading_default), { class: normalizeClass(_ctx.$style.skeleton) }, null, 8, ["class"])]),
							_: 1
						}), createVNode(unref(SettingsRow_default), null, {
							info: withCtx(() => [createVNode(unref(N8nLoading_default), {
								rows: 2,
								class: normalizeClass(_ctx.$style.skeleton)
							}, null, 8, ["class"])]),
							_: 1
						})]),
						_: 1
					})]),
					_: 1
				}, 8, ["title", "description"])) : createCommentVNode("", true)])) : loadError.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "outline",
					onClick: load
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.retry")), 1)]),
					_: 1
				})) : (openBlock(), createElementBlock("form", {
					key: 2,
					onSubmit: withModifiers(save, ["prevent"])
				}, [
					createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("selfHealing.config.scope") }, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("selfHealing.config.workflows"),
								description: unref(i18n).baseText("selfHealing.config.scopeHelp")
							}, {
								action: withCtx(() => [createVNode(unref(N8nSegmentControl_default), {
									modelValue: form.value.scope,
									"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.value.scope = $event),
									options: scopeOptions.value,
									disabled: saving.value,
									"aria-label": unref(i18n).baseText("selfHealing.config.scope"),
									"data-test-id": "self-healing-scope"
								}, null, 8, [
									"modelValue",
									"options",
									"disabled",
									"aria-label"
								])]),
								_: 1
							}, 8, ["title", "description"]), createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("selfHealing.config.subWorkflows.toggle"),
								description: unref(i18n).baseText("selfHealing.config.subWorkflows.description")
							}, {
								action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
									modelValue: form.value.includeSubWorkflows,
									"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.value.includeSubWorkflows = $event),
									disabled: saving.value,
									"aria-label": unref(i18n).baseText("selfHealing.config.subWorkflows.toggle"),
									"data-test-id": "self-healing-include-sub-workflows"
								}, null, 8, [
									"modelValue",
									"disabled",
									"aria-label"
								])]),
								_: 1
							}, 8, ["title", "description"])]),
							_: 1
						}), form.value.scope === "selected" ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 0 }, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), { layout: "custom" }, {
								default: withCtx(() => [createVNode(unref(Combobox_default), {
									id: "self-healing-workflows",
									"model-value": "",
									icon: "search",
									class: normalizeClass(_ctx.$style.searchPicker),
									items: workflowPickerItems.value,
									disabled: saving.value,
									"aria-label": unref(i18n).baseText("selfHealing.config.workflows"),
									placeholder: unref(i18n).baseText("selfHealing.config.chooseWorkflows"),
									"data-test-id": "self-healing-workflows",
									"onUpdate:modelValue": addWorkflow,
									onKeydown: _cache[2] || (_cache[2] = withKeys(withModifiers(() => {}, ["prevent"]), ["enter"]))
								}, {
									"item-trailing": withCtx(({ item }) => [item.disabled ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.workflowReserved")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 1
								}, 8, [
									"class",
									"items",
									"disabled",
									"aria-label",
									"placeholder"
								])]),
								_: 1
							}), (openBlock(true), createElementBlock(Fragment, null, renderList(selectedWorkflows.value, (workflow) => {
								return openBlock(), createBlock(unref(SettingsRow_default), {
									key: workflow.id,
									title: workflow.name,
									description: coverageNote(workflow.coverage),
									"show-visual": "",
									"data-test-id": "self-healing-selected-workflow"
								}, {
									visual: withCtx(() => [createVNode(unref(N8nIcon_default), {
										icon: "workflow",
										size: "large"
									})]),
									action: withCtx(() => [workflow.coverage?.subWorkflows.length ? (openBlock(), createBlock(SubWorkflowPill_default, {
										key: 0,
										"sub-workflows": workflow.coverage.subWorkflows
									}, null, 8, ["sub-workflows"])) : createCommentVNode("", true), createVNode(unref(N8nIconButton_default), {
										icon: "x",
										variant: "ghost",
										size: "small",
										disabled: saving.value,
										"aria-label": unref(i18n).baseText("selfHealing.config.removeWorkflow"),
										onClick: ($event) => form.value.workflowIds = form.value.workflowIds.filter((id) => id !== workflow.id)
									}, null, 8, [
										"disabled",
										"aria-label",
										"onClick"
									])]),
									_: 2
								}, 1032, ["title", "description"]);
							}), 128))]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["title"]),
					!isPersonalTab.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
						key: 0,
						title: unref(i18n).baseText("selfHealing.config.reviewers"),
						description: unref(i18n).baseText("selfHealing.config.reviewersHelp")
					}, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [
								createVNode(unref(SettingsRow_default), { layout: "custom" }, {
									default: withCtx(() => [createVNode(unref(Combobox_default), {
										id: "self-healing-reviewers",
										"model-value": "",
										items: reviewerPickerItems.value,
										disabled: saving.value || form.value.includeAllProjectMembers,
										"aria-label": unref(i18n).baseText("selfHealing.config.reviewers"),
										placeholder: unref(i18n).baseText("selfHealing.config.chooseReviewers"),
										"data-test-id": "self-healing-reviewers",
										"onUpdate:modelValue": addReviewer,
										onKeydown: _cache[3] || (_cache[3] = withKeys(withModifiers(() => {}, ["prevent"]), ["enter"]))
									}, {
										"item-leading": withCtx(({ item }) => [item.value === PROJECT_MEMBERS_OPTION ? (openBlock(), createBlock(ProjectMembersIcon_default, {
											key: 0,
											icon: choices.value?.project.icon
										}, null, 8, ["icon"])) : (openBlock(), createBlock(unref(N8nAvatar_default), {
											key: 1,
											"first-name": reviewersById.value.get(item.value)?.firstName,
											"last-name": reviewersById.value.get(item.value)?.lastName,
											size: "small"
										}, null, 8, ["first-name", "last-name"]))]),
										_: 1
									}, 8, [
										"items",
										"disabled",
										"aria-label",
										"placeholder"
									]), !hasReviewers.value ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: "text-light",
										class: normalizeClass(_ctx.$style.hint)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.noReviewers")), 1)]),
										_: 1
									}, 8, ["class"])) : form.value.includeAllProjectMembers ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 1,
										size: "small",
										color: "text-light",
										class: normalizeClass(_ctx.$style.hint)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("selfHealing.config.projectMembersIncluded")), 1)]),
										_: 1
									}, 8, ["class"])) : createCommentVNode("", true)]),
									_: 1
								}),
								form.value.includeAllProjectMembers ? (openBlock(), createBlock(unref(SettingsRow_default), {
									key: 0,
									"data-test-id": "self-healing-project-members"
								}, {
									info: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.projectMembers) }, [createVNode(ProjectMembersIcon_default, {
										icon: choices.value?.project.icon,
										size: "medium"
									}, null, 8, ["icon"]), createVNode(unref(N8nText_default), {
										bold: "",
										color: "text-dark",
										class: normalizeClass(_ctx.$style.truncate)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(projectMembersLabel.value), 1)]),
										_: 1
									}, 8, ["class"])], 2)]),
									action: withCtx(() => [createVNode(unref(N8nIconButton_default), {
										icon: "x",
										variant: "ghost",
										size: "small",
										disabled: saving.value,
										"aria-label": unref(i18n).baseText("selfHealing.config.removeProjectMembers"),
										onClick: _cache[4] || (_cache[4] = ($event) => form.value.includeAllProjectMembers = false)
									}, null, 8, ["disabled", "aria-label"])]),
									_: 1
								})) : createCommentVNode("", true),
								(openBlock(true), createElementBlock(Fragment, null, renderList(selectedReviewers.value, (reviewer) => {
									return openBlock(), createBlock(unref(SettingsRow_default), {
										key: reviewer.id,
										"data-test-id": "self-healing-selected-reviewer"
									}, {
										info: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.person) }, [createVNode(unref(N8nAvatar_default), {
											"first-name": reviewer.user?.firstName,
											"last-name": reviewer.user?.lastName,
											size: "small"
										}, null, 8, ["first-name", "last-name"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.personText) }, [createVNode(unref(N8nText_default), {
											bold: "",
											size: "medium",
											color: "text-dark",
											class: normalizeClass(_ctx.$style.truncate)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(reviewerName(reviewer.id)), 1)]),
											_: 2
										}, 1032, ["class"]), reviewer.user?.email && (reviewer.user.firstName || reviewer.user.lastName) ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 0,
											size: "small",
											color: "text-light",
											class: normalizeClass(_ctx.$style.truncate)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(reviewer.user.email), 1)]),
											_: 2
										}, 1032, ["class"])) : createCommentVNode("", true)], 2)], 2)]),
										action: withCtx(() => [createVNode(unref(N8nIconButton_default), {
											icon: "x",
											variant: "ghost",
											size: "small",
											disabled: saving.value,
											"aria-label": unref(i18n).baseText("selfHealing.config.removeReviewer"),
											onClick: ($event) => form.value.reviewerIds = form.value.reviewerIds.filter((id) => id !== reviewer.id)
										}, null, 8, [
											"disabled",
											"aria-label",
											"onClick"
										])]),
										_: 2
									}, 1024);
								}), 128))
							]),
							_: 1
						})]),
						_: 1
					}, 8, ["title", "description"])) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
						type: "button",
						variant: "outline",
						disabled: saving.value || !isNew.value && !dirty.value,
						onClick: _cache[5] || (_cache[5] = ($event) => isNew.value ? back() : discard())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isNew.value ? "generic.cancel" : "selfHealing.config.discard")), 1)]),
						_: 1
					}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
						type: "submit",
						loading: saving.value,
						disabled: !isFormValid.value || !isNew.value && !dirty.value,
						"data-test-id": "self-healing-save"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isNew.value ? "selfHealing.config.createAction" : "selfHealing.config.save")), 1)]),
						_: 1
					}, 8, ["loading", "disabled"])], 2)
				], 32))]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	costNote: "_costNote_31mo2_1",
	page: "_page_31mo2_6",
	backBar: "_backBar_31mo2_10",
	backButton: "_backButton_31mo2_18",
	layout: "_layout_31mo2_22",
	actions: "_actions_31mo2_26",
	searchPicker: "_searchPicker_31mo2_33",
	person: "_person_31mo2_37",
	personText: "_personText_31mo2_44",
	truncate: "_truncate_31mo2_50",
	projectMembers: "_projectMembers_31mo2_57",
	hint: "_hint_31mo2_64",
	skeleton: "_skeleton_31mo2_69"
} }]]);
//#endregion
export { ProjectSelfHealingSection_default as n, SelfHealingConfigView_default as t };
