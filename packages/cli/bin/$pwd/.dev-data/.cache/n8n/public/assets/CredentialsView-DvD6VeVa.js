import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { GS as EnterpriseEditionFeature, Hc as CredentialIcon_default, Jg as useUIStore, Kd as useDocumentTitle, Mp as useCredentialsStore, NM as N8nCard_default, Or as useCredentialOAuth, PA as useMessage, SN as _plugin_vue_export_helper_default, Sr as useContactAdminDialog, T_ as PROJECT_MOVE_RESOURCE_MODAL, Tg as isCredentialsResource, Vf as CauseCheckboxFilter_default, Xf as ContactAdminModal_default, Xm as useCredentialDescriptionsExperiment, YM as N8nActionToggle_default, Yf as RestrictedNodePopover_default, _M as Checkbox_default, _N as N8nText_default, bm as useSourceControlStore, cm as useEnvironmentsStore, dC as useToast, f as usePrefetchModals, fC as VIEWS, fN as N8nTooltip_default, fd as usePrivateCredentials, gM as N8nInputLabel_default, hC as useTelemetry, hp as useTypeAvailabilityPoliciesStore, hr as useExternalSecretsStore, jN as useI18n, lm as ResourceType, mM as N8nOption_default, nD as getResourcePermissions, nN as N8nBadge_default, ny as CREDENTIAL_EDIT_MODAL_KEY, pM as N8nSelect_default, qg as listenForModalChanges, ry as CREDENTIAL_SELECT_MODAL_KEY, tp as useTypeAvailability, uf as useNodeTypesStore, vm as useProjectsStore, yC as useSettingsStore, yN as N8nButton_default, yu as TimeAgo_default } from "./app-D5flEmb-.js";
import { t as ResourcesListLayout_default } from "./ResourcesListLayout-DF4MauKJ.js";
import { t as ResourcesListEmptyState_default } from "./ResourcesListEmptyState-CgwRE9Zu.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
import { t as useDependencies } from "./useDependencies-C0z0nXRY.js";
import { t as EmptySharedSectionActionBox_default } from "./EmptySharedSectionActionBox-8Eef3sds.js";
import { t as ProjectCardBadge_default } from "./ProjectCardBadge-OjdBsJc2.js";
import { t as ProjectHeader_default } from "./ProjectHeader-D25_B2LW.js";
import { t as DependencyPill_default } from "./DependencyPill-CgrjeV7z.js";
import { t as PrivateCredentialIcon_default } from "./PrivateCredentialIcon-LztlyFmz.js";
import { t as useInsightsStore } from "./insights.store-DnugpkOH.js";
import { t as InsightsSummary_default } from "./InsightsSummary-di7i8i9y.js";
import "./src-DnjiQGBn.js";
import { t as useInstanceAiCredentialHelp } from "./useInstanceAiCredentialHelp-3exi7OdU.js";
import { t as require_pickBy } from "./pickBy-Ui6BeW_E.js";
import { n as parseCredentialTypeUsabilityReasons, r as useCredentialTypeUsability, t as CREDENTIAL_TYPE_USABILITY_REASONS } from "./useCredentialTypeUsability-CwHqqYxq.js";
//#region src/features/credentials/components/CredentialCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var _hoisted_1$1 = { key: 0 };
var CredentialCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialCard",
	props: {
		data: {},
		readOnly: {
			type: Boolean,
			default: false
		},
		needsSetup: {
			type: Boolean,
			default: false
		}
	},
	emits: ["click", "connected"],
	setup(__props, { emit: __emit }) {
		const { isEnabled: credentialDescriptionsEnabled } = useCredentialDescriptionsExperiment();
		const CREDENTIAL_LIST_ITEM_ACTIONS = {
			OPEN: "open",
			DELETE: "delete",
			MOVE: "move",
			DISCONNECT: "disconnect"
		};
		const emit = __emit;
		const props = __props;
		const locale = useI18n();
		const message = useMessage();
		const toast = useToast();
		const uiStore = useUIStore();
		const credentialsStore = useCredentialsStore();
		const projectsStore = useProjectsStore();
		const policiesStore = useTypeAvailabilityPoliciesStore();
		const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();
		const { hasDependencies } = useDependencies();
		const { authorize, isOAuthCredentialType } = useCredentialOAuth();
		const { describeCredentialTypeUsability } = useCredentialTypeUsability();
		const { isOpen: isContactAdminOpen, state: contactAdmin, request: requestContactAdmin } = useContactAdminDialog(() => {});
		const isConnecting = ref(false);
		const restrictedBadgeRef = useTemplateRef("restrictedBadgeRef");
		const resourceTypeLabel = computed(() => locale.baseText("generic.credential").toLowerCase());
		const credentialType = computed(() => credentialsStore.getCredentialTypeByName(props.data.type ?? ""));
		const credentialTypeDisplayName = computed(() => credentialType.value?.displayName ?? props.data.type);
		const restriction = computed(() => props.data.restriction ? describeCredentialTypeUsability(props.data.restriction, credentialTypeDisplayName.value) : null);
		/** Whose admins the dialog lists. `undefined` keeps the dialog's default: the open policy project. */
		const contactProject = ref(void 0);
		async function onContactAdmin(audience) {
			if (!restriction.value) return;
			const { id } = props.data.restrictionProject ?? {};
			contactProject.value = audience === "project" && id && id !== policiesStore.policyProject?.id ? await projectsStore.fetchProject(id).catch(() => null) : void 0;
			requestContactAdmin(restriction.value.contactSubject, audience, restriction.value.kind);
		}
		const credentialPermissions = computed(() => getResourcePermissions(props.data.scopes).credential);
		const isPrivateUnconnected = computed(() => isPrivateCredentialsEnabled.value && props.data.isResolvable === true && props.data.connectedByMe === false && credentialPermissions.value.connect === true);
		const actions = computed(() => {
			const items = [{
				label: locale.baseText("credentials.item.open"),
				value: CREDENTIAL_LIST_ITEM_ACTIONS.OPEN
			}];
			if (credentialPermissions.value.delete && (!props.data.isResolvable || credentialPermissions.value.createEndUser)) items.push({
				label: locale.baseText("credentials.item.delete"),
				value: CREDENTIAL_LIST_ITEM_ACTIONS.DELETE
			});
			if (credentialPermissions.value.move && projectsStore.isTeamProjectFeatureEnabled) items.push({
				label: locale.baseText("credentials.item.move"),
				value: CREDENTIAL_LIST_ITEM_ACTIONS.MOVE
			});
			if (isPrivateCredentialsEnabled.value && props.data.isResolvable && props.data.connectedByMe) items.push({
				label: locale.baseText("credentials.item.disconnect"),
				value: CREDENTIAL_LIST_ITEM_ACTIONS.DISCONNECT
			});
			return items;
		});
		const formattedCreatedAtDate = computed(() => {
			const currentYear = (/* @__PURE__ */ new Date()).getFullYear().toString();
			return (0, import_dateformat.default)(props.data.createdAt, `d mmmm${String(props.data.createdAt).startsWith(currentYear) ? "" : ", yyyy"}`);
		});
		const credentialHasDependents = computed(() => hasDependencies(props.data.id, "credential"));
		function onClick() {
			emit("click", props.data.id);
		}
		async function onConnect() {
			const credential = credentialsStore.getCredentialById(props.data.id);
			if (!credential) return;
			if (!isOAuthCredentialType(credential.type)) {
				onClick();
				return;
			}
			isConnecting.value = true;
			try {
				if (await authorize(credential)) emit("connected", props.data.id);
			} finally {
				isConnecting.value = false;
			}
		}
		async function onAction(action) {
			switch (action) {
				case CREDENTIAL_LIST_ITEM_ACTIONS.OPEN:
					onClick();
					break;
				case CREDENTIAL_LIST_ITEM_ACTIONS.DELETE:
					await deleteResource();
					break;
				case CREDENTIAL_LIST_ITEM_ACTIONS.MOVE:
					moveResource();
					break;
				case CREDENTIAL_LIST_ITEM_ACTIONS.DISCONNECT: await disconnectResource();
			}
		}
		async function deleteResource() {
			if (await message.confirm(locale.baseText("credentialEdit.credentialEdit.confirmMessage.deleteCredential.message", { interpolate: { savedCredentialName: props.data.name } }), locale.baseText("credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline"), { confirmButtonText: locale.baseText("credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText") }) === "confirm") await credentialsStore.deleteCredential({ id: props.data.id });
		}
		async function disconnectResource() {
			if (await message.confirm(locale.baseText("credentialEdit.credentialEdit.confirmMessage.disconnectCredential.message", { interpolate: { savedCredentialName: props.data.name } }), locale.baseText("credentialEdit.credentialEdit.confirmMessage.disconnectCredential.headline"), { confirmButtonText: locale.baseText("credentialEdit.credentialEdit.confirmMessage.disconnectCredential.confirmButtonText") }) !== "confirm") return;
			try {
				await credentialsStore.disconnectMyConnection({ id: props.data.id });
				toast.showMessage({
					title: locale.baseText("credentialEdit.credentialEdit.showMessage.disconnected.title"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, locale.baseText("credentialEdit.credentialEdit.showError.disconnectCredential.title"));
			}
		}
		function moveResource() {
			uiStore.openModalWithData({
				name: PROJECT_MOVE_RESOURCE_MODAL,
				data: {
					resource: props.data,
					resourceType: ResourceType.Credential,
					resourceTypeLabel: resourceTypeLabel.value
				}
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass([_ctx.$style.cardLink, { [_ctx.$style.restricted]: restriction.value }]),
				onClick: withModifiers(onClick, ["stop"])
			}, {
				prepend: withCtx(() => [createVNode(CredentialIcon_default, {
					class: normalizeClass(_ctx.$style.dimmable),
					"credential-type-name": credentialType.value?.name ?? ""
				}, null, 8, ["class", "credential-type-name"])]),
				header: withCtx(() => [createVNode(unref(N8nText_default), {
					tag: "h2",
					bold: "",
					class: normalizeClass(_ctx.$style.cardHeading)
				}, {
					default: withCtx(() => [
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.dimmable) }, toDisplayString(__props.data.name), 3),
						__props.readOnly ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							class: "ml-3xs",
							variant: "outline"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("credentials.item.readonly")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						__props.needsSetup ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 1,
							class: "ml-3xs",
							variant: "warning"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("credentials.item.needsSetup")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						restriction.value ? (openBlock(), createElementBlock("span", {
							key: 2,
							ref_key: "restrictedBadgeRef",
							ref: restrictedBadgeRef,
							class: normalizeClass(["ml-3xs", _ctx.$style.restrictedBadge]),
							"data-test-id": "credential-card-restricted",
							onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
						}, [createVNode(unref(N8nBadge_default), null, {
							default: withCtx(() => [createVNode(unref(RestrictedNodePopover_default), {
								kind: restriction.value.kind,
								side: "right",
								"marker-size": "xsmall",
								"node-type-name": credentialTypeDisplayName.value,
								restriction: restriction.value.restriction,
								"scope-label": restriction.value.popoverScopeLabel,
								description: restriction.value.description,
								"project-type": __props.data.restrictionProject?.type,
								anchor: restrictedBadgeRef.value,
								onContactAdmin
							}, null, 8, [
								"kind",
								"node-type-name",
								"restriction",
								"scope-label",
								"description",
								"project-type",
								"anchor"
							]), createTextVNode(" " + toDisplayString(unref(locale).baseText("credentials.item.restricted")), 1)]),
							_: 1
						}), createVNode(unref(ContactAdminModal_default), {
							open: unref(isContactAdminOpen),
							"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isRef(isContactAdminOpen) ? isContactAdminOpen.value = $event : null),
							kind: unref(contactAdmin).kind,
							"type-name": unref(contactAdmin).subject,
							audience: unref(contactAdmin).audience,
							project: contactProject.value
						}, null, 8, [
							"open",
							"kind",
							"type-name",
							"audience",
							"project"
						])], 2)) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"])]),
				append: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.cardActions),
					onClick: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
				}, [
					credentialHasDependents.value ? (openBlock(), createBlock(DependencyPill_default, {
						key: 0,
						"resource-type": "credential",
						"resource-id": __props.data.id,
						source: "credential_card",
						"data-test-id": "credential-card-dependents"
					}, null, 8, ["resource-id"])) : createCommentVNode("", true),
					createVNode(ProjectCardBadge_default, {
						class: normalizeClass(_ctx.$style.cardBadge),
						resource: __props.data,
						"resource-type": unref(ResourceType).Credential,
						"resource-type-label": resourceTypeLabel.value,
						"personal-project": unref(projectsStore).personalProject,
						"show-badge-border": false,
						global: __props.data.isGlobal
					}, null, 8, [
						"class",
						"resource",
						"resource-type",
						"resource-type-label",
						"personal-project",
						"global"
					]),
					isPrivateUnconnected.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("credentials.item.connect.tooltip")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							size: "mini",
							loading: isConnecting.value,
							"data-test-id": "credential-card-connect",
							onClick: onConnect
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("credentials.item.connect")), 1)]),
							_: 1
						}, 8, ["loading"])]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nActionToggle_default), {
						"data-test-id": "credential-card-actions",
						actions: actions.value,
						theme: "dark",
						onAction
					}, null, 8, ["actions"])
				], 2)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass([
					_ctx.$style.cardDescription,
					_ctx.$style.dimmable,
					{ [_ctx.$style.hasDescription]: __props.data.description }
				]) }, [createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [
						credentialType.value ? (openBlock(), createElementBlock("span", _hoisted_1$1, toDisplayString(credentialType.value.displayName) + " | ", 1)) : createCommentVNode("", true),
						withDirectives(createBaseVNode("span", null, [
							createTextVNode(toDisplayString(unref(locale).baseText("credentials.item.updated")) + " ", 1),
							createVNode(TimeAgo_default, { date: __props.data.updatedAt }, null, 8, ["date"]),
							_cache[3] || (_cache[3] = createTextVNode(" | ", -1))
						], 512), [[vShow, __props.data]]),
						withDirectives(createBaseVNode("span", null, toDisplayString(unref(locale).baseText("credentials.item.created")) + " " + toDisplayString(formattedCreatedAtDate.value), 513), [[vShow, __props.data]])
					]),
					_: 1
				}), unref(isPrivateCredentialsEnabled) && __props.data.isResolvable ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.privateCredentialIndicator),
					"data-test-id": "credential-card-dynamic"
				}, [createVNode(PrivateCredentialIcon_default, {
					"tooltip-title": unref(locale).baseText("credentials.private.tooltipTitle"),
					"tooltip-text": unref(locale).baseText("credentials.private.tooltip"),
					size: "small"
				}, null, 8, ["tooltip-title", "tooltip-text"])], 2)) : createCommentVNode("", true)], 2), unref(credentialDescriptionsEnabled) && __props.data.description ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					placement: "top",
					"as-child": ""
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(__props.data.description), 1)]),
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						tag: "p",
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.credentialDescription),
						"data-test-id": "credential-card-description"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.data.description), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	cardLink: "_cardLink_7trak_113",
	cardHeading: "_cardHeading_7trak_123",
	restrictedBadge: "_restrictedBadge_7trak_130",
	restricted: "_restricted_7trak_130",
	dimmable: "_dimmable_7trak_138",
	cardDescription: "_cardDescription_7trak_142",
	hasDescription: "_hasDescription_7trak_149",
	credentialDescription: "_credentialDescription_7trak_153",
	privateCredentialIndicator: "_privateCredentialIndicator_7trak_163",
	cardActions: "_cardActions_7trak_169",
	cardBadge: "_cardBadge_7trak_190"
} }]]);
//#endregion
//#region src/features/credentials/views/CredentialsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_pickBy = /* @__PURE__ */ __toESM(require_pickBy(), 1);
var _hoisted_1 = { class: "mb-s" };
var _hoisted_2 = { class: "mb-s" };
var _hoisted_3 = {
	key: 0,
	class: "mb-s"
};
var CredentialsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialsView",
	props: { credentialId: {} },
	setup(__props) {
		const props = __props;
		const credentialsStore = useCredentialsStore();
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		usePrefetchModals([CREDENTIAL_SELECT_MODAL_KEY, CREDENTIAL_EDIT_MODAL_KEY]);
		const sourceControlStore = useSourceControlStore();
		const externalSecretsStore = useExternalSecretsStore();
		const projectsStore = useProjectsStore();
		const instanceAiCredentialHelp = useInstanceAiCredentialHelp();
		const insightsStore = useInsightsStore();
		const { fetchDependencyCounts } = useDependencies();
		const documentTitle = useDocumentTitle();
		const route = useRoute();
		const router = useRouter();
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const overview = useProjectPages();
		const USABILITY_REASON_LABEL_KEY = {
			typeRestricted: "credentials.filters.cannotBeUsed.typeRestricted",
			nodesRestricted: "credentials.filters.cannotBeUsed.nodesRestricted"
		};
		const updateFilter = (state) => {
			const query = (0, import_pickBy.default)({
				...state,
				cannotBeUsed: state.cannotBeUsed?.join(",")
			});
			router.replace({ query });
		};
		const onSearchUpdated = (search) => {
			updateFilter({
				...filters.value,
				search
			});
		};
		const filters = ref({
			...route.query,
			setupNeeded: route.query.setupNeeded?.toString() === "true",
			cannotBeUsed: parseCredentialTypeUsabilityReasons(route.query.cannotBeUsed),
			...route.query.externalSecretsStore ? { externalSecretsStore: route.query.externalSecretsStore.toString() } : {}
		});
		const loading = ref(false);
		const needsSetup = (credential) => {
			if (credential.isResolvable) return false;
			const dataObject = credential.data;
			if (!dataObject) return false;
			if (Object.keys(dataObject).length === 0) return true;
			return Object.values(dataObject).every((value) => !value || value === "__n8n_EMPTY_VALUE_7b1af746-3729-4c60-9b9b-e08eb29e58da");
		};
		const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
		const { fromCredentialRestriction } = useCredentialTypeUsability();
		const listedProject = computed(() => {
			const { projectId } = route?.params ?? {};
			if (typeof projectId !== "string") return void 0;
			const { currentProject } = projectsStore;
			return {
				id: projectId,
				type: currentProject?.id === projectId ? currentProject.type : void 0
			};
		});
		const allCredentials = computed(() => credentialsStore.allCredentials.map((credential) => ({
			resourceType: "credential",
			id: credential.id,
			name: credential.name,
			description: credential.description,
			value: "",
			updatedAt: credential.updatedAt,
			createdAt: credential.createdAt,
			homeProject: credential.homeProject,
			scopes: credential.scopes,
			sharedWithProjects: credential.sharedWithProjects,
			readOnly: !getResourcePermissions(credential.scopes).credential.update,
			needsSetup: needsSetup(credential),
			isGlobal: credential.isGlobal,
			isResolvable: credential.isResolvable,
			connectedByMe: credential.connectedByMe,
			type: credential.type,
			...restrictionOf(credential)
		})));
		function restrictionOf(credential) {
			const restriction = credentialsStore.restrictionsById[credential.id];
			if (!typeAvailabilityPoliciesStore.isEnabled || !restriction) return {};
			return {
				restriction: fromCredentialRestriction(restriction),
				restrictionProject: listedProject.value ?? credential.homeProject ?? void 0
			};
		}
		const allCredentialTypes = computed(() => credentialsStore.allCredentialTypes);
		const credentialTypesById = computed(() => credentialsStore.credentialTypesById);
		const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
		const projectPermissions = computed(() => getResourcePermissions(projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes));
		const personalProject = computed(() => {
			return projectsStore.personalProject;
		});
		const showSecretStoreFilter = computed(() => {
			return !!route.query.externalSecretsStore && externalSecretsStore.isEnterpriseExternalSecretsEnabled;
		});
		const setRouteCredentialId = (credentialId) => {
			router.replace({
				params: { credentialId },
				query: route.query
			});
		};
		const refreshCredentials = () => {
			credentialsStore.fetchAllCredentials({
				projectId: route?.params?.projectId,
				includeScopes: true,
				includeRestrictions: typeAvailabilityPoliciesStore.isEnabled,
				externalSecretsStore: filters.value.externalSecretsStore
			});
		};
		const addCredential = () => {
			setRouteCredentialId("create");
			telemetry.track("User clicked add cred button", { source: "Creds list" });
		};
		listenForModalChanges({
			store: uiStore,
			onModalClosed(modalName) {
				if (["selectCredential", "editCredential"].includes(modalName)) router.replace({
					params: { credentialId: "" },
					query: route.query
				});
				if (modalName === "editCredential" && credentialsStore.pendingOAuthRefresh) {
					credentialsStore.pendingOAuthRefresh = false;
					refreshCredentials();
				}
			}
		});
		const onFilter = (resource, newFilters, matches) => {
			if (!isCredentialsResource(resource)) return false;
			const filtersToApply = newFilters;
			if (filtersToApply.type && filtersToApply.type.length > 0) matches = matches && filtersToApply.type.includes(resource.type);
			if (filtersToApply.search) {
				const searchString = filtersToApply.search.toLowerCase();
				matches = matches || credentialTypesById.value[resource.type] && credentialTypesById.value[resource.type].displayName.toLowerCase().includes(searchString);
			}
			if (filtersToApply.setupNeeded) matches = matches && resource.needsSetup;
			if (typeAvailabilityPoliciesStore.isEnabled && filtersToApply.cannotBeUsed?.length) {
				const reason = resource.restriction?.reason;
				matches = matches && !!reason && filtersToApply.cannotBeUsed.includes(reason);
			}
			return matches;
		};
		const maybeCreateCredential = () => {
			if (props.credentialId === "create") {
				if (projectPermissions.value.credential.create) uiStore.openModalWithData({
					name: CREDENTIAL_SELECT_MODAL_KEY,
					data: {}
				});
				else router.replace({ name: VIEWS.HOMEPAGE });
			}
		};
		const maybeEditCredential = async () => {
			if (!!props.credentialId && props.credentialId !== "create") {
				const credential = credentialsStore.getCredentialById(props.credentialId);
				const credentialPermissions = getResourcePermissions(credential?.scopes).credential;
				if (!credential) return await router.replace({
					name: VIEWS.ENTITY_NOT_FOUND,
					params: { entityType: "credential" }
				});
				if (credentialPermissions.update || credentialPermissions.read) {
					uiStore.openExistingCredential(props.credentialId, { instanceAiCredentialHelp: instanceAiCredentialHelp() });
					return;
				}
				return await router.replace({
					name: VIEWS.ENTITY_UNAUTHORIZED,
					params: { entityType: "credential" }
				});
			}
		};
		const initialize = async () => {
			loading.value = true;
			const isVarsEnabled = useSettingsStore().isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables];
			const loadPromises = [
				credentialsStore.fetchAllCredentials({
					projectId: route?.params?.projectId,
					includeScopes: true,
					onlySharedWithMe: overview.isSharedSubPage,
					includeGlobal: true,
					includeRestrictions: typeAvailabilityPoliciesStore.isEnabled,
					externalSecretsStore: filters.value.externalSecretsStore
				}),
				credentialsStore.fetchCredentialTypes(false),
				nodeTypesStore.loadNodeTypesIfNotLoaded(),
				isVarsEnabled ? useEnvironmentsStore().fetchAllVariables() : Promise.resolve()
			];
			await Promise.all(loadPromises);
			maybeCreateCredential();
			await maybeEditCredential();
			loading.value = false;
			const credentialIds = credentialsStore.allCredentials.map((c) => c.id);
			fetchDependencyCounts(credentialIds, "credential");
		};
		credentialsStore.$onAction(({ name, after }) => {
			if (name === "createNewCredential" || name === "updateCredential") after(() => {
				refreshCredentials();
			});
		});
		sourceControlStore.$onAction(({ name, after }) => {
			if (name !== "pullWorkfolder") return;
			after(() => {
				initialize();
			});
		});
		watch(() => route?.params?.projectId, initialize);
		useTypeAvailability(() => {
			const { projectId } = route?.params ?? {};
			return typeof projectId === "string" ? projectId : projectsStore.personalProject?.id;
		});
		watch(() => props.credentialId, () => {
			maybeCreateCredential();
			maybeEditCredential();
		});
		watch(() => filters.value.externalSecretsStore, async (newValue, oldValue) => {
			if (newValue !== oldValue && (newValue !== void 0 || oldValue !== void 0)) initialize();
		});
		onMounted(() => {
			documentTitle.set(i18n.baseText("credentials.heading"));
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ResourcesListLayout_default, {
				ref: "layout",
				filters: filters.value,
				"onUpdate:filters": [_cache[0] || (_cache[0] = ($event) => filters.value = $event), updateFilter],
				"resource-key": "credentials",
				resources: allCredentials.value,
				initialize,
				"additional-filters-handler": onFilter,
				"type-props": { itemSize: 77 },
				loading: loading.value,
				disabled: readOnlyEnv.value || !projectPermissions.value.credential.create,
				"onUpdate:search": onSearchUpdated
			}, {
				header: withCtx(() => [createVNode(ProjectHeader_default, { "main-button": "credential" }, {
					default: withCtx(() => [unref(overview).isOverviewSubPage && unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(unref(InsightsSummary_default), {
						key: 0,
						loading: unref(insightsStore).weeklySummary.isLoading,
						summary: unref(insightsStore).weeklySummary.state,
						"time-range": "week"
					}, null, 8, ["loading", "summary"])) : createCommentVNode("", true)]),
					_: 1
				})]),
				default: withCtx(({ data }) => [createVNode(CredentialCard_default, {
					"data-test-id": "resources-list-item",
					class: "mb-2xs",
					data,
					"read-only": data.readOnly,
					"needs-setup": data.needsSetup,
					onClick: setRouteCredentialId,
					onConnected: refreshCredentials
				}, null, 8, [
					"data",
					"read-only",
					"needs-setup"
				])]),
				filters: withCtx(({ setKeyValue }) => [
					createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("credentials.filters.type"),
						bold: false,
						size: "small",
						color: "text-base",
						class: "mb-3xs"
					}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
						ref: "typeInput",
						"model-value": filters.value.type,
						size: "medium",
						multiple: "",
						filterable: "",
						class: normalizeClass(_ctx.$style["type-input"]),
						"onUpdate:modelValue": ($event) => setKeyValue("type", $event)
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(allCredentialTypes.value, (credentialType) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: credentialType.name,
								value: credentialType.name,
								label: credentialType.displayName
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, [
						"model-value",
						"class",
						"onUpdate:modelValue"
					])]),
					createBaseVNode("div", _hoisted_2, [
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("credentials.filters.status"),
							bold: false,
							size: "small",
							color: "text-base",
							class: "mb-3xs"
						}, null, 8, ["label"]),
						createVNode(unref(Checkbox_default), {
							label: unref(i18n).baseText("credentials.filters.setup"),
							"data-test-id": "credential-filter-setup-needed",
							"model-value": filters.value.setupNeeded,
							"onUpdate:modelValue": ($event) => setKeyValue("setupNeeded", $event)
						}, null, 8, [
							"label",
							"model-value",
							"onUpdate:modelValue"
						]),
						unref(typeAvailabilityPoliciesStore).isEnabled ? (openBlock(), createBlock(unref(CauseCheckboxFilter_default), {
							key: 0,
							class: "mt-2xs",
							"model-value": filters.value.cannotBeUsed ?? [],
							causes: unref(CREDENTIAL_TYPE_USABILITY_REASONS),
							label: unref(i18n).baseText("credentials.filters.cannotBeUsed"),
							"cause-label": (reason) => unref(i18n).baseText(USABILITY_REASON_LABEL_KEY[reason]),
							"test-id-prefix": "credential-filter-cannot-be-used",
							"onUpdate:modelValue": ($event) => setKeyValue("cannotBeUsed", $event)
						}, null, 8, [
							"model-value",
							"causes",
							"label",
							"cause-label",
							"onUpdate:modelValue"
						])) : createCommentVNode("", true)
					]),
					showSecretStoreFilter.value && filters.value.externalSecretsStore ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("credentials.filters.secretStore"),
						bold: false,
						size: "small",
						color: "text-base",
						class: "mb-3xs"
					}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
						"model-value": filters.value.externalSecretsStore,
						size: "medium",
						disabled: "",
						"data-test-id": "credential-filter-secret-store",
						class: normalizeClass(_ctx.$style["type-input"])
					}, {
						default: withCtx(() => [createVNode(unref(N8nOption_default), {
							value: filters.value.externalSecretsStore,
							label: filters.value.externalSecretsStore
						}, null, 8, ["value", "label"])]),
						_: 1
					}, 8, ["model-value", "class"])])) : createCommentVNode("", true)
				]),
				empty: withCtx(() => [unref(overview).isSharedSubPage && personalProject.value ? (openBlock(), createBlock(EmptySharedSectionActionBox_default, {
					key: 0,
					"personal-project": personalProject.value,
					"resource-type": "credentials"
				}, null, 8, ["personal-project"])) : (openBlock(), createBlock(ResourcesListEmptyState_default, {
					key: 1,
					"resource-key": "credentials",
					"button-disabled": readOnlyEnv.value || !projectPermissions.value.credential.create,
					"disabled-tooltip-text": readOnlyEnv.value ? unref(i18n).baseText("readOnlyEnv.cantAdd.credential") : void 0,
					"onClick:button": addCredential
				}, null, 8, ["button-disabled", "disabled-tooltip-text"]))]),
				_: 1
			}, 8, [
				"filters",
				"resources",
				"loading",
				"disabled"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	"type-input": "_type-input_11p01_1",
	sidebarContainer: "_sidebarContainer_11p01_5"
} }]]);
//#endregion
export { CredentialsView_default as default };
