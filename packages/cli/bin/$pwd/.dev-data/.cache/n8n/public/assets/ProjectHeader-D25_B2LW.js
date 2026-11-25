import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Ju as useResizeObserver, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pu as useElementSize, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, qd as defineAsyncComponent, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $s as useCreateApp, BC as ProjectTypes, GS as EnterpriseEditionFeature, Iu as PROJECT_DATA_TABLES, Jg as useUIStore, K as PERSONAL_SELF_HEALING_CONFIGURATION_VIEW, Kr as useAgentPermissions, Lc as useCreateAgent, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, VA as isIconOrEmoji, YM as N8nActionToggle_default, _C as useUsersStore, _N as N8nText_default, bm as useSourceControlStore, fC as VIEWS, fN as N8nTooltip_default, h as loadPromotionPreviewBadges, hC as useTelemetry, jN as useI18n, mm as selfHealingLocation, nD as getResourcePermissions, oc as useFoldersStore, q as PERSONAL_SELF_HEALING_VIEW, um as canConfigureSelfHealing, vN as N8nIconButton_default, vm as useProjectsStore, yC as useSettingsStore, yN as N8nButton_default, y_ as VARIABLE_MODAL_KEY, yj as Tabs_default, ym as useFavoritesStore } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
import { t as useReadyToRunStore } from "./readyToRun.store-CpURRYj-.js";
//#region src/app/utils/modules/tabUtils.ts
/**
* Process dynamic route configuration for tabs
* Resolves dynamic routes with project IDs and other parameters
*/
function processDynamicTab(tab, projectId) {
	const { available: _available, dynamicRoute, ...staticTab } = tab;
	if (!dynamicRoute) return staticTab;
	const tabRoute = { name: dynamicRoute.name };
	if (dynamicRoute.includeProjectId && projectId) tabRoute.params = { projectId };
	return {
		...staticTab,
		to: tabRoute
	};
}
/**
* Process an array of tabs with dynamic route resolution
*/
function processDynamicTabs(tabs, projectId) {
	return tabs.filter((tab) => tab.available?.(projectId) ?? true).map((tab) => processDynamicTab(tab, projectId));
}
//#endregion
//#region src/features/collaboration/projects/components/ProjectTabs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/collaboration/projects/components/ProjectTabs.vue
var ProjectTabs_default = /* @__PURE__ */ defineComponent({
	__name: "ProjectTabs",
	props: {
		showSettings: {
			type: Boolean,
			default: false
		},
		showExecutions: {
			type: Boolean,
			default: true
		},
		pageType: { default: "project" },
		additionalTabs: { default: () => [] }
	},
	setup(__props) {
		const props = __props;
		const locale = useI18n();
		const route = useRoute();
		const projectStore = useProjectsStore();
		const telemetry = useTelemetry();
		const selectedTab = ref("");
		const selectedTabLabel = computed(() => selectedTab.value ? String(selectedTab.value) : "");
		const projectId = computed(() => {
			return Array.isArray(route?.params?.projectId) ? route.params.projectId[0] : route?.params?.projectId;
		});
		const isPublicProject = computed(() => projectStore.currentProject?.type === ProjectTypes.Public);
		const getRouteConfigs = () => {
			if (projectId.value) return {
				workflows: {
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: { projectId: projectId.value }
				},
				credentials: {
					name: VIEWS.PROJECTS_CREDENTIALS,
					params: { projectId: projectId.value }
				},
				executions: {
					name: VIEWS.PROJECTS_EXECUTIONS,
					params: { projectId: projectId.value }
				},
				variables: {
					name: VIEWS.PROJECTS_VARIABLES,
					params: { projectId: projectId.value }
				}
			};
			if (props.pageType === "shared") return {
				workflows: { name: VIEWS.SHARED_WORKFLOWS },
				credentials: { name: VIEWS.SHARED_CREDENTIALS },
				executions: { name: VIEWS.NOT_FOUND },
				variables: { name: VIEWS.NOT_FOUND }
			};
			return {
				workflows: { name: VIEWS.WORKFLOWS },
				credentials: { name: VIEWS.CREDENTIALS },
				executions: { name: VIEWS.EXECUTIONS },
				variables: { name: VIEWS.HOME_VARIABLES }
			};
		};
		const createTab = (label, routeKey, routes) => {
			return {
				label: locale.baseText(label),
				value: routes[routeKey].name,
				to: routes[routeKey]
			};
		};
		const options = computed(() => {
			const routes = getRouteConfigs();
			const tabs = [createTab("mainSidebar.workflows", "workflows", routes), createTab("mainSidebar.credentials", "credentials", routes)];
			if (props.showExecutions) tabs.push(createTab("mainSidebar.executions", "executions", routes));
			if (props.pageType === "overview" || props.pageType === "project" && !isPublicProject.value) tabs.push(createTab("mainSidebar.variables", "variables", routes));
			if (props.additionalTabs?.length) {
				const processedAdditionalTabs = processDynamicTabs(props.additionalTabs, projectId.value);
				for (const processed of processedAdditionalTabs) {
					const { insertAfter, ...tab } = processed;
					const anchorIndex = insertAfter ? tabs.findIndex((t) => t.value === insertAfter) : -1;
					if (anchorIndex !== -1) tabs.splice(anchorIndex + 1, 0, tab);
					else tabs.push(tab);
				}
			}
			if (props.showSettings) tabs.push({
				label: locale.baseText("projects.settings"),
				value: VIEWS.PROJECT_SETTINGS,
				to: {
					name: VIEWS.PROJECT_SETTINGS,
					params: { projectId: projectId.value }
				}
			});
			return tabs;
		});
		watch(() => route?.name, () => {
			selectedTab.value = route.name === VIEWS.PROJECTS_FOLDERS ? VIEWS.PROJECTS_WORKFLOWS : route.name;
		}, { immediate: true });
		function onSelectTab(value) {
			if (selectedTab.value === "variables") telemetry.track("User clicked project variables tab", { project_id: projectId.value });
			selectedTab.value = value;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Tabs_default), {
				"model-value": selectedTabLabel.value,
				options: options.value,
				"data-test-id": "project-tabs",
				"onUpdate:modelValue": onSelectTab
			}, null, 8, ["model-value", "options"]);
		};
	}
});
//#endregion
//#region src/features/collaboration/projects/components/ProjectCreateResource.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ProjectCreateResource_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectCreateResource",
	props: {
		actions: {},
		disabled: { type: Boolean },
		variant: {}
	},
	emits: ["action"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const actionToggleRef = useTemplateRef("actionToggleRef");
		__expose({ openActionToggle: (isOpen) => actionToggleRef.value?.openActionToggle(isOpen) });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.buttonGroup]) }, [renderSlot(_ctx.$slots, "default"), createVNode(unref(N8nActionToggle_default), {
				ref_key: "actionToggleRef",
				ref: actionToggleRef,
				"data-test-id": "add-resource",
				actions: __props.actions,
				placement: "bottom-end",
				teleported: false,
				onAction: _cache[0] || (_cache[0] = ($event) => emit("action", $event))
			}, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					disabled: __props.disabled,
					class: normalizeClass([_ctx.$style.buttonGroupDropdown]),
					icon: "chevron-down",
					variant: __props.variant ?? "solid"
				}, null, 8, [
					"disabled",
					"class",
					"variant"
				])]),
				_: 1
			}, 8, ["actions"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	buttonGroup: "_buttonGroup_1d8c0_1",
	buttonGroupDropdown: "_buttonGroupDropdown_1d8c0_14"
} }]]);
//#endregion
//#region src/app/utils/formatters/textFormatter.ts
/**
* Truncate text to fit within a specified width, adding an ellipsis if necessary.
* @param text The text to truncate.
* @param availableWidth The available width for the text in pixels.
* @param fontSizeInPixels The font size of the text in pixels.
* @returns The truncated text with ellipsis, or an empty string if the text fits within the available width.
*/
var truncateTextToFitWidth = (text, availableWidth, fontSizeInPixels) => {
	if (!text || availableWidth <= 0) return "";
	const averageCharWidth = .55 * fontSizeInPixels;
	const maxLengthToDisplay = Math.floor(availableWidth / averageCharWidth);
	if (text.length <= maxLengthToDisplay) return "";
	const truncated = text.slice(0, maxLengthToDisplay);
	const lastSpaceIndex = truncated.lastIndexOf(" ");
	return truncated.slice(0, lastSpaceIndex === -1 ? maxLengthToDisplay : lastSpaceIndex) + "...";
};
//#endregion
//#region src/features/workflows/readyToRun/components/ReadyToRunButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/workflows/readyToRun/components/ReadyToRunButton.vue
var ReadyToRunButton_default = /* @__PURE__ */ defineComponent({
	__name: "ReadyToRunButton",
	props: { hasActiveCallouts: { type: Boolean } },
	setup(__props) {
		const props = __props;
		const route = useRoute();
		const i18n = useI18n();
		const projectPages = useProjectPages();
		const projectsStore = useProjectsStore();
		const sourceControlStore = useSourceControlStore();
		const foldersStore = useFoldersStore();
		const readyToRunStore = useReadyToRunStore();
		const projectPermissions = computed(() => {
			return getResourcePermissions(projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes);
		});
		const showButton = computed(() => {
			return readyToRunStore.getButtonVisibility(foldersStore.totalWorkflowCount > 0, projectPermissions.value.workflow.create, sourceControlStore.preferences.branchReadOnly) && !props.hasActiveCallouts;
		});
		const handleClick = async () => {
			const projectId = projectPages.isOverviewSubPage ? projectsStore.personalProject?.id : route.params.projectId;
			try {
				await readyToRunStore.claimCreditsAndOpenWorkflow("button", route.params.folderId, projectId);
			} catch {}
		};
		return (_ctx, _cache) => {
			return showButton.value ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 0,
				variant: "outline",
				"data-test-id": "ready-to-run-button",
				icon: "zap",
				loading: unref(readyToRunStore).claimingCredits,
				disabled: unref(sourceControlStore).preferences.branchReadOnly || unref(readyToRunStore).claimingCredits,
				onClick: handleClick
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.empty.readyToRun")), 1)]),
				_: 1
			}, 8, ["loading", "disabled"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/collaboration/projects/components/ProjectHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { style: {
	"display": "flex",
	"gap": "var(--spacing--xs)",
	"align-items": "center"
} };
var ProjectHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectHeader",
	props: {
		hasActiveCallouts: { type: Boolean },
		mainButton: {}
	},
	emits: ["createFolder"],
	setup(__props, { emit: __emit }) {
		const PromotionPreviewBadges = defineAsyncComponent(loadPromotionPreviewBadges);
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		const projectsStore = useProjectsStore();
		const sourceControlStore = useSourceControlStore();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const telemetry = useTelemetry();
		const { createAgent } = useCreateAgent();
		const { createApp } = useCreateApp();
		const usersStore = useUsersStore();
		const favoritesStore = useFavoritesStore();
		const currentProjectId = computed(() => projectsStore.currentProject?.id);
		const isTeamProject = computed(() => projectsStore.currentProject?.type === ProjectTypes.Team);
		const isProjectFavorited = computed(() => currentProjectId.value ? favoritesStore.isFavorite(currentProjectId.value, "project") : false);
		async function onToggleProjectFavorite() {
			if (!currentProjectId.value) return;
			await favoritesStore.toggleFavorite(currentProjectId.value, "project");
		}
		const projectPages = useProjectPages();
		const props = __props;
		const emit = __emit;
		const headerIcon = computed(() => {
			if (projectsStore.currentProject?.type === ProjectTypes.Personal) return {
				type: "icon",
				value: "user"
			};
			else if (projectsStore.currentProject?.name) return isIconOrEmoji(projectsStore.currentProject.icon) ? projectsStore.currentProject.icon : {
				type: "icon",
				value: "layers"
			};
			else return {
				type: "icon",
				value: "house"
			};
		});
		const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);
		const { canCreate: canCreateAgent } = useAgentPermissions(() => homeProject.value?.id);
		const isPersonalProject = computed(() => {
			return homeProject.value?.type === ProjectTypes.Personal;
		});
		const projectName = computed(() => {
			if (!projectsStore.currentProject) {
				if (projectPages.isSharedSubPage) return i18n.baseText("projects.header.shared.title");
				else if (projectPages.isOverviewSubPage) return i18n.baseText("projects.menu.overview");
				else if (isPersonalProject.value) return i18n.baseText("projects.menu.personal");
				return null;
			} else if (projectsStore.currentProject.type === ProjectTypes.Personal) return i18n.baseText("projects.menu.personal");
			else return projectsStore.currentProject.name;
		});
		const projectPermissions = computed(() => getResourcePermissions(projectsStore.currentProject?.scopes).project);
		const projectVariablePermissions = computed(() => getResourcePermissions(projectsStore.currentProject?.scopes).projectVariable);
		const globalVariablesPermissions = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).variable);
		const externalSecretsProviderPermissions = computed(() => getResourcePermissions(projectsStore.currentProject?.scopes).externalSecretsProvider);
		const showSettings = computed(() => !!route?.params?.projectId && (!!projectPermissions.value.update || !!projectPermissions.value.manageMembers || !!externalSecretsProviderPermissions.value.read) && projectsStore.currentProject?.type === ProjectTypes.Team);
		const showFolders = computed(() => {
			return settingsStore.isFoldersFeatureEnabled && [
				VIEWS.PROJECTS_WORKFLOWS,
				VIEWS.PROJECTS_FOLDERS,
				"ProjectAgents"
			].includes(String(route.name));
		});
		const pageType = computed(() => {
			if (projectPages.isSharedSubPage) return "shared";
			else if (projectPages.isOverviewSubPage) return "overview";
			else return "project";
		});
		const personalSelfHealingTab = computed(() => {
			const project = projectsStore.currentProject;
			if (pageType.value !== "project" || !project || project.id !== route?.params?.projectId || selfHealingLocation(project) !== "personalTab" || !canConfigureSelfHealing(project)) return null;
			return {
				label: i18n.baseText("selfHealing.config.heading"),
				value: PERSONAL_SELF_HEALING_VIEW,
				preview: true,
				to: {
					name: PERSONAL_SELF_HEALING_VIEW,
					params: { projectId: project.id }
				}
			};
		});
		const customProjectTabs = computed(() => {
			const moduleTabs = uiStore.moduleTabs[pageType.value];
			const tabs = Object.keys(moduleTabs).filter((module) => settingsStore.isModuleActive(module) && (module !== "agents" || settingsStore.isAgentsEnabled)).flatMap((module) => moduleTabs[module]);
			return personalSelfHealingTab.value ? [...tabs, personalSelfHealingTab.value] : tabs;
		});
		const ACTION_TYPES = {
			WORKFLOW: "workflow",
			CREDENTIAL: "credential",
			FOLDER: "folder",
			DATA_TABLE: "dataTable",
			VARIABLE: "variable",
			AGENT: "agent",
			APP: "app",
			SELF_HEALING: "selfHealing"
		};
		const createWorkflowButton = computed(() => ({
			value: ACTION_TYPES.WORKFLOW,
			label: i18n.baseText("projects.header.create.workflow"),
			icon: sourceControlStore.preferences.branchReadOnly ? "lock" : void 0,
			size: "mini",
			disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes).workflow.create
		}));
		const createCredentialButton = computed(() => ({
			value: ACTION_TYPES.CREDENTIAL,
			label: i18n.baseText("projects.header.create.credential"),
			icon: sourceControlStore.preferences.branchReadOnly ? "lock" : void 0,
			size: "mini",
			disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes).credential.create
		}));
		const createDataTableButton = computed(() => ({
			value: ACTION_TYPES.DATA_TABLE,
			label: i18n.baseText("dataTable.add.button.label"),
			icon: sourceControlStore.preferences.branchReadOnly ? "lock" : void 0,
			size: "mini",
			disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes)?.dataTable?.create
		}));
		const createVariableButton = computed(() => ({
			value: ACTION_TYPES.VARIABLE,
			label: i18n.baseText("variables.add.button.label"),
			icon: sourceControlStore.preferences.branchReadOnly ? "lock" : void 0,
			size: "mini",
			disabled: sourceControlStore.preferences.branchReadOnly || !settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables] || !projectVariablePermissions.value.create && !globalVariablesPermissions.value.create
		}));
		const createAgentButton = computed(() => ({
			value: ACTION_TYPES.AGENT,
			label: i18n.baseText("projects.header.create.agent"),
			size: "mini",
			disabled: !canCreateAgent.value
		}));
		const canCreateApp = computed(() => settingsStore.isAppsEnabled && !sourceControlStore.preferences.branchReadOnly && Boolean(getResourcePermissions(homeProject.value?.scopes).app?.create));
		const createAppButton = computed(() => ({
			value: ACTION_TYPES.APP,
			label: i18n.baseText("projects.header.create.app"),
			size: "mini",
			disabled: !canCreateApp.value
		}));
		const createSelfHealingButton = computed(() => ({
			value: ACTION_TYPES.SELF_HEALING,
			label: i18n.baseText("selfHealing.config.create"),
			icon: sourceControlStore.preferences.branchReadOnly ? "lock" : void 0,
			size: "mini",
			disabled: sourceControlStore.preferences.branchReadOnly || !personalSelfHealingTab.value
		}));
		const selectedMainButtonType = computed(() => {
			if (props.mainButton === ACTION_TYPES.AGENT && !settingsStore.isAgentsEnabled) return ACTION_TYPES.WORKFLOW;
			if (props.mainButton === ACTION_TYPES.APP && !settingsStore.isAppsEnabled) return ACTION_TYPES.WORKFLOW;
			return props.mainButton ?? ACTION_TYPES.WORKFLOW;
		});
		const mainButtonConfig = computed(() => {
			switch (selectedMainButtonType.value) {
				case ACTION_TYPES.CREDENTIAL: return createCredentialButton.value;
				case ACTION_TYPES.DATA_TABLE: return createDataTableButton.value;
				case ACTION_TYPES.VARIABLE: return createVariableButton.value;
				case ACTION_TYPES.SELF_HEALING: return createSelfHealingButton.value;
				case ACTION_TYPES.AGENT: return createAgentButton.value;
				case ACTION_TYPES.APP: return createAppButton.value;
				case ACTION_TYPES.WORKFLOW:
				default: return createWorkflowButton.value;
			}
		});
		const menu = computed(() => {
			const items = [];
			if (selectedMainButtonType.value !== ACTION_TYPES.WORKFLOW) items.push({
				value: ACTION_TYPES.WORKFLOW,
				label: i18n.baseText("projects.header.create.workflow"),
				disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes).workflow.create
			});
			if (selectedMainButtonType.value !== ACTION_TYPES.CREDENTIAL) items.push({
				value: ACTION_TYPES.CREDENTIAL,
				label: i18n.baseText("projects.header.create.credential"),
				disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes).credential.create
			});
			if (selectedMainButtonType.value !== ACTION_TYPES.VARIABLE && settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) items.push({
				value: ACTION_TYPES.VARIABLE,
				label: i18n.baseText("variables.add.button.label"),
				disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes).projectVariable.create
			});
			if (showFolders.value) items.push({
				value: ACTION_TYPES.FOLDER,
				label: i18n.baseText("projects.header.create.folder"),
				disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes).folder.create
			});
			if (settingsStore.isDataTableFeatureEnabled && selectedMainButtonType.value !== ACTION_TYPES.DATA_TABLE) items.push({
				value: ACTION_TYPES.DATA_TABLE,
				label: i18n.baseText("dataTable.add.button.label"),
				disabled: sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(homeProject.value?.scopes)?.dataTable?.create
			});
			if (settingsStore.isAgentsEnabled && selectedMainButtonType.value !== ACTION_TYPES.AGENT) items.push({
				value: ACTION_TYPES.AGENT,
				label: i18n.baseText("projects.header.create.agent"),
				disabled: !canCreateAgent.value
			});
			if (settingsStore.isAppsEnabled && selectedMainButtonType.value !== ACTION_TYPES.APP) items.push({
				value: ACTION_TYPES.APP,
				label: i18n.baseText("projects.header.create.app"),
				disabled: !canCreateApp.value
			});
			return items;
		});
		const showProjectIcon = computed(() => {
			return !projectPages.isOverviewSubPage && !projectPages.isSharedSubPage && !isPersonalProject.value;
		});
		function isCredentialsListView(routeName) {
			return [
				VIEWS.PROJECTS_CREDENTIALS,
				VIEWS.CREDENTIALS,
				VIEWS.SHARED_CREDENTIALS
			].includes(routeName);
		}
		function isWorkflowListView(routeName) {
			return [
				VIEWS.PROJECTS_WORKFLOWS,
				VIEWS.WORKFLOWS,
				VIEWS.SHARED_WORKFLOWS,
				VIEWS.PROJECTS_FOLDERS
			].includes(routeName);
		}
		function getUIContext(routeName) {
			if (isCredentialsListView(routeName)) return "credentials_list";
			else if (isWorkflowListView(routeName)) return "workflow_list";
			else return;
		}
		const actions = {
			[ACTION_TYPES.WORKFLOW]: (projectId) => {
				router.push({
					name: VIEWS.NEW_WORKFLOW,
					query: {
						projectId,
						parentFolderId: route.params.folderId,
						uiContext: getUIContext(route.name?.toString() ?? "")
					}
				});
			},
			[ACTION_TYPES.CREDENTIAL]: (projectId) => {
				router.push({
					name: VIEWS.PROJECTS_CREDENTIALS,
					params: {
						projectId,
						credentialId: "create"
					},
					query: { uiContext: getUIContext(route.name?.toString() ?? "") }
				});
			},
			[ACTION_TYPES.FOLDER]: () => {
				emit("createFolder");
			},
			[ACTION_TYPES.DATA_TABLE]: (projectId) => {
				router.push({
					name: PROJECT_DATA_TABLES,
					params: {
						projectId,
						new: "new"
					}
				});
			},
			[ACTION_TYPES.VARIABLE]: () => {
				uiStore.openModalWithData({
					name: VARIABLE_MODAL_KEY,
					data: { mode: "new" }
				});
				telemetry.track("User clicked header add variable button");
			},
			[ACTION_TYPES.SELF_HEALING]: (projectId) => {
				router.push({
					name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
					params: {
						projectId,
						configurationId: "new"
					}
				});
			},
			[ACTION_TYPES.AGENT]: (projectId, source) => {
				createAgent(source, projectId);
			},
			[ACTION_TYPES.APP]: (projectId) => {
				createApp(projectId);
			}
		};
		const sectionDescription = computed(() => {
			if (projectPages.isSharedSubPage) return i18n.baseText("projects.header.shared.subtitle");
			else if (projectPages.isOverviewSubPage) return i18n.baseText(settingsStore.isDataTableFeatureEnabled ? "projects.header.overview.subtitleWithDataTables" : "projects.header.overview.subtitle");
			else if (isPersonalProject.value) return i18n.baseText(settingsStore.isDataTableFeatureEnabled ? "projects.header.personal.subtitleWithDataTables" : "projects.header.personal.subtitle");
			return null;
		});
		const projectDescription = computed(() => {
			if (projectPages.isProjectsSubPage) return projectsStore.currentProject?.description;
			return null;
		});
		const favoriteIcon = computed(() => isProjectFavorited.value ? "star-filled" : "star");
		const projectHeaderRef = ref(null);
		const projectInfoRef = ref(null);
		const { width: projectInfoWidth } = useElementSize(projectInfoRef);
		const projectSubtitleFontSizeInPxs = ref(null);
		useResizeObserver(projectHeaderRef, () => {
			if (!projectHeaderRef.value) return;
			const projectSubtitleEl = projectHeaderRef.value.querySelector("span[data-test-id=\"project-subtitle\"]");
			if (projectSubtitleEl) {
				const computedStyle = window.getComputedStyle(projectSubtitleEl);
				projectSubtitleFontSizeInPxs.value = parseFloat(computedStyle.fontSize);
			}
		});
		const projectDescriptionTruncated = computed(() => {
			if (!projectDescription.value) return "";
			const fontSizeInPixels = projectSubtitleFontSizeInPxs.value ?? 14;
			return truncateTextToFitWidth(projectDescription.value, projectInfoWidth.value, fontSizeInPixels);
		});
		const onSelect = (action, source) => {
			const executableAction = actions[action];
			if (!homeProject.value) return;
			executableAction(homeProject.value.id, source);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createBaseVNode("div", {
					ref_key: "projectHeaderRef",
					ref: projectHeaderRef,
					class: normalizeClass(_ctx.$style.projectHeader)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.projectDetails) }, [showProjectIcon.value ? (openBlock(), createBlock(ProjectIcon_default, {
					key: 0,
					icon: headerIcon.value,
					"border-less": true,
					size: "medium"
				}, null, 8, ["icon"])) : createCommentVNode("", true), createBaseVNode("div", {
					ref_key: "projectInfoRef",
					ref: projectInfoRef,
					class: normalizeClass(_ctx.$style.projectInfo)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleRow) }, [
					projectName.value ? (openBlock(), createBlock(unref(N8nHeading_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.projectName),
						title: projectName.value,
						bold: "",
						tag: "h2",
						size: "xlarge",
						"data-test-id": "project-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(projectName.value), 1)]),
						_: 1
					}, 8, ["class", "title"])) : createCommentVNode("", true),
					isTeamProject.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
						key: 1,
						class: normalizeClass([_ctx.$style.favoriteBtn, isProjectFavorited.value && _ctx.$style.favoriteBtnActive]),
						icon: favoriteIcon.value,
						"aria-label": unref(i18n).baseText(isProjectFavorited.value ? "favorites.remove" : "favorites.add"),
						variant: "ghost",
						size: "medium",
						"data-test-id": "project-favorite-btn",
						onClick: withModifiers(onToggleProjectFavorite, ["stop"])
					}, null, 8, [
						"class",
						"icon",
						"aria-label"
					])) : createCommentVNode("", true),
					createVNode(unref(PromotionPreviewBadges), { class: normalizeClass(_ctx.$style.promotionBadges) }, null, 8, ["class"])
				], 2), sectionDescription.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-light",
					"data-test-id": "project-subtitle"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(sectionDescription.value), 1)]),
					_: 1
				})) : projectDescription.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.projectDescriptionWrapper)
				}, [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.descriptionText),
					color: "text-light",
					"data-test-id": "project-subtitle"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(projectDescriptionTruncated.value || projectDescription.value), 1)]),
					_: 1
				}, 8, ["class"]), projectDescriptionTruncated.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.tooltip)
				}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(projectDescription.value), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2)], 2), unref(route).name !== unref(VIEWS).PROJECT_SETTINGS ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.headerActions])
				}, [createVNode(unref(N8nTooltip_default), {
					disabled: !unref(sourceControlStore).preferences.branchReadOnly,
					content: unref(i18n).baseText("readOnlyEnv.cantAdd.any")
				}, {
					default: withCtx(() => [createBaseVNode("div", _hoisted_1, [createVNode(ReadyToRunButton_default, { "has-active-callouts": props.hasActiveCallouts }, null, 8, ["has-active-callouts"]), createVNode(ProjectCreateResource_default, {
						"data-test-id": "add-resource-buttons",
						actions: menu.value,
						variant: "brand",
						disabled: unref(sourceControlStore).preferences.branchReadOnly,
						onAction: _cache[1] || (_cache[1] = (action) => onSelect(action, "dropdown"))
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), mergeProps({ "data-test-id": `add-resource-${selectedMainButtonType.value}` }, mainButtonConfig.value, {
							size: "medium",
							variant: "brand",
							onClick: _cache[0] || (_cache[0] = ($event) => onSelect(selectedMainButtonType.value, "button"))
						}), null, 16, ["data-test-id"])]),
						_: 1
					}, 8, ["actions", "disabled"])])]),
					_: 1
				}, 8, ["disabled", "content"])], 2)) : createCommentVNode("", true)], 2),
				renderSlot(_ctx.$slots, "default"),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(ProjectTabs_default, {
					"page-type": pageType.value,
					"show-executions": !unref(projectPages).isSharedSubPage,
					"show-settings": showSettings.value,
					"additional-tabs": customProjectTabs.value
				}, null, 8, [
					"page-type",
					"show-executions",
					"show-settings",
					"additional-tabs"
				])], 2)
			]);
		};
	}
}), [["__cssModules", { "$style": {
	projectHeader: "_projectHeader_e1k9j_113",
	projectDetails: "_projectDetails_e1k9j_121",
	projectInfo: "_projectInfo_e1k9j_128",
	projectName: "_projectName_e1k9j_136",
	promotionBadges: "_promotionBadges_e1k9j_143",
	actions: "_actions_e1k9j_147",
	projectDescriptionWrapper: "_projectDescriptionWrapper_e1k9j_151",
	tooltip: "_tooltip_e1k9j_154",
	descriptionText: "_descriptionText_e1k9j_158",
	favoriteBtn: "_favoriteBtn_e1k9j_178",
	favoriteBtnActive: "_favoriteBtnActive_e1k9j_184",
	titleRow: "_titleRow_e1k9j_188",
	headerActions: "_headerActions_e1k9j_208"
} }]]);
//#endregion
export { ProjectHeader_default as t };
