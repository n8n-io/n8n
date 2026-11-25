import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Gu as usePreferredDark, Hd as createElementBlock, Hf as shallowReactive, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Uu as useMutationObserver, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, bu as createReusableTemplate, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, lo as defineStore, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Cp as INSTANCE_POLICY_STORE_ID, EM as Select_default, Ep as POLICY_TAB_LABEL_KEY, Hj as SettingsPageHeader_default, Mw as ResponseError, SN as _plugin_vue_export_helper_default, Sp as INSTANCE_POLICY_DOCS_URL, TM as N8nPagination_default, Tp as POLICIES_LANDING_VIEW, Uj as SettingsLayout_default, _N as N8nText_default, _p as fetchCredentialTypeUsage, bC as useRootStore, bp as fetchNodeTypeSummaries, cN as Input_default, dC as useToast, ej as N8nDataTableServer_default, ep as usePolicyAdminAccess, fC as VIEWS, gp as fetchCredentialTypeSummaries, hp as useTypeAvailabilityPoliciesStore, jN as useI18n, kj as N8nSegmentControl_default, qd as useDocumentTitle, qj as N8nNodeIcon_default, vp as fetchInstanceAccess, xN as N8nIcon_default, xp as saveInstancePolicy, yN as N8nButton_default, yp as fetchInstancePolicy } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/typeIcon.ts
var ABSOLUTE_URL = /^(https?:)?\/\//;
function themed(value, theme) {
	return typeof value === "object" ? value[theme] : value;
}
/**
* Follows the editor's icon resolution, which a module cannot import. Returns `fallback` for an icon
* this module cannot draw, and `undefined` when the type has no icon of its own.
*/
function typeIcon(type, theme, baseUrl, fallback) {
	const iconUrl = themed(type.iconUrl, theme);
	if (iconUrl) return {
		type: "file",
		src: ABSOLUTE_URL.test(iconUrl) ? iconUrl : baseUrl + iconUrl
	};
	const icon = themed(type.icon, theme);
	const color = type.iconColor ? `var(--node--icon--color--${type.iconColor})` : void 0;
	if (icon?.startsWith("fa:")) return {
		type: "icon",
		name: icon.slice(3),
		color
	};
	if (icon?.startsWith("node:")) return icon.includes(".") ? fallback : {
		type: "icon",
		name: icon,
		color
	};
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/credentialTypeIcon.ts
/** For a type with no icon this module can resolve, for example one that names a node type. */
var FALLBACK_TYPE_ICON = {
	type: "icon",
	name: "key-round"
};
/** Follows the editor's `CredentialIcon`, which a module cannot import. */
function credentialTypeIcon(types, name, theme, baseUrl, visited = /* @__PURE__ */ new Set()) {
	const type = types.get(name);
	if (!type || visited.has(name)) return void 0;
	visited.add(name);
	const ownIcon = typeIcon(type, theme, baseUrl, FALLBACK_TYPE_ICON);
	if (ownIcon) return ownIcon;
	for (const parent of type.extends ?? []) {
		const parentIcon = credentialTypeIcon(types, parent, theme, baseUrl, visited);
		if (parentIcon) return parentIcon;
	}
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/InstancePolicyTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var InstancePolicyTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstancePolicyTable",
	props: {
		rows: {},
		loading: { type: Boolean },
		searchPlaceholder: {}
	},
	emits: ["change", "open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const ACCESS_LABEL_KEY = {
			allow: "typeAvailabilityPolicies.instancePolicy.table.access.allow",
			deny: "typeAvailabilityPolicies.instancePolicy.table.access.deny",
			delegate: "typeAvailabilityPolicies.instancePolicy.table.access.delegate"
		};
		const ACCESS_ICON = {
			allow: {
				icon: "check",
				color: "success"
			},
			deny: {
				icon: "lock",
				color: "danger"
			},
			delegate: {
				icon: "lock-unlocked",
				color: "secondary"
			}
		};
		const USAGE_COLUMNS = [
			{
				key: "projects",
				title: "typeAvailabilityPolicies.instancePolicy.table.projects"
			},
			{
				key: "uses",
				title: "typeAvailabilityPolicies.instancePolicy.table.uses"
			},
			{
				key: "workflows",
				title: "typeAvailabilityPolicies.instancePolicy.table.workflows"
			},
			{
				key: "activeWorkflows",
				title: "typeAvailabilityPolicies.instancePolicy.table.activeWorkflows"
			}
		];
		const ACCESS_ORDER = [
			"allow",
			"delegate",
			"deny"
		];
		const search = ref("");
		const accessFilter = ref("all");
		const sortBy = ref([{
			id: "displayName",
			desc: false
		}]);
		const page = ref(0);
		const PAGE_SIZES = [
			10,
			25,
			50,
			100
		];
		const itemsPerPage = ref(25);
		const headers = computed(() => [
			{
				title: i18n.baseText("typeAvailabilityPolicies.instancePolicy.table.name"),
				key: "displayName",
				minWidth: 200
			},
			{
				title: i18n.baseText("typeAvailabilityPolicies.instancePolicy.table.access"),
				key: "access",
				width: 136
			},
			...USAGE_COLUMNS.map((column) => ({
				title: i18n.baseText(column.title),
				key: column.key,
				value: (row) => row.usage?.[column.key] ?? i18n.baseText("typeAvailabilityPolicies.instancePolicy.table.noValue"),
				disableSort: true,
				width: 92
			}))
		]);
		const collator = new Intl.Collator();
		const sortedRows = computed(() => {
			const [sort] = sortBy.value;
			const direction = sort?.desc ? -1 : 1;
			const byName = (a, b) => collator.compare(a.displayName, b.displayName);
			const compare = sort?.id === "access" ? (a, b) => direction * (ACCESS_ORDER.indexOf(a.access) - ACCESS_ORDER.indexOf(b.access)) || byName(a, b) : (a, b) => direction * byName(a, b);
			return [...props.rows].sort(compare);
		});
		const searchedRows = computed(() => {
			const query = search.value.trim().toLowerCase();
			if (!query) return sortedRows.value;
			return sortedRows.value.filter((row) => row.displayName.toLowerCase().includes(query) || row.name.toLowerCase().includes(query));
		});
		const filterOptions = computed(() => {
			const count = (access) => searchedRows.value.filter((row) => row.access === access).length;
			const options = [{
				value: "all",
				label: i18n.baseText("typeAvailabilityPolicies.instancePolicy.table.filter.all", { interpolate: { count: searchedRows.value.length } })
			}];
			for (const access of ACCESS_ORDER) {
				const accessCount = count(access);
				if (access === "delegate" && accessCount === 0 && accessFilter.value !== "delegate") continue;
				options.push({
					value: access,
					label: i18n.baseText("typeAvailabilityPolicies.instancePolicy.table.filter.option", { interpolate: {
						label: i18n.baseText(ACCESS_LABEL_KEY[access]),
						count: accessCount
					} })
				});
			}
			return options;
		});
		function isAccessFilter(value) {
			return value === "all" || ACCESS_ORDER.some((access) => access === value);
		}
		function onFilterChange(value) {
			if (isAccessFilter(value)) accessFilter.value = value;
		}
		const filteredRows = computed(() => accessFilter.value === "all" ? searchedRows.value : searchedRows.value.filter((row) => row.access === accessFilter.value));
		const pageRows = computed(() => filteredRows.value.slice(page.value * itemsPerPage.value, (page.value + 1) * itemsPerPage.value));
		watch([
			search,
			accessFilter,
			sortBy,
			itemsPerPage
		], () => {
			page.value = 0;
		});
		watch(() => filteredRows.value.length, (count) => {
			page.value = Math.min(page.value, Math.max(0, Math.ceil(count / itemsPerPage.value) - 1));
		});
		function menuItems(current) {
			return ["allow", "deny"].map((access) => ({
				id: access,
				label: i18n.baseText(ACCESS_LABEL_KEY[access]),
				checked: access === current
			}));
		}
		const accessMenuItems = computed(() => ({
			allow: menuItems("allow"),
			deny: menuItems("deny"),
			delegate: menuItems("delegate")
		}));
		function onRowClick(_event, { item }) {
			emit("open", item.name);
		}
		function onAccessChange(row, access) {
			if (access !== row.access) emit("change", row.name, access);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.table) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.controls) }, [
					renderSlot(_ctx.$slots, "toolbar-start"),
					createVNode(unref(Input_default), {
						modelValue: search.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => search.value = $event),
						placeholder: __props.searchPlaceholder,
						class: normalizeClass(_ctx.$style.search),
						size: "large",
						clearable: "",
						"data-test-id": "instance-policy-search"
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						_: 1
					}, 8, [
						"modelValue",
						"placeholder",
						"class"
					]),
					createVNode(unref(Select_default), {
						"model-value": accessFilter.value,
						items: filterOptions.value,
						size: "large",
						icon: "funnel",
						align: "end",
						class: normalizeClass(_ctx.$style.filter),
						"aria-label": unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.table.filter.label"),
						"data-test-id": "instance-policy-access-filter",
						"onUpdate:modelValue": onFilterChange
					}, null, 8, [
						"model-value",
						"items",
						"class",
						"aria-label"
					])
				], 2),
				createVNode(unref(N8nDataTableServer_default), {
					"sort-by": sortBy.value,
					"onUpdate:sortBy": _cache[2] || (_cache[2] = ($event) => sortBy.value = $event),
					headers: headers.value,
					items: pageRows.value,
					"items-length": filteredRows.value.length,
					loading: __props.loading,
					"item-value": "name",
					"pin-columns": 1,
					pagination: false,
					"data-test-id": "instance-policy-table",
					"onClick:row": onRowClick
				}, {
					[`item.displayName`]: withCtx(({ item }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.name) }, [createVNode(unref(N8nNodeIcon_default), mergeProps(item.icon, { size: 20 }), null, 16), createVNode(unref(N8nText_default), {
						color: "text-dark",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.displayName), 1)]),
						_: 2
					}, 1024)], 2)]),
					[`item.access`]: withCtx(({ item }) => [item.editable ? (openBlock(), createBlock(unref(DropdownMenu_default), {
						key: 0,
						items: accessMenuItems.value[item.access],
						placement: "bottom-start",
						"data-test-id": `instance-policy-access-${item.name}`,
						onSelect: (access) => onAccessChange(item, access)
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "small",
							onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
							"aria-label": unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.table.access.ariaLabel", { interpolate: { name: item.displayName } })
						}, {
							default: withCtx(() => [
								createVNode(unref(N8nIcon_default), mergeProps(ACCESS_ICON[item.access], { size: "small" }), null, 16),
								createTextVNode(" " + toDisplayString(unref(i18n).baseText(ACCESS_LABEL_KEY[item.access])) + " ", 1),
								createVNode(unref(N8nIcon_default), {
									icon: "chevron-down",
									size: "small"
								})
							]),
							_: 2
						}, 1032, ["aria-label"])]),
						"item-leading": withCtx(({ item: menuItem, ui }) => [createVNode(unref(N8nIcon_default), mergeProps(ACCESS_ICON[menuItem.id], { class: ui.class }), null, 16, ["class"])]),
						_: 2
					}, 1032, [
						"items",
						"data-test-id",
						"onSelect"
					])) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.readOnly),
						"data-test-id": `instance-policy-access-${item.name}`
					}, [createVNode(unref(N8nIcon_default), mergeProps(ACCESS_ICON[item.access], { size: "small" }), null, 16), createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(ACCESS_LABEL_KEY[item.access])), 1)]),
						_: 2
					}, 1024)], 10, _hoisted_1))]),
					_: 2
				}, 1032, [
					"sort-by",
					"headers",
					"items",
					"items-length",
					"loading"
				]),
				filteredRows.value.length > PAGE_SIZES[0] ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.footer)
				}, [createVNode(unref(N8nPagination_default), {
					"items-per-page": itemsPerPage.value,
					"onUpdate:itemsPerPage": _cache[3] || (_cache[3] = ($event) => itemsPerPage.value = $event),
					page: page.value + 1,
					"page-sizes": PAGE_SIZES,
					total: filteredRows.value.length,
					"show-total": false,
					"onUpdate:page": _cache[4] || (_cache[4] = (value) => page.value = value - 1)
				}, null, 8, [
					"items-per-page",
					"page",
					"total"
				])], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	table: "_table_1fk95_1",
	controls: "_controls_1fk95_7",
	search: "_search_1fk95_13",
	filter: "_filter_1fk95_19",
	name: "_name_1fk95_25",
	readOnly: "_readOnly_1fk95_26",
	footer: "_footer_1fk95_32"
} }]]);
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/setTypeAccess.ts
/**
* Gives the type its own `name` rule and replaces the earlier one. The first matching rule decides,
* so the new rule goes directly before the rule that decides the type now (`decidingRuleId`):
* - The rules before it do not match the type, so they stay in front. A rule on a generated Tool
*   variant, such as `slackTool`, keeps deciding that variant.
* - When no rule matches the type (`null`), the new rule goes last.
* - When the deciding rule is not known (`undefined`) or not in the list, the new rule goes first,
*   which always gives the type its access. It can then also decide a Tool variant that had a rule
*   of its own. This happens only when a save runs before the access list reloads, until GOV-362
*   moves the write to the server.
*
* A `name` rule on a node type also matches the Tool variants that no earlier rule decides, so they
* follow their base type. A trigger has a name of its own and keeps its access.
*/
function setTypeAccess(policy, typeName, action, decidingRuleId) {
	const rule = {
		id: crypto.randomUUID(),
		action,
		selector: {
			kind: "name",
			value: typeName
		}
	};
	const isOwnRule = (existing) => existing.selector.kind === "name" && existing.selector.value === typeName;
	let at = policy.rules.length;
	if (decidingRuleId !== null) at = Math.max(0, policy.rules.findIndex((existing) => existing.id === decidingRuleId));
	const rules = [...policy.rules];
	rules.splice(at, 0, rule);
	return {
		defaultAction: policy.defaultAction,
		rules: rules.filter((existing) => existing === rule || !isOwnRule(existing))
	};
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/instance-policy.store.ts
init_reactivity_esm_bundler();
var isConflict = (error) => error instanceof ResponseError && error.httpStatusCode === 409;
var useInstancePolicyStore = defineStore(INSTANCE_POLICY_STORE_ID, () => {
	const rootStore = useRootStore();
	const typeAvailabilityStore = useTypeAvailabilityPoliciesStore();
	const policies = shallowReactive({
		node: null,
		credential: null
	});
	const loadStates = shallowReactive({
		node: "idle",
		credential: "idle"
	});
	const notEditable = shallowReactive({
		node: false,
		credential: false
	});
	const saveQueues = {
		node: Promise.resolve(),
		credential: Promise.resolve()
	};
	const generations = {
		node: 0,
		credential: 0
	};
	const loadRequests = {
		node: 0,
		credential: 0
	};
	function accept(kind, policy) {
		const current = policies[kind];
		if (current && policy.version < current.version) return;
		policies[kind] = policy;
		if (current && policy.version > current.version) {
			notEditable[kind] = false;
			typeAvailabilityStore.reload();
		}
	}
	async function loadKind(kind) {
		const request = ++loadRequests[kind];
		loadStates[kind] = "loading";
		try {
			accept(kind, await fetchInstancePolicy(rootStore.restApiContext, kind));
			if (request === loadRequests[kind]) loadStates[kind] = "loaded";
			return null;
		} catch (error) {
			if (request !== loadRequests[kind]) return null;
			loadStates[kind] = "failed";
			return error;
		}
	}
	async function load(kinds) {
		return (await Promise.all(kinds.map(async (kind) => await loadKind(kind)))).filter((error) => error !== null);
	}
	/**
	* Saves the policy that `update` makes from the current policy. `update` runs when the save
	* starts, after the earlier saves of the same kind, so that it builds on their result.
	*/
	async function save(kind, update) {
		const generation = generations[kind];
		const run = saveQueues[kind].then(async () => await runSave(kind, update, generation));
		saveQueues[kind] = run.catch(() => void 0);
		return await run;
	}
	async function runSave(kind, update, generation) {
		if (generation !== generations[kind]) return { status: "dropped" };
		if (notEditable[kind]) return {
			status: "notEditable",
			sent: false
		};
		const current = policies[kind];
		if (!current) return {
			status: "failed",
			error: /* @__PURE__ */ new Error(`The ${kind} policy is not loaded`)
		};
		try {
			const result = await saveInstancePolicy(rootStore.restApiContext, kind, {
				...update(current),
				version: current.version
			});
			accept(kind, result);
			return {
				status: "saved",
				warnings: result.warnings
			};
		} catch (error) {
			if (!isConflict(error)) return {
				status: "failed",
				error
			};
			return await resolveConflict(kind, current.version, error);
		}
	}
	async function resolveConflict(kind, sentVersion, error) {
		let latest;
		try {
			latest = await fetchInstancePolicy(rootStore.restApiContext, kind);
		} catch {
			return {
				status: "failed",
				error
			};
		}
		if (latest.version === sentVersion) {
			notEditable[kind] = true;
			return {
				status: "notEditable",
				sent: true
			};
		}
		generations[kind]++;
		accept(kind, latest);
		return { status: "changed" };
	}
	return {
		policies,
		loadStates,
		notEditable,
		load,
		save
	};
});
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/useInstancePolicy.ts
function useInstancePolicy() {
	const store = useInstancePolicyStore();
	const toast = useToast();
	const i18n = useI18n();
	const { manageableKinds } = usePolicyAdminAccess();
	async function load() {
		const [error] = await store.load(manageableKinds.value);
		if (error !== void 0) toast.showError(error, i18n.baseText("typeAvailabilityPolicies.instancePolicy.loadError"));
	}
	async function save(kind, update) {
		const result = await store.save(kind, update);
		if (result.status === "changed") toast.showMessage({
			type: "warning",
			title: i18n.baseText("typeAvailabilityPolicies.instancePolicy.changed.title"),
			message: i18n.baseText("typeAvailabilityPolicies.instancePolicy.changed.message")
		});
		else if (result.status === "notEditable" && result.sent) toast.showMessage({
			type: "error",
			title: i18n.baseText("typeAvailabilityPolicies.instancePolicy.saveError"),
			message: i18n.baseText("typeAvailabilityPolicies.instancePolicy.notEditable.message"),
			duration: 0
		});
		else if (result.status === "failed") toast.showError(result.error, i18n.baseText("typeAvailabilityPolicies.instancePolicy.saveError"));
		return result;
	}
	return {
		policies: store.policies,
		loadStates: store.loadStates,
		notEditable: store.notEditable,
		load,
		save
	};
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/useInstanceTypeAccess.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/** The access of every type of one kind under the instance policy, for a tab of the admin page. */
function useInstanceTypeAccess(kind, setTypeAccess) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const instancePolicy = useInstancePolicy();
	const response = shallowRef(null);
	const loadingAccess = ref(false);
	const latestLoad = useLatestFetch();
	const pending = shallowReactive(/* @__PURE__ */ new Map());
	const types = computed(() => (response.value?.types ?? []).map((type) => ({
		name: type.name,
		access: pending.get(type.name)?.access ?? type.access,
		matchedRuleId: type.matchedRuleId,
		editable: !(type.access === "delegate" && type.matchedRuleId !== null)
	})));
	const loading = computed(() => loadingAccess.value || instancePolicy.loadStates[kind] === "loading");
	async function load() {
		const isLatest = latestLoad.next();
		loadingAccess.value = true;
		try {
			const loaded = await fetchInstanceAccess(rootStore.restApiContext, kind);
			if (!isLatest()) return;
			response.value = loaded;
			for (const [name, change] of pending) if (change.savedVersion !== void 0 && loaded.version >= change.savedVersion) pending.delete(name);
		} catch (error) {
			if (isLatest()) toast.showError(error, i18n.baseText("typeAvailabilityPolicies.instancePolicy.loadError"));
		} finally {
			if (isLatest()) loadingAccess.value = false;
		}
	}
	watch(() => instancePolicy.policies[kind]?.version, (version) => {
		if (version !== void 0 && version !== response.value?.version) load();
	}, { immediate: true });
	async function changeAccess(typeName, access) {
		const change = { access };
		pending.set(typeName, change);
		const result = await instancePolicy.save(kind, (policy) => {
			return setTypeAccess(policy, typeName, access, policy.version === response.value?.version ? response.value.types.find((type) => type.name === typeName)?.matchedRuleId : void 0);
		});
		if (pending.get(typeName) !== change) return;
		const savedVersion = instancePolicy.policies[kind]?.version;
		if (result.status === "saved" && savedVersion !== void 0) {
			if ((response.value?.version ?? -1) >= savedVersion) pending.delete(typeName);
			else change.savedVersion = savedVersion;
		} else pending.delete(typeName);
	}
	return {
		types,
		loading,
		changeAccess
	};
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/composables/useAppliedTheme.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The theme the editor shows. The editor sets `data-theme` on the body, or removes it to follow
* the system. A module cannot read the editor's UI store, so it reads the same signal.
*/
function useAppliedTheme() {
	const prefersDark = usePreferredDark();
	const bodyTheme = ref(document.body.getAttribute("data-theme"));
	useMutationObserver(document.body, () => {
		bodyTheme.value = document.body.getAttribute("data-theme");
	}, {
		attributes: true,
		attributeFilter: ["data-theme"]
	});
	return computed(() => {
		if (bodyTheme.value === "dark" || bodyTheme.value === "light") return bodyTheme.value;
		return prefersDark.value ? "dark" : "light";
	});
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/CredentialTypesTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/CredentialTypesTab.vue
var CredentialTypesTab_default = /* @__PURE__ */ defineComponent({
	__name: "CredentialTypesTab",
	setup(__props) {
		const NO_USAGE = {
			uses: 0,
			workflows: 0,
			activeWorkflows: 0,
			projects: 0
		};
		const i18n = useI18n();
		const rootStore = useRootStore();
		const theme = useAppliedTheme();
		const { types, loading, changeAccess } = useInstanceTypeAccess("credential", setTypeAccess);
		const typeSummaries = shallowRef(/* @__PURE__ */ new Map());
		const usage = shallowRef(null);
		const decorations = computed(() => {
			const byName = /* @__PURE__ */ new Map();
			for (const [name, summary] of typeSummaries.value) byName.set(name, {
				displayName: summary.displayName,
				icon: credentialTypeIcon(typeSummaries.value, name, theme.value, rootStore.baseUrl) ?? FALLBACK_TYPE_ICON
			});
			return byName;
		});
		const rows = computed(() => types.value.map((type) => ({
			...type,
			...decorations.value.get(type.name) ?? {
				displayName: type.name,
				icon: FALLBACK_TYPE_ICON
			},
			usage: usage.value === null ? null : usage.value[type.name] ?? NO_USAGE
		})));
		async function loadSummaries() {
			try {
				typeSummaries.value = await fetchCredentialTypeSummaries(rootStore.baseUrl);
			} catch {}
		}
		async function loadUsage() {
			try {
				usage.value = await fetchCredentialTypeUsage(rootStore.restApiContext);
			} catch {}
		}
		onMounted(async () => {
			await Promise.all([loadSummaries(), loadUsage()]);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstancePolicyTable_default, {
				rows: rows.value,
				loading: unref(loading),
				"search-placeholder": unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.table.search.credential"),
				"data-test-id": "credential-types-tab",
				onChange: unref(changeAccess)
			}, {
				"toolbar-start": withCtx(() => [renderSlot(_ctx.$slots, "toolbar-start")]),
				_: 3
			}, 8, [
				"rows",
				"loading",
				"search-placeholder",
				"onChange"
			]);
		};
	}
});
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/nodeTypeIcon.ts
var FALLBACK_NODE_TYPE_ICON = {
	type: "icon",
	name: "box"
};
function nodeTypeIcon(summary, theme, baseUrl) {
	return typeIcon(summary, theme, baseUrl, FALLBACK_NODE_TYPE_ICON) ?? FALLBACK_NODE_TYPE_ICON;
}
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/NodeTypesTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/NodeTypesTab.vue
var NodeTypesTab_default = /* @__PURE__ */ defineComponent({
	__name: "NodeTypesTab",
	setup(__props) {
		const i18n = useI18n();
		const rootStore = useRootStore();
		const theme = useAppliedTheme();
		const instancePolicy = useInstancePolicy();
		const { types, loading, changeAccess } = useInstanceTypeAccess("node", setTypeAccess);
		const typeSummaries = shallowRef(null);
		const decorations = computed(() => {
			const byName = /* @__PURE__ */ new Map();
			for (const [name, summary] of typeSummaries.value ?? []) byName.set(name, {
				displayName: summary.displayName,
				icon: nodeTypeIcon(summary, theme.value, rootStore.baseUrl)
			});
			return byName;
		});
		const broaderRuleIds = computed(() => new Set((instancePolicy.policies.node?.rules ?? []).flatMap((rule) => rule.selector.kind === "name" ? [] : [rule.id])));
		const rows = computed(() => {
			const summaries = typeSummaries.value;
			if (!summaries) return [];
			return types.value.filter((type) => !summaries.get(type.name)?.hidden || type.matchedRuleId !== null && !broaderRuleIds.value.has(type.matchedRuleId)).map((type) => ({
				...type,
				...decorations.value.get(type.name) ?? {
					displayName: type.name,
					icon: FALLBACK_NODE_TYPE_ICON
				},
				usage: null
			}));
		});
		onMounted(async () => {
			try {
				typeSummaries.value = await fetchNodeTypeSummaries(rootStore.baseUrl);
			} catch {
				typeSummaries.value = /* @__PURE__ */ new Map();
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstancePolicyTable_default, {
				rows: rows.value,
				loading: unref(loading) || typeSummaries.value === null,
				"search-placeholder": unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.table.search.node"),
				"data-test-id": "node-types-tab",
				onChange: unref(changeAccess)
			}, {
				"toolbar-start": withCtx(() => [renderSlot(_ctx.$slots, "toolbar-start")]),
				_: 3
			}, 8, [
				"rows",
				"loading",
				"search-placeholder",
				"onChange"
			]);
		};
	}
});
//#endregion
//#region ../../modules/type-availability-policies/frontend/src/instance-policy/InstancePolicyView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstancePolicyView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstancePolicyView",
	setup(__props) {
		const i18n = useI18n();
		const route = useRoute();
		const router = useRouter();
		const documentTitle = useDocumentTitle();
		const { manageableKinds, entryRouteName } = usePolicyAdminAccess();
		const instancePolicy = useInstancePolicy();
		const [DefineTabs, ReuseTabs] = createReusableTemplate();
		const tabOptions = computed(() => manageableKinds.value.map((kind) => ({
			value: kind,
			label: i18n.baseText(POLICY_TAB_LABEL_KEY[kind])
		})));
		const activeTab = computed({
			get: () => {
				const requested = route.query.tab;
				return manageableKinds.value.find((kind) => kind === requested) ?? manageableKinds.value[0];
			},
			set: (tab) => {
				router.replace({ query: {
					...route.query,
					tab
				} });
			}
		});
		const back = computed(() => entryRouteName.value === "TypeAvailabilityPoliciesView" ? {
			name: POLICIES_LANDING_VIEW,
			label: i18n.baseText("typeAvailabilityPolicies.instancePolicy.back")
		} : {
			name: VIEWS.SECURITY_SETTINGS,
			label: i18n.baseText("typeAvailabilityPolicies.backToPolicies")
		});
		function onBack() {
			router.push({ name: back.value.name });
		}
		onMounted(() => {
			documentTitle.set(i18n.baseText("typeAvailabilityPolicies.instancePolicy.title"));
			instancePolicy.load();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				"show-back": "",
				"back-label": back.value.label,
				class: normalizeClass(_ctx.$style.layout),
				"data-test-id": "instance-policy-view",
				onBack
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.title"),
						description: unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.description"),
						"docs-url": unref(INSTANCE_POLICY_DOCS_URL)
					}, null, 8, [
						"title",
						"description",
						"docs-url"
					]),
					createVNode(unref(DefineTabs), null, {
						default: withCtx(() => [createVNode(unref(N8nSegmentControl_default), {
							modelValue: activeTab.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
							options: tabOptions.value,
							size: "xlarge",
							"data-test-id": "instance-policy-tabs"
						}, null, 8, ["modelValue", "options"])]),
						_: 1
					}),
					activeTab.value === "credential" ? (openBlock(), createBlock(CredentialTypesTab_default, { key: 0 }, {
						"toolbar-start": withCtx(() => [createVNode(unref(ReuseTabs))]),
						_: 1
					})) : activeTab.value === "node" ? (openBlock(), createBlock(NodeTypesTab_default, { key: 1 }, {
						"toolbar-start": withCtx(() => [createVNode(unref(ReuseTabs))]),
						_: 1
					})) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["back-label", "class"]);
		};
	}
}), [["__cssModules", { "$style": { layout: "_layout_1oe0q_3" } }]]);
//#endregion
export { InstancePolicyView_default as default };
