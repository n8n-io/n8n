import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, gf as resolveComponent, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, of as onBeforeUnmount, rf as mergeProps, xf as useModel, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Bj as SettingsRow_default, CA as appNamespaceSchema, DM as CopyInput_default, Gs as listAppVersions, Hs as getAppBindings, Ij as SettingsRowGroup_default, Js as publishApp, KA as Dialog_default, Ks as listApps, LM as N8nCallout_default, Mw as ResponseError, Nh as AGENT_VIEW, Nj as N8nPopover_default, PA as useMessage, Pu as DATA_TABLE_DETAILS, Qs as updateApp, SA as appNameSchema, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, TA as appVersionNameSchema, UA as DialogFooter_default, UC as getProject, Us as getAppBuild, VA as isIconOrEmoji, Vs as getApp, WA as DialogBody_default, Ws as getAppPublishPreview, XM as N8nActionDropdown_default, Xs as setAppBindings, Ys as restoreAppVersion, Zs as unpublishApp, _A as appBindingSchema, _M as Checkbox_default, _N as N8nText_default, bA as APP_INSPECTOR_MESSAGE_SOURCE, bC as useRootStore, by as useDebounce, cN as Input_default, dC as useToast, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, fC as VIEWS, fN as N8nTooltip_default, gA as appBindingKeySchema, gM as N8nInputLabel_default, gj as N8nTimeAgo_default, hA as appAgentPermissionSchema, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, kj as N8nSegmentControl_default, mM as N8nOption_default, nN as N8nBadge_default, nc as PROJECT_APPS, pM as N8nSelect_default, qs as listBindableResources, rc as getAppPermissions, tN as N8nLoading_default, tc as APP_DETAIL_VIEW, tj as N8nBreadcrumbs_default, vA as appDataTablePermissionSchema, vN as N8nIconButton_default, wA as appVersionDescriptionSchema, wy as TELEMETRY_EVENT, xA as appInspectorEventSchema, xM as N8nEmptyState_default, xN as N8nIcon_default, yN as N8nButton_default, zs as createAppPreview } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { t as AppActions_default } from "./AppActions-yjUFQV4k.js";
//#region ../../modules/apps/frontend/src/composables/useAppVersions.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var POLL_INTERVAL_MS = 3e3;
function isBuilding(status) {
	return status === "queued" || status === "running";
}
function isBuilt(version) {
	return version.buildStatus === "succeeded" && version.bundleArtifactId !== null;
}
function getAppVersionLabel(version) {
	return version.label ?? version.id.slice(-8);
}
function useAppVersions(projectId, appId) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const latestFetch = useLatestFetch();
	const versions = ref([]);
	const loading = ref(false);
	const failed = ref(false);
	let pollTimer;
	const head = computed(() => versions.value[0] ?? null);
	const latestBuilt = computed(() => versions.value.find(isBuilt) ?? null);
	const building = computed(() => isBuilding(head.value?.buildStatus));
	function stopPolling() {
		clearTimeout(pollTimer);
		pollTimer = void 0;
	}
	function poll(id, versionId) {
		pollTimer = setTimeout(async () => {
			const isLatest = latestFetch.next();
			try {
				const build = await getAppBuild(rootStore.restApiContext, toValue(projectId), id, versionId);
				if (!isLatest()) return;
				if (isBuilding(build.status)) {
					poll(id, versionId);
					return;
				}
			} catch {
				if (!isLatest()) return;
			}
			await refresh();
		}, POLL_INTERVAL_MS);
	}
	async function refresh() {
		stopPolling();
		const isLatest = latestFetch.next();
		const id = toValue(appId);
		failed.value = false;
		if (!id) {
			versions.value = [];
			loading.value = false;
			return;
		}
		loading.value = true;
		try {
			const result = await listAppVersions(rootStore.restApiContext, toValue(projectId), id);
			if (!isLatest()) return;
			versions.value = result;
			const pending = result.find((version) => isBuilding(version.buildStatus));
			if (pending) poll(id, pending.id);
		} catch (error) {
			if (!isLatest()) return;
			failed.value = true;
			toast.showError(error, i18n.baseText("apps.versions.loadError"));
		} finally {
			if (isLatest()) loading.value = false;
		}
	}
	watch(() => toValue(appId), refresh, { immediate: true });
	onScopeDispose(() => {
		stopPolling();
		latestFetch.invalidate();
	});
	return {
		versions,
		head,
		latestBuilt,
		building,
		loading,
		failed,
		refresh
	};
}
//#endregion
//#region ../../modules/apps/frontend/src/components/publish/AppLinkField.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/apps/frontend/src/components/publish/AppLinkField.vue
var AppLinkField_default = /* @__PURE__ */ defineComponent({
	__name: "AppLinkField",
	props: { url: {} },
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nInputLabel_default), {
				label: unref(i18n).baseText("apps.link.label"),
				size: "small",
				color: "text-dark"
			}, {
				default: withCtx(() => [createVNode(unref(CopyInput_default), {
					label: unref(i18n).baseText("apps.link.label"),
					value: __props.url,
					size: "medium",
					"data-test-id": "app-link"
				}, null, 8, ["label", "value"])]),
				_: 1
			}, 8, ["label"]);
		};
	}
});
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/connections/bindingKinds.ts
var BINDING_KIND_ORDER = [
	"workflow",
	"dataTable",
	"agent"
];
var BINDING_KINDS = {
	workflow: {
		icon: "workflow",
		label: "apps.configure.connections.workflows",
		addLabel: "apps.configure.connections.addWorkflow",
		permissions: [],
		defaultPermissions: [],
		route: (_projectId, workflowId) => ({
			name: VIEWS.WORKFLOW,
			params: { workflowId }
		})
	},
	dataTable: {
		icon: "table",
		label: "apps.configure.connections.dataTables",
		addLabel: "apps.configure.connections.addDataTable",
		permissions: appDataTablePermissionSchema.options,
		defaultPermissions: ["read"],
		route: (projectId, id) => ({
			name: DATA_TABLE_DETAILS,
			params: {
				projectId,
				id
			}
		})
	},
	agent: {
		icon: "robot",
		label: "apps.configure.connections.agents",
		addLabel: "apps.configure.connections.addAgent",
		permissions: appAgentPermissionSchema.options,
		defaultPermissions: ["chat"],
		route: (projectId, agentId) => ({
			name: AGENT_VIEW,
			params: {
				projectId,
				agentId
			}
		})
	}
};
var PERMISSION_LABELS = {
	read: "apps.configure.connections.permission.read",
	insert: "apps.configure.connections.permission.insert",
	update: "apps.configure.connections.permission.update",
	delete: "apps.configure.connections.permission.delete",
	chat: "apps.configure.connections.permission.chat",
	history: "apps.configure.connections.permission.history"
};
var WARNING_LABELS = {
	resource_missing: "apps.configure.connections.warning.resource_missing",
	resource_unpublished: "apps.configure.connections.warning.resource_unpublished"
};
var RESOURCE_ID_FIELD = {
	workflow: "workflowId",
	dataTable: "dataTableId",
	agent: "agentId"
};
function resourceIdOf(binding) {
	switch (binding.kind) {
		case "workflow": return binding.workflowId;
		case "dataTable": return binding.dataTableId;
		case "agent": return binding.agentId;
	}
}
function permissionsOf(binding) {
	return binding.kind === "workflow" ? [] : binding.permissions;
}
function togglePermission(kind, current, permission, checked) {
	return BINDING_KINDS[kind].permissions.filter((entry) => entry === permission ? checked : current.includes(entry));
}
function createBinding(kind, key, resourceId, permissions) {
	return appBindingSchema.parse({
		kind,
		key,
		[RESOURCE_ID_FIELD[kind]]: resourceId,
		...kind !== "workflow" && { permissions }
	});
}
function withPermissions(binding, permissions) {
	return createBinding(binding.kind, binding.key, resourceIdOf(binding), permissions);
}
//#endregion
//#region ../../modules/apps/frontend/src/components/publish/AppPublishResources.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppPublishResources_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppPublishResources",
	props: {
		resources: {},
		projectId: {},
		loading: { type: Boolean }
	},
	setup(__props) {
		const i18n = useI18n();
		const headers = [{
			title: i18n.baseText("apps.publish.dialog.resources.column.name"),
			key: "name"
		}];
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createBlock(unref(N8nDataTableServer_default), {
				headers,
				items: __props.resources,
				"item-value": "key",
				"items-length": __props.resources.length,
				"page-sizes": [__props.resources.length + 1],
				pagination: false,
				loading: __props.loading,
				"data-test-id": "app-publish-resources-list"
			}, {
				[`item.name`]: withCtx(({ item }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.name) }, [
					createVNode(unref(N8nIcon_default), {
						icon: unref(BINDING_KINDS)[item.kind].icon,
						size: 14,
						"data-test-id": `app-publish-resource-${item.key}-icon`
					}, null, 8, ["icon", "data-test-id"]),
					createVNode(_component_RouterLink, {
						to: unref(BINDING_KINDS)[item.kind].route(__props.projectId, item.resourceId),
						target: "_blank",
						"data-test-id": `app-publish-resource-${item.key}`
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.link) }, {
							default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
							_: 2
						}, 1032, ["class"])]),
						_: 2
					}, 1032, ["to", "data-test-id"]),
					!item.canPublish ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.publish.dialog.resources.cannotPublish")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "triangle-alert",
							size: 14,
							class: normalizeClass(_ctx.$style.warning),
							"data-test-id": `app-publish-resource-${item.key}-warning`
						}, null, 8, ["class", "data-test-id"])]),
						_: 2
					}, 1024)) : createCommentVNode("", true)
				], 2)]),
				_: 2
			}, 1032, [
				"items",
				"items-length",
				"page-sizes",
				"loading"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	name: "_name_1byd7_1",
	link: "_link_1byd7_7",
	warning: "_warning_1byd7_11"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/publish/AppVisibilitySelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppVisibilitySelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppVisibilitySelect",
	props: /*@__PURE__*/ mergeModels({ disabled: { type: Boolean } }, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const OPTIONS = [{
			value: "project",
			icon: "users"
		}, {
			value: "instance",
			icon: "shield"
		}];
		const visibility = useModel(__props, "modelValue");
		const i18n = useI18n();
		const selectedIcon = computed(() => OPTIONS.find(({ value }) => value === visibility.value)?.icon ?? "users");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.visibility) }, [createVNode(unref(N8nInputLabel_default), {
				label: unref(i18n).baseText("apps.visibility.label"),
				size: "small",
				color: "text-dark"
			}, {
				default: withCtx(() => [createVNode(unref(N8nSelect_default), {
					modelValue: visibility.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => visibility.value = $event),
					disabled: __props.disabled,
					"data-test-id": "app-visibility-select"
				}, {
					prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: selectedIcon.value }, null, 8, ["icon"])]),
					default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(OPTIONS, (option) => {
						return createVNode(unref(N8nOption_default), {
							key: option.value,
							value: option.value,
							label: unref(i18n).baseText(`apps.visibility.${option.value}`),
							"data-test-id": `app-visibility-option-${option.value}`
						}, {
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.option) }, [createVNode(unref(N8nIcon_default), { icon: option.icon }, null, 8, ["icon"]), createTextVNode(" " + toDisplayString(unref(i18n).baseText(`apps.visibility.${option.value}`)), 1)], 2)]),
							_: 2
						}, 1032, [
							"value",
							"label",
							"data-test-id"
						]);
					}), 64))]),
					_: 1
				}, 8, ["modelValue", "disabled"])]),
				_: 1
			}, 8, ["label"]), renderSlot(_ctx.$slots, "default")], 2);
		};
	}
}), [["__cssModules", { "$style": {
	visibility: "_visibility_rn8px_1",
	option: "_option_rn8px_7"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/publish/AppPublishDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppPublishDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppPublishDialog",
	props: /*@__PURE__*/ mergeModels({
		app: {},
		version: {}
	}, {
		"open": {
			type: Boolean,
			required: true
		},
		"openModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["updated"], ["update:open"]),
	setup(__props, { emit: __emit }) {
		const NAME_MAX_LENGTH = appVersionNameSchema.maxLength ?? 128;
		const DESCRIPTION_MAX_LENGTH = appVersionDescriptionSchema.maxLength ?? 2e3;
		const props = __props;
		const emit = __emit;
		const open = useModel(__props, "open");
		const i18n = useI18n();
		const rootStore = useRootStore();
		const label = ref("");
		const description = ref("");
		const visibility = ref(props.app.visibility);
		const busy = ref(false);
		const publishResources = ref(true);
		const resources = ref([]);
		const loadingResources = ref(false);
		const resourcesLoadFailed = ref(false);
		const publishError = ref(null);
		const pendingResources = computed(() => resources.value.filter(({ published, hasChanges }) => !published || hasChanges));
		const showResources = computed(() => publishResources.value && (loadingResources.value || pendingResources.value.length > 0));
		const canPublish = computed(() => appVersionNameSchema.safeParse(label.value).success);
		let latestLoad = 0;
		async function loadResources() {
			const load = ++latestLoad;
			const versionId = props.version.id;
			loadingResources.value = true;
			resourcesLoadFailed.value = false;
			try {
				const preview = await getAppPublishPreview(rootStore.restApiContext, props.app.projectId, props.app.id, versionId);
				if (load === latestLoad) resources.value = preview.resources;
			} catch {
				if (load === latestLoad) {
					resources.value = [];
					resourcesLoadFailed.value = true;
				}
			} finally {
				if (load === latestLoad) loadingResources.value = false;
			}
		}
		function reset() {
			label.value = props.version.label ?? props.app.name;
			description.value = props.version.description ?? "";
			visibility.value = props.app.visibility;
			publishResources.value = true;
			publishError.value = null;
			resources.value = [];
			loadResources();
		}
		async function publish() {
			busy.value = true;
			try {
				emit("updated", await publishApp(rootStore.restApiContext, props.app.projectId, props.app.id, {
					versionId: props.version.id,
					label: label.value,
					description: description.value,
					visibility: visibility.value === props.app.visibility ? void 0 : visibility.value,
					publishResources: publishResources.value
				}));
				open.value = false;
			} catch (error) {
				publishError.value = error instanceof Error && error.message ? error.message : i18n.baseText("apps.publish.error");
				loadResources();
			} finally {
				busy.value = false;
			}
		}
		watch(open, (isOpen) => isOpen && reset(), { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: open.value,
				"onUpdate:open": _cache[5] || (_cache[5] = ($event) => open.value = $event),
				size: "medium",
				header: unref(i18n).baseText("apps.publish.dialog.title"),
				"data-test-id": "app-publish-dialog"
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("apps.publish.dialog.name"),
							"input-name": "app-publish-name",
							required: "",
							size: "small",
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "app-publish-name",
								modelValue: label.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => label.value = $event),
								maxlength: unref(NAME_MAX_LENGTH),
								disabled: busy.value,
								"data-test-id": "app-publish-name"
							}, null, 8, [
								"modelValue",
								"maxlength",
								"disabled"
							]), createVNode(unref(N8nText_default), {
								class: normalizeClass(_ctx.$style.counter),
								size: "xsmall",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(label.value.length) + "/" + toDisplayString(unref(NAME_MAX_LENGTH)), 1)]),
								_: 1
							}, 8, ["class"])]),
							_: 1
						}, 8, ["label"]),
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("apps.publish.dialog.description"),
							"input-name": "app-publish-description",
							size: "small",
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "app-publish-description",
								modelValue: description.value,
								"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => description.value = $event),
								type: "textarea",
								rows: 4,
								maxlength: unref(DESCRIPTION_MAX_LENGTH),
								disabled: busy.value,
								"data-test-id": "app-publish-description"
							}, null, 8, [
								"modelValue",
								"maxlength",
								"disabled"
							])]),
							_: 1
						}, 8, ["label"]),
						__props.app.publishedUrl ? (openBlock(), createBlock(AppLinkField_default, {
							key: 0,
							url: __props.app.publishedUrl
						}, null, 8, ["url"])) : createCommentVNode("", true),
						createVNode(AppVisibilitySelect_default, {
							modelValue: visibility.value,
							"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => visibility.value = $event),
							disabled: busy.value
						}, null, 8, ["modelValue", "disabled"]),
						createVNode(unref(Checkbox_default), {
							modelValue: publishResources.value,
							"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => publishResources.value = $event),
							label: unref(i18n).baseText("apps.publish.dialog.publishResources"),
							disabled: busy.value,
							"data-test-id": "app-publish-resources"
						}, null, 8, [
							"modelValue",
							"label",
							"disabled"
						]),
						showResources.value ? (openBlock(), createBlock(AppPublishResources_default, {
							key: 1,
							resources: pendingResources.value,
							"project-id": __props.app.projectId,
							loading: loadingResources.value
						}, null, 8, [
							"resources",
							"project-id",
							"loading"
						])) : createCommentVNode("", true),
						resourcesLoadFailed.value && publishResources.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 2,
							theme: "warning",
							"data-test-id": "app-publish-resources-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.publish.dialog.resources.loadError")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						publishError.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 3,
							theme: "danger",
							"data-test-id": "app-publish-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(publishError.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("generic.cancel"),
						disabled: busy.value,
						onClick: _cache[4] || (_cache[4] = ($event) => open.value = false)
					}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
						variant: "solid",
						label: unref(i18n).baseText("apps.publish.publish"),
						loading: busy.value,
						disabled: !canPublish.value,
						"data-test-id": "app-publish-dialog-confirm",
						onClick: publish
					}, null, 8, [
						"label",
						"loading",
						"disabled"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_9wb64_1",
	counter: "_counter_9wb64_7"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/AppPublishButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppPublishButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppPublishButton",
	props: {
		app: {},
		version: {}
	},
	emits: ["updated", "showVersions"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const message = useMessage();
		const rootStore = useRootStore();
		const telemetry = useTelemetry();
		const busy = ref(false);
		const dialogOpen = ref(false);
		const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
		const isUpToDate = computed(() => props.version !== null && props.app.publishedVersionId === props.version.id);
		const menuItems = computed(() => {
			const items = [{
				id: "versions",
				label: i18n.baseText("apps.publish.viewVersions"),
				icon: "history"
			}, {
				id: "showCode",
				label: i18n.baseText("apps.publish.showCode"),
				icon: "code"
			}];
			if (!props.app.publishedUrl) return items;
			items.push({
				id: "open",
				label: i18n.baseText("apps.publish.openApp"),
				icon: "external-link"
			});
			if (canUpdate.value) items.push({
				id: "unpublish",
				label: i18n.baseText("apps.publish.unpublish"),
				icon: "eye-off",
				divided: true
			});
			return items;
		});
		async function unpublish() {
			if (await message.confirm(i18n.baseText("apps.publish.unpublishConfirm.message", { interpolate: { name: props.app.name } }), i18n.baseText("apps.publish.unpublishConfirm.title"), {
				confirmButtonText: i18n.baseText("apps.publish.unpublish"),
				cancelButtonText: i18n.baseText("generic.cancel"),
				type: "warning"
			}) !== "confirm") return;
			busy.value = true;
			try {
				emit("updated", await unpublishApp(rootStore.restApiContext, props.app.projectId, props.app.id));
			} catch (error) {
				toast.showError(error, i18n.baseText("apps.publish.unpublishError"));
			} finally {
				busy.value = false;
			}
		}
		function showCode() {
			telemetry.track(TELEMETRY_EVENT.APPS.USER_CLICKED_SHOW_APP_CODE, {
				app_id: props.app.id,
				project_id: props.app.projectId
			});
			toast.showMessage({
				type: "info",
				title: i18n.baseText("apps.showCode.comingSoon.title"),
				message: i18n.baseText("apps.showCode.comingSoon.message")
			});
		}
		async function onMenuSelect(action) {
			if (action === "showCode") {
				showCode();
				return;
			}
			if (action === "versions") {
				emit("showVersions");
				return;
			}
			const url = props.app.publishedUrl;
			if (!url) return;
			if (action === "open") window.open(url, "_blank", "noopener");
			else await unpublish();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.group),
				"data-test-id": "app-publish"
			}, [
				createVNode(unref(N8nButton_default), {
					class: normalizeClass([_ctx.$style.main, { [_ctx.$style.published]: isUpToDate.value }]),
					variant: "outline",
					loading: busy.value,
					disabled: !canUpdate.value || !__props.version || isUpToDate.value,
					"data-test-id": "app-publish-button",
					onClick: _cache[0] || (_cache[0] = ($event) => dialogOpen.value = true)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isUpToDate.value ? "apps.publish.published" : "apps.publish.publish")), 1)]),
					_: 1
				}, 8, [
					"class",
					"loading",
					"disabled"
				]),
				createVNode(unref(N8nActionDropdown_default), {
					items: menuItems.value,
					disabled: busy.value,
					placement: "bottom-end",
					"data-test-id": "app-publish-menu",
					onSelect: onMenuSelect
				}, {
					activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						class: normalizeClass(_ctx.$style.toggle),
						variant: "outline",
						icon: "chevron-down",
						disabled: busy.value,
						"aria-label": unref(i18n).baseText("apps.publish.menuAriaLabel"),
						"data-test-id": "app-publish-menu-trigger"
					}, null, 8, [
						"class",
						"disabled",
						"aria-label"
					])]),
					_: 1
				}, 8, ["items", "disabled"]),
				__props.version ? (openBlock(), createBlock(AppPublishDialog_default, {
					key: 0,
					open: dialogOpen.value,
					"onUpdate:open": _cache[1] || (_cache[1] = ($event) => dialogOpen.value = $event),
					app: __props.app,
					version: __props.version,
					onUpdated: _cache[2] || (_cache[2] = ($event) => emit("updated", $event))
				}, null, 8, [
					"open",
					"app",
					"version"
				])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	group: "_group_1pnyl_1",
	main: "_main_1pnyl_4",
	toggle: "_toggle_1pnyl_8",
	published: "_published_1pnyl_14"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/publish/AppSharePopover.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppSharePopover_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppSharePopover",
	props: {
		app: {},
		url: {}
	},
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const saving = ref(false);
		const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
		async function save(visibility) {
			saving.value = true;
			try {
				emit("updated", await updateApp(rootStore.restApiContext, props.app.projectId, props.app.id, { visibility }));
			} catch (error) {
				toast.showError(error, i18n.baseText("apps.share.saveError"));
			} finally {
				saving.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				side: "bottom",
				align: "end",
				width: "400px",
				"data-test-id": "app-share"
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "outline",
					icon: "link",
					"aria-label": unref(i18n).baseText("apps.share.ariaLabel"),
					"data-test-id": "app-share-trigger"
				}, null, 8, ["aria-label"])]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.content),
					"data-test-id": "app-share-content"
				}, [
					createVNode(unref(N8nHeading_default), {
						tag: "h3",
						size: "medium",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.app.name), 1)]),
						_: 1
					}),
					createVNode(AppLinkField_default, { url: __props.url }, null, 8, ["url"]),
					createVNode(AppVisibilitySelect_default, {
						"model-value": __props.app.visibility,
						disabled: !canUpdate.value || saving.value,
						"onUpdate:modelValue": save
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.share.hint")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["model-value", "disabled"])
				], 2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": { content: "_content_s7qgk_1" } }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/AppHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var NO_OTHER_APPS = "__empty__";
var SWITCHER_MAX_APPS = 100;
var AppHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppHeader",
	props: /*@__PURE__*/ mergeModels({
		projectId: {},
		app: {},
		publishableVersion: {}
	}, {
		"tab": { required: true },
		"tabModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"updated",
		"deleted",
		"showVersions"
	], ["update:tab"]),
	setup(__props, { emit: __emit }) {
		const PERSONAL_PROJECT_ICON = {
			type: "icon",
			value: "user"
		};
		const DEFAULT_PROJECT_ICON = {
			type: "icon",
			value: "layers"
		};
		function projectIcon(project) {
			return isIconOrEmoji(project?.icon) ? project.icon : DEFAULT_PROJECT_ICON;
		}
		const props = __props;
		const emit = __emit;
		const tab = useModel(__props, "tab");
		const i18n = useI18n();
		const router = useRouter();
		const rootStore = useRootStore();
		const latestProjectFetch = useLatestFetch();
		const latestAppsFetch = useLatestFetch();
		const project = ref(null);
		const projectApps = ref([]);
		const tabOptions = computed(() => [{
			value: "preview",
			label: i18n.baseText("apps.detail.tabs.preview")
		}, {
			value: "configure",
			label: i18n.baseText("apps.detail.tabs.configure")
		}]);
		const appsRoute = computed(() => ({
			name: PROJECT_APPS,
			params: { projectId: props.projectId }
		}));
		const breadcrumbItems = computed(() => {
			const isPersonal = project.value?.type === "personal";
			return [{
				id: props.projectId,
				label: isPersonal ? i18n.baseText("projects.menu.personal") : project.value?.name ?? i18n.baseText("apps.detail.projectFallback"),
				icon: isPersonal ? PERSONAL_PROJECT_ICON : projectIcon(project.value),
				href: router.resolve(appsRoute.value).href
			}];
		});
		const switcherOptions = computed(() => {
			const others = projectApps.value.filter((projectApp) => projectApp.id !== props.app?.id);
			if (others.length === 0) return [{
				id: NO_OTHER_APPS,
				label: i18n.baseText("apps.detail.switcher.empty"),
				disabled: true
			}];
			return others.map((projectApp) => ({
				id: projectApp.id,
				label: projectApp.name
			}));
		});
		function onSwitcherSelect(appId) {
			if (appId === NO_OTHER_APPS) return;
			router.push({
				name: APP_DETAIL_VIEW,
				params: {
					projectId: props.projectId,
					appId
				}
			});
		}
		async function loadProject() {
			const isLatest = latestProjectFetch.next();
			try {
				const result = await getProject(rootStore.restApiContext, props.projectId);
				if (isLatest()) project.value = result;
			} catch {
				if (isLatest()) project.value = null;
			}
		}
		async function loadProjectApps() {
			const isLatest = latestAppsFetch.next();
			try {
				const { data } = await listApps(rootStore.restApiContext, props.projectId, {
					skip: 0,
					take: SWITCHER_MAX_APPS,
					sortBy: "name:asc"
				});
				if (isLatest()) projectApps.value = data;
			} catch {
				if (isLatest()) projectApps.value = [];
			}
		}
		watch(() => props.projectId, () => {
			loadProject();
			loadProjectApps();
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("header", {
				class: normalizeClass(_ctx.$style.header),
				"data-test-id": "app-header"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.left) }, [createVNode(unref(N8nBreadcrumbs_default), {
					class: normalizeClass(_ctx.$style.breadcrumbs),
					items: breadcrumbItems.value,
					theme: "medium",
					onItemSelected: _cache[1] || (_cache[1] = ($event) => unref(router).push(appsRoute.value))
				}, {
					append: withCtx(() => [
						createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.separator),
							"aria-hidden": "true"
						}, "/", 2),
						createVNode(unref(DropdownMenu_default), {
							items: switcherOptions.value,
							placement: "bottom-start",
							"data-test-id": "app-header-switcher",
							onSelect: onSwitcherSelect
						}, {
							trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "ghost",
								size: "small",
								class: normalizeClass(_ctx.$style.switcherButton),
								"aria-label": unref(i18n).baseText("apps.detail.switcher.ariaLabel")
							}, {
								default: withCtx(() => [createBaseVNode("span", {
									class: normalizeClass(_ctx.$style.appName),
									"data-test-id": "app-header-name"
								}, toDisplayString(__props.app?.name ?? "…"), 3), createVNode(unref(N8nIcon_default), {
									icon: "chevron-down",
									size: 12
								})]),
								_: 1
							}, 8, ["class", "aria-label"])]),
							_: 1
						}, 8, ["items"]),
						__props.app ? (openBlock(), createBlock(AppActions_default, {
							key: 0,
							app: __props.app,
							onDeleted: _cache[0] || (_cache[0] = ($event) => emit("deleted", $event))
						}, null, 8, ["app"])) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class", "items"])], 2),
				__props.app ? (openBlock(), createBlock(unref(N8nSegmentControl_default), {
					key: 0,
					modelValue: tab.value,
					"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => tab.value = $event),
					options: tabOptions.value,
					class: normalizeClass(_ctx.$style.center),
					"data-test-id": "app-header-tabs"
				}, null, 8, [
					"modelValue",
					"options",
					"class"
				])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.right) }, [__props.app?.publishedUrl ? (openBlock(), createBlock(AppSharePopover_default, {
					key: 0,
					app: __props.app,
					url: __props.app.publishedUrl,
					onUpdated: _cache[3] || (_cache[3] = ($event) => emit("updated", $event))
				}, null, 8, ["app", "url"])) : createCommentVNode("", true), __props.app ? (openBlock(), createBlock(AppPublishButton_default, {
					key: 1,
					app: __props.app,
					version: __props.publishableVersion,
					onUpdated: _cache[4] || (_cache[4] = ($event) => emit("updated", $event)),
					onShowVersions: _cache[5] || (_cache[5] = ($event) => emit("showVersions"))
				}, null, 8, ["app", "version"])) : createCommentVNode("", true)], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1f720_1",
	separator: "_separator_1f720_22",
	left: "_left_1f720_26",
	right: "_right_1f720_27",
	breadcrumbs: "_breadcrumbs_1f720_39",
	center: "_center_1f720_43",
	switcherButton: "_switcherButton_1f720_59",
	appName: "_appName_1f720_66"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/AppPreviewOptionMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/apps/frontend/src/components/AppPreviewOptionMenu.vue
var AppPreviewOptionMenu_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AppPreviewOptionMenu",
	props: /*@__PURE__*/ mergeModels({
		options: {},
		label: {}
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const props = __props;
		const selected = useModel(__props, "modelValue");
		const items = computed(() => props.options.map(({ value, label, icon }) => ({
			id: value,
			label,
			icon: {
				type: "icon",
				value: icon
			},
			checked: value === selected.value
		})));
		const selectedOption = computed(() => props.options.find(({ value }) => value === selected.value));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), { content: __props.label }, {
				default: withCtx(() => [createVNode(unref(DropdownMenu_default), mergeProps(_ctx.$attrs, {
					items: items.value,
					placement: "bottom-end",
					onSelect: _cache[0] || (_cache[0] = ($event) => selected.value = $event)
				}), {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						"aria-label": __props.label
					}, {
						default: withCtx(() => [selectedOption.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: selectedOption.value.icon,
							size: "small"
						}, null, 8, ["icon"])) : createCommentVNode("", true), createVNode(unref(N8nIcon_default), {
							icon: "chevron-down",
							size: 12
						})]),
						_: 1
					}, 8, ["aria-label"])]),
					_: 1
				}, 16, ["items"])]),
				_: 1
			}, 8, ["content"]);
		};
	}
});
//#endregion
//#region ../../modules/apps/frontend/src/components/AppPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = ["src", "title"];
var GRANT_REFRESH_MS = 33e5;
var AppPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppPreview",
	props: {
		projectId: {},
		app: {},
		versions: {},
		inspectable: { type: Boolean },
		elementSelected: { type: Boolean }
	},
	emits: ["element-selected"],
	setup(__props, { emit: __emit }) {
		const SCREEN_SIZES = [
			"desktop",
			"tablet",
			"mobile"
		];
		const SCREEN_WIDTHS = {
			desktop: "100%",
			tablet: "768px",
			mobile: "375px"
		};
		const THEMES = ["light", "dark"];
		const OPTION_ICONS = {
			desktop: "monitor",
			tablet: "tablet",
			mobile: "smartphone",
			light: "sun",
			dark: "moon"
		};
		function editorTheme() {
			const theme = document.body.dataset.theme;
			if (theme === "light" || theme === "dark") return theme;
			return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const latestFetch = useLatestFetch();
		const { head, latestBuilt, building } = props.versions;
		const preview = ref(null);
		const granting = ref(false);
		const grantFailed = ref(false);
		const screenSize = ref("desktop");
		const theme = ref(editorTheme());
		const inspecting = ref(false);
		const frame = useTemplateRef("frame");
		let refreshTimer;
		const sizeOptions = computed(() => SCREEN_SIZES.map((value) => ({
			value,
			label: i18n.baseText(`apps.preview.size.${value}`),
			icon: OPTION_ICONS[value]
		})));
		const themeOptions = computed(() => THEMES.map((value) => ({
			value,
			label: i18n.baseText(`apps.preview.theme.${value}`),
			icon: OPTION_ICONS[value]
		})));
		const previewOrigin = computed(() => preview.value ? new URL(preview.value.url).origin : void 0);
		const loading = computed(() => props.versions.loading.value || granting.value);
		const failed = computed(() => props.versions.failed.value || grantFailed.value);
		const buildFailed = computed(() => head.value?.buildStatus === "failed");
		const versionLabel = computed(() => {
			const version = preview.value?.version;
			return version ? getAppVersionLabel(version) : null;
		});
		async function grant(versionId) {
			return await createAppPreview(rootStore.restApiContext, props.projectId, props.app.id, versionId);
		}
		function showPreview(next) {
			clearTimeout(refreshTimer);
			preview.value = next;
			if (next) refreshTimer = setTimeout(async () => await show(true), GRANT_REFRESH_MS);
		}
		async function show(force = false) {
			const version = latestBuilt.value;
			if (!force && version?.id === preview.value?.version.id) return;
			const isLatest = latestFetch.next();
			if (!version) {
				granting.value = false;
				showPreview(null);
				return;
			}
			granting.value = true;
			try {
				const { url } = await grant(version.id);
				if (!isLatest()) return;
				showPreview({
					version,
					url
				});
				grantFailed.value = false;
			} catch (error) {
				if (!isLatest()) return;
				grantFailed.value = true;
				toast.showError(error, i18n.baseText("apps.preview.loadError"));
			} finally {
				if (isLatest()) granting.value = false;
			}
		}
		async function reload() {
			await props.versions.refresh();
			if (!props.versions.failed.value) await show(true);
		}
		async function openInNewTab() {
			const version = preview.value?.version;
			if (!version) return;
			const tab = window.open("about:blank", "_blank");
			if (!tab) return;
			tab.opener = null;
			try {
				tab.location.href = (await grant(version.id)).url;
			} catch (error) {
				tab.close();
				toast.showError(error, i18n.baseText("apps.preview.loadError"));
			}
		}
		function postInspectCommand(type) {
			if (!previewOrigin.value) return;
			frame.value?.contentWindow?.postMessage({
				source: APP_INSPECTOR_MESSAGE_SOURCE,
				type
			}, previewOrigin.value);
		}
		function setInspecting(value) {
			inspecting.value = value;
			postInspectCommand(value ? "inspect:enable" : "inspect:disable");
		}
		function onFrameLoad() {
			if (inspecting.value) postInspectCommand("inspect:enable");
		}
		function onMessage(event) {
			if (!inspecting.value) return;
			if (event.source !== frame.value?.contentWindow || event.origin !== previewOrigin.value) return;
			const parsed = appInspectorEventSchema.safeParse(event.data);
			if (!parsed.success) return;
			inspecting.value = false;
			if (parsed.data.type === "inspect:selected") emit("element-selected", parsed.data.element);
		}
		function onKeyDown(event) {
			if (event.key === "Escape" && inspecting.value) setInspecting(false);
		}
		watch(() => props.elementSelected, (selected, wasSelected) => {
			if (wasSelected && !selected) postInspectCommand("inspect:clear");
		});
		onMounted(() => {
			window.addEventListener("message", onMessage);
			window.addEventListener("keydown", onKeyDown);
		});
		watch(() => latestBuilt.value?.id, async () => await show(), { immediate: true });
		onBeforeUnmount(() => {
			window.removeEventListener("message", onMessage);
			window.removeEventListener("keydown", onKeyDown);
			clearTimeout(refreshTimer);
			latestFetch.invalidate();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.preview),
				"data-test-id": "app-preview"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolbar) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.left) }, [createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("apps.preview.reload") }, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "refresh-cw",
						variant: "ghost",
						size: "small",
						"aria-label": unref(i18n).baseText("apps.preview.reload"),
						loading: loading.value,
						"data-test-id": "app-preview-reload",
						onClick: reload
					}, null, 8, ["aria-label", "loading"])]),
					_: 1
				}, 8, ["content"]), unref(building) ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					variant: "info",
					"data-test-id": "app-preview-status"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.preview.building")), 1)]),
					_: 1
				})) : buildFailed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 1,
					variant: "danger",
					"data-test-id": "app-preview-status"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.preview.buildFailed")), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2),
				inspecting.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.version),
					"data-test-id": "app-preview-inspect-hint"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.preview.inspect.hint")), 1)]),
					_: 1
				}, 8, ["class"])) : versionLabel.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.version),
					"data-test-id": "app-preview-version"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.preview.version", { interpolate: { version: versionLabel.value } })), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.right) }, [
					createVNode(AppPreviewOptionMenu_default, {
						modelValue: screenSize.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => screenSize.value = $event),
						options: sizeOptions.value,
						label: unref(i18n).baseText("apps.preview.size.label"),
						"data-test-id": "app-preview-size"
					}, null, 8, [
						"modelValue",
						"options",
						"label"
					]),
					createVNode(AppPreviewOptionMenu_default, {
						modelValue: theme.value,
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => theme.value = $event),
						options: themeOptions.value,
						label: unref(i18n).baseText("apps.preview.theme.label"),
						"data-test-id": "app-preview-theme"
					}, null, 8, [
						"modelValue",
						"options",
						"label"
					]),
					createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("apps.preview.openInNewTab") }, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "external-link",
							variant: "ghost",
							size: "small",
							"aria-label": unref(i18n).baseText("apps.preview.openInNewTab"),
							disabled: !preview.value,
							"data-test-id": "app-preview-open",
							onClick: openInNewTab
						}, null, 8, ["aria-label", "disabled"])]),
						_: 1
					}, 8, ["content"])
				], 2)
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.stage) }, [loading.value && !preview.value && !failed.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: true,
				rows: 3,
				"data-test-id": "app-preview-loading"
			})) : failed.value && !preview.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				icon: {
					type: "icon",
					value: "triangle-alert"
				},
				heading: unref(i18n).baseText("apps.preview.error.heading"),
				description: unref(i18n).baseText("apps.preview.error.description"),
				"data-test-id": "app-preview-error"
			}, null, 8, ["heading", "description"])) : preview.value ? (openBlock(), createElementBlock("iframe", {
				key: preview.value.url,
				ref_key: "frame",
				ref: frame,
				src: preview.value.url,
				title: unref(i18n).baseText("apps.preview.frameTitle", { interpolate: { name: __props.app.name } }),
				style: normalizeStyle({
					width: SCREEN_WIDTHS[screenSize.value],
					colorScheme: theme.value
				}),
				class: normalizeClass(_ctx.$style.frame),
				sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads",
				"data-test-id": "app-preview-frame",
				onLoad: onFrameLoad
			}, null, 46, _hoisted_1$3)) : unref(building) ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 3,
				icon: {
					type: "icon",
					value: "wrench"
				},
				heading: unref(i18n).baseText("apps.preview.firstBuild.heading"),
				description: unref(i18n).baseText("apps.preview.firstBuild.description"),
				"data-test-id": "app-preview-first-build"
			}, null, 8, ["heading", "description"])) : buildFailed.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 4,
				icon: {
					type: "icon",
					value: "triangle-alert"
				},
				heading: unref(i18n).baseText("apps.preview.buildFailedState.heading"),
				description: unref(i18n).baseText("apps.preview.buildFailedState.description"),
				"data-test-id": "app-preview-build-failed"
			}, null, 8, ["heading", "description"])) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 5,
				icon: {
					type: "icon",
					value: "eye"
				},
				heading: unref(i18n).baseText("apps.preview.empty.heading"),
				description: unref(i18n).baseText("apps.preview.empty.description"),
				"data-test-id": "app-preview-empty"
			}, null, 8, ["heading", "description"])), __props.inspectable && preview.value ? (openBlock(), createElementBlock("div", {
				key: 6,
				class: normalizeClass(_ctx.$style.modes),
				"data-test-id": "app-preview-modes"
			}, [createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("apps.preview.inspect.browse") }, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "mouse-pointer",
					variant: "ghost",
					size: "small",
					class: normalizeClass({ [_ctx.$style.active]: !inspecting.value }),
					"aria-label": unref(i18n).baseText("apps.preview.inspect.browse"),
					"aria-pressed": !inspecting.value,
					"data-test-id": "app-preview-mode-browse",
					onClick: _cache[2] || (_cache[2] = ($event) => setInspecting(false))
				}, null, 8, [
					"class",
					"aria-label",
					"aria-pressed"
				])]),
				_: 1
			}, 8, ["content"]), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("apps.preview.inspect.select") }, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "crosshair",
					variant: "ghost",
					size: "small",
					class: normalizeClass({ [_ctx.$style.active]: inspecting.value }),
					"aria-label": unref(i18n).baseText("apps.preview.inspect.select"),
					"aria-pressed": inspecting.value,
					"data-test-id": "app-preview-mode-select",
					onClick: _cache[3] || (_cache[3] = ($event) => setInspecting(true))
				}, null, 8, [
					"class",
					"aria-label",
					"aria-pressed"
				])]),
				_: 1
			}, 8, ["content"])], 2)) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	preview: "_preview_13fgp_1",
	toolbar: "_toolbar_13fgp_8",
	left: "_left_13fgp_16",
	right: "_right_13fgp_17",
	modes: "_modes_13fgp_36",
	active: "_active_13fgp_50",
	version: "_version_13fgp_54",
	stage: "_stage_13fgp_62",
	frame: "_frame_13fgp_74"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/composables/useAppBindings.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function toAppBinding(binding) {
	return appBindingSchema.parse(binding);
}
function useAppBindings(app) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const bindings = ref([]);
	const warnings = ref([]);
	const loading = ref(false);
	const loaded = ref(false);
	let versionId = toValue(app).draftVersionId;
	let pendingSave = Promise.resolve();
	const warningsByKey = computed(() => new Map(warnings.value.map((warning) => [warning.key, warning])));
	function apply(response) {
		versionId = response.versionId;
		bindings.value = response.bindings;
		warnings.value = response.warnings;
		loaded.value = true;
	}
	async function load() {
		const { projectId, id } = toValue(app);
		loading.value = true;
		try {
			apply(await getAppBindings(rootStore.restApiContext, projectId, id));
			return true;
		} catch (error) {
			loaded.value = false;
			toast.showError(error, i18n.baseText("apps.configure.connections.loadError"));
			return false;
		} finally {
			loading.value = false;
		}
	}
	async function change(next) {
		const { projectId, id } = toValue(app);
		try {
			const response = await setAppBindings(rootStore.restApiContext, projectId, id, versionId, next);
			apply(response);
			return response;
		} catch (error) {
			toast.showError(error, i18n.baseText("apps.configure.connections.saveError"));
			if (error instanceof ResponseError && error.httpStatusCode === 409) await load();
			return;
		}
	}
	async function save(update) {
		const result = pendingSave.then(async () => {
			if (!loaded.value && !await load()) return void 0;
			return await change(update(bindings.value.map(toAppBinding)));
		});
		pendingSave = result.then(() => void 0);
		return await result;
	}
	return {
		bindings,
		warningsByKey,
		loading,
		loaded,
		load,
		save
	};
}
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/connections/AppBindingChip.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["data-test-id"];
var _hoisted_2$1 = ["data-test-id"];
var AppBindingChip_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppBindingChip",
	props: {
		binding: {},
		projectId: {},
		warning: {},
		canUpdate: { type: Boolean }
	},
	emits: ["update", "remove"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const open = ref(false);
		const draftPermissions = ref([]);
		const draftChanged = ref(false);
		const config = computed(() => BINDING_KINDS[props.binding.kind]);
		const permissions = computed(() => permissionsOf(props.binding));
		const missing = computed(() => "missing" in props.binding);
		const href = computed(() => missing.value ? void 0 : router.resolve(config.value.route(props.projectId, resourceIdOf(props.binding))).fullPath);
		function toggle(permission, checked) {
			draftChanged.value = true;
			draftPermissions.value = togglePermission(props.binding.kind, draftPermissions.value, permission, checked);
		}
		function isLastChecked(permission) {
			return draftPermissions.value.length === 1 && draftPermissions.value[0] === permission;
		}
		function permissionsChanged() {
			return draftPermissions.value.length !== permissions.value.length || draftPermissions.value.some((permission) => !permissions.value.includes(permission));
		}
		function onOpen(value) {
			if (value) {
				draftPermissions.value = [...permissions.value];
				draftChanged.value = false;
				open.value = true;
				return;
			}
			if (open.value && draftChanged.value && permissionsChanged()) emit("update", draftPermissions.value);
			open.value = false;
		}
		function remove() {
			open.value = false;
			emit("remove");
		}
		watch(permissions, (value) => {
			if (open.value && !draftChanged.value) draftPermissions.value = [...value];
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				open: open.value,
				width: "260px",
				align: "start",
				"onUpdate:open": onOpen
			}, {
				trigger: withCtx(() => [createBaseVNode("button", {
					type: "button",
					class: normalizeClass([_ctx.$style.chip, { [_ctx.$style.warning]: __props.warning }]),
					"data-test-id": `app-binding-${__props.binding.key}`
				}, [
					createVNode(unref(N8nIcon_default), {
						icon: config.value.icon,
						size: 14,
						class: normalizeClass(_ctx.$style.icon)
					}, null, 8, ["icon", "class"]),
					createBaseVNode("span", null, toDisplayString(__props.binding.name), 1),
					__props.warning ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(WARNING_LABELS)[__props.warning.code])), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "triangle-alert",
							size: 14,
							class: normalizeClass(_ctx.$style.warningIcon),
							"data-test-id": `app-binding-${__props.binding.key}-warning`
						}, null, 8, ["class", "data-test-id"])]),
						_: 1
					})) : createCommentVNode("", true)
				], 10, _hoisted_1$2)]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.content),
					"data-test-id": `app-binding-${__props.binding.key}-details`
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.key")), 1)]),
						_: 1
					}), createBaseVNode("code", { class: normalizeClass(_ctx.$style.key) }, toDisplayString(__props.binding.key), 3)], 2),
					config.value.permissions.length > 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.section)
					}, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.permissions")), 1)]),
						_: 1
					}), (openBlock(true), createElementBlock(Fragment, null, renderList(config.value.permissions, (permission) => {
						return openBlock(), createBlock(unref(Checkbox_default), {
							key: permission,
							"model-value": draftPermissions.value.includes(permission),
							label: unref(i18n).baseText(unref(PERMISSION_LABELS)[permission]),
							disabled: !__props.canUpdate || isLastChecked(permission),
							"data-test-id": `app-binding-${__props.binding.key}-permission-${permission}`,
							"onUpdate:modelValue": ($event) => toggle(permission, $event)
						}, null, 8, [
							"model-value",
							"label",
							"disabled",
							"data-test-id",
							"onUpdate:modelValue"
						]);
					}), 128))], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [href.value ? (openBlock(), createBlock(unref(N8nLink_default), {
						key: 0,
						to: href.value,
						"new-window": true,
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.open")), 1)]),
						_: 1
					}, 8, ["to"])) : createCommentVNode("", true), __props.canUpdate ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						variant: "ghost",
						size: "small",
						icon: "trash-2",
						"data-test-id": `app-binding-${__props.binding.key}-remove`,
						onClick: remove
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.remove")), 1)]),
						_: 1
					}, 8, ["data-test-id"])) : createCommentVNode("", true)], 2)
				], 10, _hoisted_2$1)]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	chip: "_chip_67gs6_3",
	warning: "_warning_67gs6_26",
	icon: "_icon_67gs6_30",
	warningIcon: "_warningIcon_67gs6_34",
	content: "_content_67gs6_38",
	section: "_section_67gs6_45",
	key: "_key_67gs6_51",
	actions: "_actions_67gs6_56"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/connections/AppBindingPicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["data-test-id"];
var _hoisted_2 = [
	"disabled",
	"data-test-id",
	"onClick"
];
var AppBindingPicker_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppBindingPicker",
	props: {
		kind: {},
		projectId: {},
		boundIds: {}
	},
	emits: ["add"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const { debounce } = useDebounce();
		const latestFetch = useLatestFetch();
		const open = ref(false);
		const loading = ref(false);
		const resources = ref([]);
		const resourceCount = ref(0);
		const search = ref("");
		const selected = ref();
		const permissions = ref([]);
		const config = computed(() => BINDING_KINDS[props.kind]);
		const moreResults = computed(() => Math.max(0, resourceCount.value - resources.value.length));
		async function fetchResources(query) {
			const isLatest = latestFetch.next();
			loading.value = true;
			try {
				const result = await listBindableResources(rootStore.restApiContext, props.projectId, props.kind, query || void 0);
				if (!isLatest()) return;
				resources.value = result.data;
				resourceCount.value = result.count;
			} catch (error) {
				if (!isLatest()) return;
				toast.showError(error, i18n.baseText("apps.configure.connections.listError"));
				open.value = false;
			} finally {
				if (isLatest()) loading.value = false;
			}
		}
		const fetchResourcesDebounced = debounce(fetchResources, {
			debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
			trailing: true
		});
		function onSearch(value) {
			latestFetch.invalidate();
			loading.value = true;
			fetchResourcesDebounced(value.trim());
		}
		async function onOpen(value) {
			open.value = value;
			if (!value) {
				fetchResourcesDebounced.cancel();
				latestFetch.invalidate();
				loading.value = false;
				return;
			}
			search.value = "";
			selected.value = void 0;
			resources.value = [];
			resourceCount.value = 0;
			await fetchResources("");
		}
		function add(resource, chosen) {
			open.value = false;
			emit("add", resource, chosen);
		}
		function choose(resource) {
			if (config.value.permissions.length === 0) {
				add(resource, []);
				return;
			}
			selected.value = resource;
			permissions.value = [...config.value.defaultPermissions];
		}
		function toggle(permission, checked) {
			permissions.value = togglePermission(props.kind, permissions.value, permission, checked);
		}
		onScopeDispose(() => {
			fetchResourcesDebounced.cancel();
			latestFetch.invalidate();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				open: open.value,
				width: "280px",
				"max-height": "320px",
				align: "start",
				"onUpdate:open": onOpen
			}, {
				trigger: withCtx(() => [createBaseVNode("span", null, [createVNode(unref(N8nTooltip_default), {
					content: unref(i18n).baseText(config.value.addLabel),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "plus",
						variant: "ghost",
						size: "small",
						"aria-label": unref(i18n).baseText(config.value.addLabel),
						"data-test-id": `app-binding-add-${__props.kind}`
					}, null, 8, ["aria-label", "data-test-id"])]),
					_: 1
				}, 8, ["content"])])]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.content),
					"data-test-id": `app-binding-picker-${__props.kind}`
				}, [selected.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
					createVNode(unref(N8nText_default), { bold: "" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(selected.value.name), 1)]),
						_: 1
					}),
					(openBlock(true), createElementBlock(Fragment, null, renderList(config.value.permissions, (permission) => {
						return openBlock(), createBlock(unref(Checkbox_default), {
							key: permission,
							"model-value": permissions.value.includes(permission),
							label: unref(i18n).baseText(unref(PERMISSION_LABELS)[permission]),
							"data-test-id": `app-binding-picker-permission-${permission}`,
							"onUpdate:modelValue": ($event) => toggle(permission, $event)
						}, null, 8, [
							"model-value",
							"label",
							"data-test-id",
							"onUpdate:modelValue"
						]);
					}), 128)),
					createVNode(unref(N8nButton_default), {
						size: "small",
						disabled: permissions.value.length === 0,
						"data-test-id": "app-binding-picker-confirm",
						onClick: _cache[0] || (_cache[0] = ($event) => add(selected.value, permissions.value))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.add")), 1)]),
						_: 1
					}, 8, ["disabled"])
				], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					createVNode(unref(Input_default), {
						modelValue: search.value,
						"onUpdate:modelValue": [_cache[1] || (_cache[1] = ($event) => search.value = $event), onSearch],
						size: "small",
						placeholder: unref(i18n).baseText("apps.configure.connections.search"),
						"data-test-id": "app-binding-picker-search"
					}, null, 8, ["modelValue", "placeholder"]),
					loading.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.loading")), 1)]),
						_: 1
					})) : resources.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.empty")), 1)]),
						_: 1
					})) : (openBlock(), createElementBlock("ul", {
						key: 2,
						class: normalizeClass(_ctx.$style.list)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(resources.value, (resource) => {
						return openBlock(), createElementBlock("li", { key: resource.id }, [createBaseVNode("button", {
							type: "button",
							class: normalizeClass(_ctx.$style.item),
							disabled: __props.boundIds.has(resource.id),
							"data-test-id": `app-binding-picker-item-${resource.id}`,
							onClick: ($event) => choose(resource)
						}, toDisplayString(resource.name), 11, _hoisted_2)]);
					}), 128))], 2)),
					!loading.value && moreResults.value > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 3,
						size: "small",
						color: "text-light",
						"data-test-id": "app-binding-picker-more-results"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.moreResults", { interpolate: { count: moreResults.value } })), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 64))], 10, _hoisted_1$1)]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_w6jyd_1",
	list: "_list_w6jyd_8",
	item: "_item_w6jyd_14"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/connections/bindingKey.ts
var MAX_KEY_LENGTH = 64;
var KIND_PREFIX = {
	workflow: "workflow",
	dataTable: "table",
	agent: "agent"
};
function camelCase(name) {
	return name.normalize("NFD").replace(/\p{M}/gu, "").split(/[^a-zA-Z0-9]+/).filter(Boolean).map((word, index) => index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1)).join("");
}
function deriveBindingKey(name, kind, takenKeys) {
	const taken = new Set(takenKeys);
	let base = camelCase(name);
	if (!/^[a-z]/.test(base)) base = KIND_PREFIX[kind] + base.charAt(0).toUpperCase() + base.slice(1);
	let key = base.slice(0, MAX_KEY_LENGTH);
	for (let suffix = 2; taken.has(key); suffix++) key = base.slice(0, MAX_KEY_LENGTH - String(suffix).length) + suffix;
	return appBindingKeySchema.parse(key);
}
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/connections/AppConnectionsCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var AppConnectionsCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppConnectionsCard",
	props: {
		app: {},
		versions: {}
	},
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { bindings, warningsByKey, loading, loaded, load, save } = useAppBindings(() => props.app);
		const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate && loaded.value && !loading.value);
		const rows = computed(() => BINDING_KIND_ORDER.map((kind) => {
			const ofKind = bindings.value.filter((binding) => binding.kind === kind);
			return {
				kind,
				label: BINDING_KINDS[kind].label,
				bindings: ofKind,
				boundIds: new Set(ofKind.map(resourceIdOf))
			};
		}));
		async function persist(update) {
			const response = await save(update);
			if (!response) return;
			emit("updated", {
				...props.app,
				draftVersionId: response.versionId
			});
			await props.versions.refresh();
		}
		async function add(kind, resource, permissions) {
			await persist((current) => [...current, createBinding(kind, deriveBindingKey(resource.name, kind, current.map(({ key }) => key)), resource.id, permissions)]);
		}
		async function update(key, permissions) {
			await persist((current) => current.map((binding) => binding.key === key ? withPermissions(binding, permissions) : binding));
		}
		async function remove(key) {
			await persist((current) => current.filter((binding) => binding.key !== key));
		}
		onMounted(load);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsRowGroup_default), { "data-test-id": "app-configure-connections" }, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.connections.description")), 1)]),
					_: 1
				})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.rows) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(rows.value, (row) => {
					return openBlock(), createElementBlock(Fragment, { key: row.kind }, [createVNode(unref(N8nText_default), {
						bold: "",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(row.label)), 1)]),
						_: 2
					}, 1024), createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.chips),
						"data-test-id": `app-connections-${row.kind}`
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(row.bindings, (binding) => {
						return openBlock(), createBlock(AppBindingChip_default, {
							key: binding.key,
							binding,
							"project-id": __props.app.projectId,
							warning: unref(warningsByKey).get(binding.key),
							"can-update": canUpdate.value,
							onUpdate: ($event) => update(binding.key, $event),
							onRemove: ($event) => remove(binding.key)
						}, null, 8, [
							"binding",
							"project-id",
							"warning",
							"can-update",
							"onUpdate",
							"onRemove"
						]);
					}), 128)), canUpdate.value ? (openBlock(), createBlock(AppBindingPicker_default, {
						key: 0,
						kind: row.kind,
						"project-id": __props.app.projectId,
						"bound-ids": row.boundIds,
						onAdd: (resource, permissions) => add(row.kind, resource, permissions)
					}, null, 8, [
						"kind",
						"project-id",
						"bound-ids",
						"onAdd"
					])) : createCommentVNode("", true)], 10, _hoisted_1)], 64);
				}), 128))], 2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_iareu_1",
	rows: "_rows_iareu_8",
	chips: "_chips_iareu_16"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/AppConfigureGeneral.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppConfigureGeneral_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppConfigureGeneral",
	props: {
		app: {},
		versions: {}
	},
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		const FIELDS = [{
			id: "name",
			schema: appNameSchema,
			maxLength: 128,
			label: "apps.configure.general.name",
			description: void 0,
			invalidText: "apps.configure.general.nameInvalid"
		}, {
			id: "namespace",
			schema: appNamespaceSchema,
			maxLength: 54,
			label: "apps.configure.general.namespace",
			description: "apps.configure.general.namespaceDescription",
			invalidText: "apps.configure.general.namespaceInvalid"
		}];
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const message = useMessage();
		const rootStore = useRootStore();
		const form = ref({
			name: props.app.name,
			namespace: props.app.namespace
		});
		const saving = ref({});
		let pendingSave = Promise.resolve();
		const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
		const invalid = computed(() => new Set(FIELDS.filter(({ id, schema }) => !schema.safeParse(form.value[id]).success).map(({ id }) => id)));
		function reset(field) {
			form.value[field] = props.app[field];
		}
		async function confirmNamespaceChange() {
			if (!props.app.publishedUrl) return true;
			return await message.confirm(i18n.baseText("apps.configure.general.namespaceConfirm.message"), i18n.baseText("apps.configure.general.namespaceConfirm.title"), {
				confirmButtonText: i18n.baseText("apps.configure.general.namespaceConfirm.confirm"),
				cancelButtonText: i18n.baseText("generic.cancel"),
				type: "warning"
			}) === "confirm";
		}
		async function save(field, value) {
			try {
				if (field === "namespace" && !await confirmNamespaceChange()) {
					reset(field);
					return;
				}
				const changes = {};
				changes[field] = value;
				emit("updated", await updateApp(rootStore.restApiContext, props.app.projectId, props.app.id, changes));
			} catch (error) {
				toast.showError(error, i18n.baseText("apps.configure.general.saveError"));
			} finally {
				saving.value[field] = false;
			}
		}
		function commit(field) {
			const value = form.value[field].trim();
			if (saving.value[field] || invalid.value.has(field)) return;
			if (value === props.app[field]) {
				reset(field);
				return;
			}
			saving.value[field] = true;
			pendingSave = pendingSave.then(async () => await save(field, value));
		}
		function onKeydown(event, field) {
			if (event.key === "Escape") reset(field);
			if ((event.key === "Enter" || event.key === "Escape") && event.target instanceof HTMLElement) event.target.blur();
		}
		watch(() => props.app.name, () => reset("name"));
		watch(() => props.app.namespace, () => reset("namespace"));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.cards),
				"data-test-id": "app-configure-general"
			}, [createVNode(unref(SettingsRowGroup_default), null, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.general.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.configure.general.description")), 1)]),
					_: 1
				})], 2), (openBlock(), createElementBlock(Fragment, null, renderList(FIELDS, (field) => {
					return createVNode(unref(SettingsRow_default), {
						key: field.id,
						title: unref(i18n).baseText(field.label),
						description: field.description && unref(i18n).baseText(field.description),
						layout: "vertical"
					}, {
						action: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(Input_default), {
							modelValue: form.value[field.id],
							"onUpdate:modelValue": ($event) => form.value[field.id] = $event,
							class: normalizeClass({ [_ctx.$style.invalid]: invalid.value.has(field.id) }),
							maxlength: field.maxLength,
							disabled: !canUpdate.value || saving.value[field.id],
							"aria-label": unref(i18n).baseText(field.label),
							"data-test-id": `app-configure-${field.id}`,
							onBlur: ($event) => commit(field.id),
							onKeydown: ($event) => onKeydown($event, field.id)
						}, null, 8, [
							"modelValue",
							"onUpdate:modelValue",
							"class",
							"maxlength",
							"disabled",
							"aria-label",
							"data-test-id",
							"onBlur",
							"onKeydown"
						]), invalid.value.has(field.id) ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.error),
							"data-test-id": `app-configure-${field.id}-error`
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(field.invalidText)), 1)]),
							_: 2
						}, 1032, ["class", "data-test-id"])) : createCommentVNode("", true)], 2)]),
						_: 2
					}, 1032, ["title", "description"]);
				}), 64))]),
				_: 1
			}), createVNode(AppConnectionsCard_default, {
				app: __props.app,
				versions: __props.versions,
				onUpdated: _cache[0] || (_cache[0] = ($event) => emit("updated", $event))
			}, null, 8, ["app", "versions"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	cards: "_cards_715yl_1",
	field: "_field_715yl_7",
	invalid: "_invalid_715yl_13",
	error: "_error_715yl_17",
	cardHeader: "_cardHeader_715yl_23"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/configure/AppConfigure.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var AppConfigure_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppConfigure",
	props: {
		app: {},
		versions: {}
	},
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.configure),
				"data-test-id": "app-view-configure"
			}, [createVNode(AppConfigureGeneral_default, {
				app: __props.app,
				versions: __props.versions,
				onUpdated: _cache[0] || (_cache[0] = ($event) => emit("updated", $event))
			}, null, 8, ["app", "versions"])], 2);
		};
	}
}), [["__cssModules", { "$style": { configure: "_configure_18vmd_1" } }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/versions/AppVersionsPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppVersionsPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppVersionsPanel",
	props: {
		app: {},
		versions: {}
	},
	emits: [
		"updated",
		"restored",
		"close"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const { versions: list, loading, failed } = props.versions;
		const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
		const selected = ref(null);
		const publishOpen = ref(false);
		const restoring = ref(false);
		function isDraft(version) {
			return version.id === props.app.draftVersionId;
		}
		function publishDisabledReason(version) {
			if (!canUpdate.value) return i18n.baseText("apps.versions.noPermission");
			if (isBuilt(version)) return void 0;
			return i18n.baseText(isDraft(version) ? "apps.versions.notBuilt" : "apps.versions.notBuiltRestore");
		}
		function actions(version) {
			const items = [];
			if (version.id !== props.app.publishedVersionId) {
				const reason = publishDisabledReason(version);
				items.push({
					id: "publish",
					label: i18n.baseText("apps.versions.publish"),
					disabled: reason !== void 0,
					description: reason
				});
			}
			if (!isDraft(version)) items.push({
				id: "restore",
				label: i18n.baseText("apps.versions.restore"),
				disabled: !canUpdate.value || restoring.value,
				description: canUpdate.value ? void 0 : i18n.baseText("apps.versions.noPermission")
			});
			return items;
		}
		async function restore(version) {
			restoring.value = true;
			try {
				await restoreAppVersion(rootStore.restApiContext, props.app.projectId, props.app.id, version.id, { baseVersionId: props.app.draftVersionId });
				emit("restored");
			} catch (error) {
				toast.showError(error, i18n.baseText("apps.versions.restoreError"));
				if (error instanceof ResponseError && error.httpStatusCode === 409) emit("restored");
			} finally {
				restoring.value = false;
			}
		}
		async function onSelect(action, version) {
			if (!actions(version).some((item) => item.id === action && !item.disabled)) return;
			if (action === "restore") {
				await restore(version);
				return;
			}
			selected.value = version;
			publishOpen.value = true;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.panel),
				"data-test-id": "app-versions-panel"
			}, [
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.versions.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nIconButton_default), {
					icon: "x",
					variant: "ghost",
					size: "small",
					"aria-label": unref(i18n).baseText("generic.close"),
					"data-test-id": "app-versions-close",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				}, null, 8, ["aria-label"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [unref(loading) && !unref(list).length ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 0,
					loading: true,
					rows: 3,
					"data-test-id": "app-versions-loading"
				})) : unref(failed) && !unref(list).length ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.error),
					"data-test-id": "app-versions-error"
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.versions.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					label: unref(i18n).baseText("generic.retry"),
					"data-test-id": "app-versions-retry",
					onClick: _cache[1] || (_cache[1] = ($event) => __props.versions.refresh())
				}, null, 8, ["label"])], 2)) : !unref(list).length ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					color: "text-light",
					"data-test-id": "app-versions-empty"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.versions.empty")), 1)]),
					_: 1
				})) : (openBlock(true), createElementBlock(Fragment, { key: 3 }, renderList(unref(list), (version, index) => {
					return openBlock(), createElementBlock("div", {
						key: version.id,
						class: normalizeClass([_ctx.$style.row, { [_ctx.$style.current]: index === 0 }]),
						"data-test-id": "app-version-row"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.text) }, [
						createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(getAppVersionLabel)(version)), 1)]),
							_: 2
						}, 1024),
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createVNode(unref(N8nTimeAgo_default), {
								date: version.createdAt,
								locale: unref(rootStore).defaultLocale
							}, null, 8, ["date", "locale"])]),
							_: 2
						}, 1024),
						version.id === __props.app.publishedVersionId ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.badge),
							variant: "success",
							"data-test-id": "app-version-published"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.publish.published")), 1)]),
							_: 1
						}, 8, ["class"])) : unref(isBuilding)(version.buildStatus) ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 1,
							class: normalizeClass(_ctx.$style.badge),
							variant: "info",
							"data-test-id": "app-version-status"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.preview.building")), 1)]),
							_: 1
						}, 8, ["class"])) : version.buildStatus === "failed" ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 2,
							class: normalizeClass(_ctx.$style.badge),
							variant: "danger",
							"data-test-id": "app-version-status"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("apps.preview.buildFailed")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					], 2), actions(version).length ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
						key: 0,
						items: actions(version),
						placement: "bottom-end",
						"data-test-id": "app-version-actions",
						onSelect: ($event) => onSelect($event, version)
					}, {
						menuItem: withCtx((item) => [createVNode(unref(N8nTooltip_default), {
							content: item.description,
							disabled: !item.description,
							placement: "left"
						}, {
							default: withCtx(() => [createBaseVNode("span", null, toDisplayString(item.label), 1)]),
							_: 2
						}, 1032, ["content", "disabled"])]),
						activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "ellipsis",
							variant: "ghost",
							size: "small",
							"aria-label": unref(i18n).baseText("apps.versions.actions")
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["items", "onSelect"])) : createCommentVNode("", true)], 2);
				}), 128))], 2),
				selected.value ? (openBlock(), createBlock(AppPublishDialog_default, {
					key: 0,
					open: publishOpen.value,
					"onUpdate:open": _cache[2] || (_cache[2] = ($event) => publishOpen.value = $event),
					app: __props.app,
					version: selected.value,
					onUpdated: _cache[3] || (_cache[3] = ($event) => emit("updated", $event))
				}, null, 8, [
					"open",
					"app",
					"version"
				])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_q8u70_1",
	header: "_header_q8u70_14",
	body: "_body_q8u70_22",
	row: "_row_q8u70_30",
	current: "_current_q8u70_38",
	text: "_text_q8u70_42",
	error: "_error_q8u70_50",
	badge: "_badge_q8u70_57"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/components/AppView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AppView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppView",
	props: /*@__PURE__*/ mergeModels({
		projectId: {},
		appId: {},
		inspectable: { type: Boolean },
		elementSelected: { type: Boolean }
	}, {
		"section": { default: "preview" },
		"sectionModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["deleted", "element-selected"], ["update:section"]),
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const latestFetch = useLatestFetch();
		const telemetry = useTelemetry();
		const app = ref(null);
		const loading = ref(true);
		const versionsOpen = ref(false);
		const versions = useAppVersions(() => props.projectId, () => app.value?.id);
		const section = useModel(__props, "section");
		const activeTab = computed({
			get: () => section.value === "configure" ? "configure" : "preview",
			set: (tab) => {
				section.value = tab;
			}
		});
		async function loadApp(keepView = false) {
			const isLatest = latestFetch.next();
			if (!keepView) {
				app.value = null;
				loading.value = true;
			}
			try {
				const result = await getApp(rootStore.restApiContext, props.projectId, props.appId);
				if (!isLatest()) return;
				app.value = result;
				if (!keepView) telemetry.track(TELEMETRY_EVENT.APPS.USER_OPENED_APP_BUILDER, {
					app_id: result.id,
					project_id: result.projectId,
					is_published: result.publishedVersionId !== null
				});
			} catch (error) {
				if (!isLatest()) return;
				if (error instanceof ResponseError && error.httpStatusCode === 404) app.value = null;
				else toast.showError(error, i18n.baseText("apps.detail.loadError"));
			}
			loading.value = false;
		}
		async function refresh() {
			await loadApp(true);
			await versions.refresh();
		}
		function onAppUpdated(updated) {
			const publishChanged = updated.publishedVersionId !== app.value?.publishedVersionId;
			app.value = updated;
			if (publishChanged) versions.refresh();
		}
		watch(() => [props.projectId, props.appId], async () => {
			versionsOpen.value = false;
			await loadApp();
		}, { immediate: true });
		__expose({ refresh });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.view),
				"data-test-id": "app-view"
			}, [loading.value || app.value ? (openBlock(), createBlock(AppHeader_default, {
				key: 0,
				tab: activeTab.value,
				"onUpdate:tab": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
				"project-id": __props.projectId,
				app: app.value,
				"publishable-version": unref(versions).latestBuilt.value,
				onUpdated: onAppUpdated,
				onDeleted: _cache[1] || (_cache[1] = ($event) => emit("deleted", $event)),
				onShowVersions: _cache[2] || (_cache[2] = ($event) => versionsOpen.value = true)
			}, null, 8, [
				"tab",
				"project-id",
				"app",
				"publishable-version"
			])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.workspace) }, [createBaseVNode("main", { class: normalizeClass([_ctx.$style.content, { [_ctx.$style.flush]: app.value && activeTab.value === "preview" }]) }, [loading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: true,
				rows: 3,
				"data-test-id": "app-view-loading"
			})) : !app.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				heading: unref(i18n).baseText("apps.detail.notFound.heading"),
				description: unref(i18n).baseText("apps.detail.notFound.description"),
				"data-test-id": "app-view-not-found"
			}, null, 8, ["heading", "description"])) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [activeTab.value === "preview" ? (openBlock(), createBlock(AppPreview_default, {
				key: 0,
				"project-id": __props.projectId,
				app: app.value,
				versions: unref(versions),
				inspectable: __props.inspectable,
				"element-selected": __props.elementSelected,
				onElementSelected: _cache[3] || (_cache[3] = ($event) => emit("element-selected", $event))
			}, null, 8, [
				"project-id",
				"app",
				"versions",
				"inspectable",
				"element-selected"
			])) : (openBlock(), createBlock(AppConfigure_default, {
				key: 1,
				app: app.value,
				versions: unref(versions),
				onUpdated: onAppUpdated
			}, null, 8, ["app", "versions"]))], 64))], 2), app.value && versionsOpen.value ? (openBlock(), createBlock(AppVersionsPanel_default, {
				key: 0,
				app: app.value,
				versions: unref(versions),
				onUpdated: onAppUpdated,
				onRestored: refresh,
				onClose: _cache[4] || (_cache[4] = ($event) => versionsOpen.value = false)
			}, null, 8, ["app", "versions"])) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	view: "_view_1i5vx_1",
	workspace: "_workspace_1i5vx_8",
	content: "_content_1i5vx_17",
	flush: "_flush_1i5vx_26"
} }]]);
//#endregion
export { AppView_default as t };
