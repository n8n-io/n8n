import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Au as useDocumentVisibility, Bd as createBlock, Bf as readonly, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, af as onBeforeMount, bd as I18nT, ef as inject, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, lo as defineStore, mf as renderList, of as onBeforeUnmount, xr as require_FileSaver_min, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, $M as DropdownMenu_default, $d as injectWorkflowDocumentStore, BC as ProjectTypes, Cd as useWorkflowHistoryStore, Dx as WORKFLOW_SHARE_MODAL_KEY, Ex as WORKFLOW_SETTINGS_MODAL_KEY, Ey as AutoSaveState, Fw as makeRestApiRequest, GA as DialogDescription_default, GS as EnterpriseEditionFeature, Gb as MAIN_HEADER_TABS, H as WORKFLOW_REVIEW_REQUESTS_VIEW, Hl as useExecutionsStore, Hu as nodeViewEventBus, JA as DialogHeader_default, Jg as useUIStore, Ju as useWorkflowSaving, KA as Dialog_default, Kb as WORKFLOW_HISTORY_PUBLISH_TIMELINE_TAB, Kc as useUnusableWorkflowCredentials, Kd as useDocumentTitle, Ky as TIME_SAVED_DOCS_URL, Lm as getActivatableTriggerNodes, Lp as useWorkflowId, Ly as ERROR_WORKFLOW_DOCS_URL, Mw as ResponseError, Nj as N8nPopover_default, Od as useWorkflowsStore, Ox as WORKFLOW_DESCRIPTION_MODAL_KEY, P as formatUserDisplayName, PA as useMessage, Qt as MCP_DOCS_PAGE_URL, Qx as LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN, Rk as jsonParse, Ry as EVALUATIONS_DOCS_URL, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Sx as WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY, Td as useEmptyCanvasGroupsFlag, Tx as WORKFLOW_PUBLISH_MODAL_KEY, UA as DialogFooter_default, Uc as useWorkflowReviewsFeature, Ur as useInjectWorkflowId, WA as DialogBody_default, Wp as useWorkflowsListStore, XM as N8nActionDropdown_default, Xc as usePushConnectionStore, Xd as createWorkflowDocumentId, Xx as LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN, Yc as useCollaborationStore, Zx as LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, aC as WORKFLOW_MENU_ACTIONS, aj as N8nUserStack_default, bC as useRootStore, bN as N8nSpinner_default, bm as useSourceControlStore, cN as Input_default, dC as useToast, dM as N8nSwitch_default, eN as DropdownMenuItem_default, en as MCP_SETTINGS_VIEW, fC as VIEWS, fN as N8nTooltip_default, ff as useEvaluationStore, gM as N8nInputLabel_default, hC as useTelemetry, hM as N8nLink_default, hS as WorkflowDocumentStoreKey, ij as N8nUserSelect_default, ip as describeRestrictedNodeTypes, jM as createEventBus, jN as useI18n, kj as N8nSegmentControl_default, lm as ResourceType, m as router, nD as getResourcePermissions, nN as N8nBadge_default, nd as useWorkflowSaveStore, nf as useWorkflowDocumentStore, np as collectRestrictedNodeTypes, oc as useFoldersStore, p as telemetry, qA as DialogTitle_default, qn as useDocumentVisibility$1, qp as injectNDVStoreIfProvided, rn as usePromotionsEnabled, sx as IMPORT_WORKFLOW_URL_MODAL_KEY, tx as DUPLICATE_MODAL_KEY, uf as useNodeTypesStore, vN as N8nIconButton_default, vm as useProjectsStore, vx as WORKFLOW_ACTIVE_MODAL_KEY, wd as removeEmptyCanvasGroupsFromWorkflowData, wx as WORKFLOW_HISTORY_VERSION_UNPUBLISH, xN as N8nIcon_default, xj as SuggestedActions_default, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default, ym as useFavoritesStore, yu as TimeAgo_default, z as REVIEW_INBOX_QUERY_PARAM, zp as useTagsStore } from "./app-D5flEmb-.js";
import { t as useKeybindings } from "./useKeybindings-DShLgy_J.js";
import { t as usePushConnection } from "./usePushConnection-B4aIEl0f.js";
import { t as FolderBreadcrumbs_default } from "./FolderBreadcrumbs-tX3qg09J.js";
import { t as ConnectionTracker_default } from "./ConnectionTracker-D5iqGAKh.js";
import { t as useWorkflowEvaluationState } from "./useWorkflowEvaluationState-C2nc66cR.js";
import { t as useMoveResourceToProjectToast } from "./useMoveResourceToProjectToast-oUxtNKaR.js";
import { t as useMcpJsonNudgeTrigger } from "./useMcpJsonNudgeTrigger-C-LrcTdt.js";
import { t as useDependencies } from "./useDependencies-C0z0nXRY.js";
import { t as useDependencyMenu } from "./useDependencyMenu-CpPxGA6t.js";
import { n as getVersionLabel, t as generateVersionLabelFromId } from "./useWorkflowVersionLabel-cYv19BC7.js";
import { r as getLastPublishedVersion } from "./utils-BtEtrbw8.js";
import { t as useWorkflowActivate } from "./useWorkflowActivate-DR1rBXaN.js";
import { t as CharacterCount_default } from "./CharacterCount-LwZS4Nnd.js";
import { t as WorkflowVersionForm_default } from "./WorkflowVersionForm-irlaPXZc.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import "./usePushConnection-wBo-ZJFz.js";
//#region src/app/components/MainHeader/TabBar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TabBar_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "TabBar",
	props: {
		items: {},
		modelValue: { default: MAIN_HEADER_TABS.WORKFLOW },
		floating: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		function onUpdateModelValue(tab, event) {
			emit("update:modelValue", tab, event);
		}
		return (_ctx, _cache) => {
			return __props.items ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass({
					[_ctx.$style.container]: true,
					[_ctx.$style.floating]: __props.floating,
					["tab-bar-container"]: true
				})
			}, [createVNode(unref(N8nSegmentControl_default), {
				"model-value": __props.modelValue,
				options: __props.items,
				"onUpdate:modelValue": onUpdateModelValue
			}, null, 8, ["model-value", "options"])], 2)) : createCommentVNode("", true);
		};
	}
});
var TabBar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(TabBar_vue_vue_type_script_setup_true_lang_default, [["__cssModules", { "$style": {
	container: "_container_q7lw5_1",
	floating: "_floating_q7lw5_12"
} }]]);
//#endregion
//#region src/app/plugins/cache.ts
async function indexedDbCache(dbName, storeName) {
	let cache = {};
	await loadCache();
	async function loadCache() {
		await transaction("readonly", async (store, db) => {
			return await new Promise((resolve, reject) => {
				const request = store.openCursor();
				request.onsuccess = (event) => {
					const cursor = event.target.result;
					if (cursor) {
						cache[cursor.key] = cursor.value.value;
						cursor.continue();
					} else {
						db.close();
						resolve();
					}
				};
				request.onerror = (event) => {
					db.close();
					reject(event);
				};
			});
		});
	}
	async function openDb() {
		return await new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, 1);
			request.onupgradeneeded = () => {
				request.result.createObjectStore(storeName, { keyPath: "key" });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
	function setItem(key, value) {
		cache[key] = value;
		persistToIndexedDB(key, value);
	}
	function getItem(key) {
		return cache[key] ?? null;
	}
	function removeItem(key) {
		delete cache[key];
		deleteFromIndexedDB(key);
	}
	function clear() {
		cache = {};
		clearIndexedDB();
	}
	async function getAllWithPrefix(prefix) {
		const keyRange = IDBKeyRange.bound(prefix, prefix + "￿", false, false);
		const results = {};
		return await transaction("readonly", async (store) => {
			return await new Promise((resolve, reject) => {
				const request = store.openCursor(keyRange);
				request.onsuccess = (event) => {
					const cursor = event.target.result;
					if (cursor) {
						results[cursor.key] = cursor.value.value;
						cursor.continue();
					} else resolve(results);
				};
				request.onerror = () => {
					reject(request.error);
				};
			});
		});
	}
	async function transaction(mode, action) {
		const db = await openDb();
		const tx = db.transaction(storeName, mode);
		const result = await action(tx.objectStore(storeName), db);
		return await new Promise((resolve, reject) => {
			tx.oncomplete = () => {
				db.close();
				resolve(result);
			};
			tx.onerror = () => {
				db.close();
				reject(tx.error);
			};
		});
	}
	async function persistToIndexedDB(key, value) {
		await transaction("readwrite", (store) => {
			store.put({
				key,
				value
			});
		});
	}
	async function deleteFromIndexedDB(key) {
		await transaction("readwrite", (store) => {
			store.delete(key);
		});
	}
	async function clearIndexedDB() {
		await transaction("readwrite", (store) => {
			store.clear();
		});
	}
	return {
		getItem,
		removeItem,
		setItem,
		clear,
		getAllWithPrefix
	};
}
//#endregion
//#region src/app/composables/useWorkflowsCache.ts
init_reactivity_esm_bundler();
var actionTypes = [
	"evaluations",
	"errorWorkflow",
	"timeSaved",
	"workflow-mcp-access",
	"instance-mcp-access"
];
function useWorkflowSettingsCache() {
	const isCacheLoading = ref(true);
	const cachePromise = ref(indexedDbCache("n8n-local", "workflows").finally(() => {
		isCacheLoading.value = false;
	}));
	async function getWorkflowsCache() {
		return await cachePromise.value;
	}
	async function getWorkflowSettings(workflowId) {
		const cache = await getWorkflowsCache();
		return jsonParse(cache.getItem(workflowId) ?? "", { fallbackValue: {} });
	}
	async function getMergedWorkflowSettings(workflowId) {
		const workflowSettings = await getWorkflowSettings(workflowId);
		const cache = await getWorkflowsCache();
		const globalPreferences = jsonParse(cache.getItem("*") ?? "", { fallbackValue: {} });
		workflowSettings.suggestedActions = {
			...workflowSettings.suggestedActions ?? {},
			...globalPreferences.suggestedActions ?? {}
		};
		return workflowSettings;
	}
	async function upsertWorkflowSettings(workflowId, updates) {
		const cache = await getWorkflowsCache();
		const existingSettings = await getWorkflowSettings(workflowId);
		const updatedSettings = {
			...existingSettings,
			...updates
		};
		if (existingSettings.suggestedActions || updates.suggestedActions) updatedSettings.suggestedActions = {
			...existingSettings.suggestedActions ?? {},
			...updates.suggestedActions
		};
		cache.setItem(workflowId, JSON.stringify(updatedSettings));
	}
	async function updateFirstActivatedAt(workflowId) {
		if (!(await getWorkflowSettings(workflowId))?.firstActivatedAt) await upsertWorkflowSettings(workflowId, { firstActivatedAt: Date.now() });
	}
	async function ignoreSuggestedAction(workflowId, action) {
		await upsertWorkflowSettings(workflowId, { suggestedActions: { [action]: { ignored: true } } });
	}
	async function getEvaluationPreferences(workflowId) {
		return (await getWorkflowSettings(workflowId))?.evaluationRuns ?? {
			order: [],
			visibility: {}
		};
	}
	async function saveEvaluationPreferences(workflowId, evaluationRuns) {
		await upsertWorkflowSettings(workflowId, { evaluationRuns });
	}
	async function ignoreAllSuggestedActionsForAllWorkflows(actionsToIgnore) {
		await upsertWorkflowSettings("*", actionsToIgnore.reduce((accu, key) => {
			accu.suggestedActions = accu.suggestedActions ?? {};
			accu.suggestedActions[key] = { ignored: true };
			return accu;
		}, {}));
	}
	return {
		getWorkflowSettings,
		getMergedWorkflowSettings,
		upsertWorkflowSettings,
		updateFirstActivatedAt,
		ignoreSuggestedAction,
		ignoreAllSuggestedActionsForAllWorkflows,
		getEvaluationPreferences,
		saveEvaluationPreferences,
		isCacheLoading
	};
}
//#endregion
//#region src/app/components/WorkflowProductionChecklist.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/app/components/WorkflowProductionChecklist.vue
var WorkflowProductionChecklist_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowProductionChecklist",
	props: { hideTrigger: { type: Boolean } },
	setup(__props, { expose: __expose }) {
		const i18n = useI18n();
		const router = useRouter();
		const evaluationStore = useEvaluationStore();
		const evaluationState = useWorkflowEvaluationState();
		const nodeTypesStore = useNodeTypesStore();
		const workflowsCache = useWorkflowSettingsCache();
		const uiStore = useUIStore();
		const message = useMessage();
		const telemetry = useTelemetry();
		const sourceControlStore = useSourceControlStore();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);
		const isPopoverOpen = ref(false);
		const cachedSettings = ref(null);
		const nodes = computed(() => workflowDocumentStore?.value?.allNodes ?? []);
		const hasAINode = computed(() => {
			return nodes.value.some((node) => {
				return nodeTypesStore.getNodeType(node.type, node.typeVersion)?.codex?.categories?.includes("AI");
			});
		});
		const hasEvaluationSetOutputsNode = computed(() => {
			return evaluationState.evaluationSetOutputsNodeExist.value;
		});
		const hasErrorWorkflow = computed(() => {
			return !!workflowDocumentStore?.value?.settings?.errorWorkflow;
		});
		const isErrorWorkflow = computed(() => {
			return nodes.value.some((node) => node.type === "n8n-nodes-base.errorTrigger" && node.disabled !== true);
		});
		const hasSavedTimeNodes = computed(() => {
			return nodes.value.some((node) => node.type === "n8n-nodes-base.timeSaved" && node.disabled !== true);
		});
		const hasTimeSaved = computed(() => {
			return workflowDocumentStore?.value?.settings?.timeSavedPerExecution !== void 0 || hasSavedTimeNodes.value;
		});
		const isActivationModalOpen = computed(() => {
			return uiStore.isModalActiveById[WORKFLOW_ACTIVE_MODAL_KEY];
		});
		const isAnyModalOpen = computed(() => uiStore.isAnyModalOpen);
		const isProtectedEnvironment = computed(() => {
			return sourceControlStore.preferences.branchReadOnly;
		});
		const isOwner = computed(() => usersStore.isInstanceOwner);
		const isAdmin = computed(() => usersStore.isAdmin);
		const isMcpModuleEnabled = computed(() => {
			return settingsStore.isModuleActive("mcp");
		});
		const isMcpAccessEnabled = computed(() => {
			return settingsStore.moduleSettings.mcp?.mcpAccessEnabled ?? false;
		});
		const canToggleInstanceMCPAccess = computed(() => isOwner.value || isAdmin.value);
		const availableActions = computed(() => {
			if (workflowsCache.isCacheLoading.value) return [];
			const hasPublishedVersion = !!workflowDocumentStore?.value?.activeVersionId;
			const actions = [];
			const suggestedActionSettings = cachedSettings.value?.suggestedActions ?? {};
			if (hasPublishedVersion && !isErrorWorkflow.value && !suggestedActionSettings.errorWorkflow?.ignored) actions.push({
				id: "errorWorkflow",
				title: i18n.baseText("workflowProductionChecklist.errorWorkflow.title"),
				description: i18n.baseText("workflowProductionChecklist.errorWorkflow.description"),
				moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
				completed: hasErrorWorkflow.value
			});
			if (hasPublishedVersion && hasAINode.value && evaluationStore.isEvaluationEnabled && !suggestedActionSettings.evaluations?.ignored) actions.push({
				id: "evaluations",
				title: i18n.baseText("workflowProductionChecklist.evaluations.title"),
				description: i18n.baseText("workflowProductionChecklist.evaluations.description"),
				moreInfoLink: EVALUATIONS_DOCS_URL,
				completed: hasEvaluationSetOutputsNode.value
			});
			if (hasPublishedVersion && !suggestedActionSettings.timeSaved?.ignored) actions.push({
				id: "timeSaved",
				title: i18n.baseText("workflowProductionChecklist.timeSaved.title"),
				description: i18n.baseText("workflowProductionChecklist.timeSaved.description"),
				moreInfoLink: TIME_SAVED_DOCS_URL,
				completed: hasTimeSaved.value
			});
			const mcpAction = getMcpAction();
			if (mcpAction) actions.push(mcpAction);
			return actions;
			function getMcpAction() {
				if (!isMcpModuleEnabled.value) return null;
				const baseAction = {
					title: i18n.baseText("mcp.productionChecklist.title"),
					moreInfoLink: MCP_DOCS_PAGE_URL
				};
				if (!isMcpAccessEnabled.value) {
					if (!canToggleInstanceMCPAccess.value || suggestedActionSettings["instance-mcp-access"]?.ignored) return null;
					return {
						...baseAction,
						id: "instance-mcp-access",
						description: i18n.baseText("mcp.productionChecklist.instance.description"),
						completed: false
					};
				}
				if (suggestedActionSettings["workflow-mcp-access"]?.ignored) return null;
				return {
					...baseAction,
					id: "workflow-mcp-access",
					description: i18n.baseText("mcp.productionChecklist.workflow.description"),
					completed: workflowDocumentStore?.value?.settings?.availableInMCP ?? false
				};
			}
		});
		async function loadWorkflowSettings() {
			if (workflowDocumentStore?.value?.workflowId) cachedSettings.value = await workflowsCache.getMergedWorkflowSettings(workflowDocumentStore?.value.workflowId);
		}
		async function handleActionClick(actionId) {
			switch (actionId) {
				case "evaluations":
					await router.push({
						name: VIEWS.EVALUATION_EDIT,
						params: { workflowId: workflowDocumentStore?.value?.workflowId }
					});
					break;
				case "errorWorkflow":
				case "timeSaved":
				case "workflow-mcp-access":
					uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
					break;
				case "instance-mcp-access": await router.push({ name: MCP_SETTINGS_VIEW });
			}
			isPopoverOpen.value = false;
		}
		function isValidAction(action) {
			return actionTypes.some((type) => type === action);
		}
		async function handleIgnoreClick(actionId) {
			if (!isValidAction(actionId)) return;
			await workflowsCache.ignoreSuggestedAction(workflowDocumentStore?.value?.workflowId ?? "", actionId);
			await loadWorkflowSettings();
			telemetry.track("user clicked ignore suggested action", { actionId });
		}
		async function handleIgnoreAll() {
			if (await message.confirm(i18n.baseText("workflowProductionChecklist.ignoreAllConfirmation.description"), i18n.baseText("workflowProductionChecklist.ignoreAllConfirmation.title"), { confirmButtonText: i18n.baseText("workflowProductionChecklist.ignoreAllConfirmation.confirm") }) === "confirm") {
				await workflowsCache.ignoreAllSuggestedActionsForAllWorkflows([...actionTypes]);
				await loadWorkflowSettings();
				telemetry.track("user clicked ignore suggested actions for all workflows");
			}
		}
		function openSuggestedActions() {
			isPopoverOpen.value = true;
		}
		function onPopoverOpened() {
			telemetry.track("user opened suggested actions checklist");
		}
		function handlePopoverOpenChange(open) {
			if (open) {
				isPopoverOpen.value = true;
				onPopoverOpened();
			} else if (!isActivationModalOpen.value) isPopoverOpen.value = false;
		}
		const isConfirmedActive = computed(() => {
			if (!workflowDocumentStore?.value?.activeVersionId) return false;
			if (settingsStore.isWorkflowPublicationServiceEnabled) return workflowDocumentStore.value.publicationStatus === "published";
			return true;
		});
		watch(isConfirmedActive, async (isActive, wasActive) => {
			if (isActive && !wasActive) {
				const workflowId = workflowDocumentStore?.value?.workflowId ?? "";
				const { firstActivatedAt } = await workflowsCache.getWorkflowSettings(workflowId);
				if (!firstActivatedAt) {
					if (isAnyModalOpen.value) {
						const stop = watch(isAnyModalOpen, (isOpen) => {
							if (!isOpen) {
								stop();
								openSuggestedActions();
							}
						});
					} else setTimeout(() => {
						openSuggestedActions();
					}, 0);
				}
				await workflowsCache.updateFirstActivatedAt(workflowId);
			}
		});
		onMounted(async () => {
			await loadWorkflowSettings();
		});
		__expose({
			open: openSuggestedActions,
			hasActions: computed(() => availableActions.value.length > 0)
		});
		return (_ctx, _cache) => {
			return availableActions.value.length > 0 ? (openBlock(), createBlock(unref(SuggestedActions_default), {
				key: 0,
				open: isPopoverOpen.value,
				"hide-trigger": __props.hideTrigger,
				title: unref(i18n).baseText("workflowProductionChecklist.title"),
				actions: availableActions.value,
				"ignore-all-label": unref(i18n).baseText("workflowProductionChecklist.turnOffWorkflowSuggestions"),
				notice: isProtectedEnvironment.value ? unref(i18n).baseText("workflowProductionChecklist.readOnlyNotice") : "",
				"popover-alignment": "start",
				"popover-side-offset": 0,
				onActionClick: handleActionClick,
				onIgnoreClick: handleIgnoreClick,
				onIgnoreAll: handleIgnoreAll,
				"onUpdate:open": handlePopoverOpenChange
			}, null, 8, [
				"open",
				"hide-trigger",
				"title",
				"actions",
				"ignore-all-label",
				"notice"
			])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region ../../@n8n/utils/src/files/sanitize-filename.ts
var INVALID_CHARS_REGEX = /[<>:"/\\|?*\u0000-\u001F\u007F-\u009F]/g;
var ZERO_WIDTH_CHARS_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g;
var UNICODE_SPACES_REGEX = /[\u00A0\u2000-\u200A]/g;
var LEADING_TRAILING_DOTS_SPACES_REGEX = /^[\s.]+|[\s.]+$/g;
var WINDOWS_RESERVED_NAMES = /* @__PURE__ */ new Set([
	"CON",
	"PRN",
	"AUX",
	"NUL",
	"COM1",
	"COM2",
	"COM3",
	"COM4",
	"COM5",
	"COM6",
	"COM7",
	"COM8",
	"COM9",
	"LPT1",
	"LPT2",
	"LPT3",
	"LPT4",
	"LPT5",
	"LPT6",
	"LPT7",
	"LPT8",
	"LPT9"
]);
var DEFAULT_FALLBACK_NAME = "untitled";
var MAX_FILENAME_LENGTH = 200;
/**
* Sanitizes a filename to be compatible with Mac, Linux, and Windows file systems
*
* Main features:
* - Replace invalid characters (e.g. ":" in hello:world)
* - Handle Windows reserved names
* - Limit filename length
* - Normalize Unicode characters
*
* @param filename - The filename to sanitize (without extension)
* @param maxLength - Maximum filename length (default: 200)
* @returns A sanitized filename (without extension)
*
* @example
* sanitizeFilename('hello:world') // returns 'hello_world'
* sanitizeFilename('CON') // returns '_CON'
* sanitizeFilename('') // returns 'untitled'
*/
var sanitizeFilename = (filename, maxLength = MAX_FILENAME_LENGTH) => {
	if (!filename) return DEFAULT_FALLBACK_NAME;
	let baseName = filename.trim().replace(INVALID_CHARS_REGEX, "_").replace(ZERO_WIDTH_CHARS_REGEX, "").replace(UNICODE_SPACES_REGEX, " ").replace(LEADING_TRAILING_DOTS_SPACES_REGEX, "");
	if (!baseName) baseName = DEFAULT_FALLBACK_NAME;
	if (WINDOWS_RESERVED_NAMES.has(baseName.toUpperCase())) baseName = `_${baseName}`;
	if (baseName.length > maxLength) baseName = baseName.slice(0, maxLength);
	return baseName;
};
//#endregion
//#region src/app/components/MainHeader/utils.ts
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min(), 1);
var getWorkflowId = (propId, routeName) => {
	return propId ?? (typeof routeName === "string" ? routeName : void 0);
};
//#endregion
//#region src/app/components/MainHeader/ActionsDropdownMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var ActionsDropdownMenu_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ActionsDropdownMenu",
	props: {
		workflowPermissions: {},
		isNewWorkflow: { type: Boolean },
		isArchived: { type: Boolean },
		id: {},
		name: {},
		tags: {},
		currentFolder: {}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const importFileRef = ref();
		const productionChecklistRef = useTemplateRef("productionChecklist");
		const toast = useToast();
		const locale = useI18n();
		const route = useRoute();
		const projectsStore = useProjectsStore();
		const sourceControlStore = useSourceControlStore();
		const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();
		const collaborationStore = useCollaborationStore();
		const workflowsListStore = useWorkflowsListStore();
		const uiStore = useUIStore();
		const $style = useCssModule();
		const rootStore = useRootStore();
		const tagsStore = useTagsStore();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const moveWorkflowEventBus = createEventBus();
		const { showMoveToProjectToast } = useMoveResourceToProjectToast();
		const workflowTelemetry = useTelemetry();
		const favoritesStore = useFavoritesStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const mcpJsonNudgeTrigger = useMcpJsonNudgeTrigger();
		const { getDependencies, fetchDependencies, fetchDependencyCounts, hasDependencies } = useDependencies();
		const { buildDependencyMenuItems, resolveDependencyMenuId, openDependency } = useDependencyMenu();
		const emptyCanvasGroupsEnabled = useEmptyCanvasGroupsFlag();
		watch(() => props.id, (id) => {
			if (!id || props.isNewWorkflow) return;
			fetchDependencyCounts([id], "workflow");
		}, { immediate: true });
		const dependencyMenuChildren = computed(() => {
			const result = getDependencies(props.id, "workflow");
			const items = buildDependencyMenuItems(result?.dependencies ?? []);
			if (result && result.inaccessibleCount > 0) items.push({
				id: "dependency-inaccessible",
				label: locale.baseText("workflows.dependencies.hiddenNotice", {
					adjustToNumber: result.inaccessibleCount,
					interpolate: { count: String(result.inaccessibleCount) }
				}),
				disabled: true,
				divided: items.length > 0
			});
			if (items.length === 0) items.push({
				id: "dependency-loading",
				label: locale.baseText("generic.loading"),
				disabled: true
			});
			return items;
		});
		const onExecutionsTab = computed(() => {
			return [
				VIEWS.EXECUTION_HOME.toString(),
				VIEWS.WORKFLOW_EXECUTIONS.toString(),
				VIEWS.EXECUTION_PREVIEW
			].includes(route.name || "");
		});
		const collaborationReadOnly = computed(() => collaborationStore.shouldBeReadOnly);
		const isSharingEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]);
		function addWorkflowMenuTestIds(item) {
			return {
				...item,
				testId: `workflow-menu-item-${item.id}`,
				class: [item.class, item.disabled ? "disabled" : void 0],
				children: item.children?.map(addWorkflowMenuTestIds)
			};
		}
		function handleFileImport() {
			const inputRef = importFileRef.value;
			if (inputRef?.files && inputRef.files.length !== 0) {
				const reader = new FileReader();
				reader.onload = () => {
					let workflowData;
					try {
						workflowData = JSON.parse(reader.result);
					} catch (error) {
						toast.showMessage({
							title: locale.baseText("mainSidebar.showMessage.handleFileImport.title"),
							message: locale.baseText("mainSidebar.showMessage.handleFileImport.message"),
							type: "error"
						});
						return;
					} finally {
						reader.onload = null;
						inputRef.value = "";
					}
					mcpJsonNudgeTrigger.gate("import_file", () => nodeViewEventBus.emit("importWorkflowData", {
						data: workflowData,
						warnRestrictedNodes: true
					}));
				};
				reader.readAsText(inputRef.files[0]);
			}
		}
		const workflowMenuItems = computed(() => {
			const canEdit = props.workflowPermissions.update === true && !collaborationReadOnly.value && !props.isArchived && !sourceControlStore.preferences.branchReadOnly || props.isNewWorkflow;
			const nameAndMetadata = [];
			if (!collaborationReadOnly.value && !props.isArchived && !sourceControlStore.preferences.branchReadOnly) nameAndMetadata.push({
				id: WORKFLOW_MENU_ACTIONS.RENAME,
				label: locale.baseText("generic.rename"),
				icon: {
					type: "icon",
					value: "pencil"
				},
				disabled: props.workflowPermissions.update !== true,
				suppressCloseAutoFocus: true
			});
			if (canEdit) nameAndMetadata.push({
				id: WORKFLOW_MENU_ACTIONS.EDIT_DESCRIPTION,
				label: locale.baseText("menuActions.editDescriptionAndTags"),
				icon: {
					type: "icon",
					value: "tags"
				},
				disabled: !props.id
			});
			nameAndMetadata.push({
				id: WORKFLOW_MENU_ACTIONS.FAVORITE,
				label: favoritesStore.isFavorite(props.id, "workflow") ? locale.baseText("favorites.remove") : locale.baseText("favorites.add"),
				icon: {
					type: "icon",
					value: "star"
				},
				disabled: props.isNewWorkflow
			});
			if (!props.isNewWorkflow && hasDependencies(props.id, "workflow")) nameAndMetadata.push({
				id: WORKFLOW_MENU_ACTIONS.DEPENDENCIES,
				label: locale.baseText("menuActions.dependencies"),
				icon: {
					type: "icon",
					value: "graph"
				},
				children: dependencyMenuChildren.value
			});
			const organization = [];
			if (props.workflowPermissions.move && projectsStore.isTeamProjectFeatureEnabled) organization.push({
				id: WORKFLOW_MENU_ACTIONS.CHANGE_OWNER,
				label: locale.baseText("workflows.item.changeOwner"),
				icon: {
					type: "icon",
					value: "corner-down-right"
				},
				disabled: props.isNewWorkflow
			});
			if (canEdit) organization.push({
				id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
				label: locale.baseText("menuActions.duplicate"),
				icon: {
					type: "icon",
					value: "copy"
				},
				disabled: !props.id
			});
			if (isSharingEnabled.value && props.workflowPermissions.share) organization.push({
				id: WORKFLOW_MENU_ACTIONS.SHARE,
				label: locale.baseText("workflowDetails.share"),
				icon: {
					type: "icon",
					value: "share"
				}
			});
			const importExport = [{
				id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
				label: locale.baseText("menuActions.exportJson"),
				icon: {
					type: "icon",
					value: "arrow-block-up"
				}
			}];
			if (canEdit) importExport.push({
				id: WORKFLOW_MENU_ACTIONS.IMPORT,
				label: locale.baseText("menuActions.import"),
				icon: {
					type: "icon",
					value: "arrow-block-down"
				},
				disabled: onExecutionsTab.value,
				children: [{
					id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL,
					label: locale.baseText("menuActions.importFromUrl"),
					icon: {
						type: "icon",
						value: "link"
					},
					disabled: onExecutionsTab.value
				}, {
					id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE,
					label: locale.baseText("menuActions.importFromFile"),
					icon: {
						type: "icon",
						value: "file"
					},
					disabled: onExecutionsTab.value
				}]
			});
			if (!isPromotionsEnabled.value && hasPermission(["rbac"], { rbac: { scope: "sourceControl:push" } })) importExport.push({
				id: WORKFLOW_MENU_ACTIONS.PUSH,
				label: locale.baseText("menuActions.push"),
				icon: {
					type: "icon",
					value: "git-branch"
				},
				disabled: !sourceControlStore.isEnterpriseSourceControlEnabled || onExecutionsTab.value || sourceControlStore.preferences.branchReadOnly
			});
			const workflowTools = [{
				id: WORKFLOW_MENU_ACTIONS.VERSION_HISTORY,
				label: locale.baseText("menuActions.versionHistory"),
				icon: {
					type: "icon",
					value: "history"
				},
				disabled: props.isNewWorkflow
			}, {
				id: WORKFLOW_MENU_ACTIONS.SETTINGS,
				label: locale.baseText("generic.settings"),
				icon: {
					type: "icon",
					value: "settings"
				},
				disabled: props.isNewWorkflow
			}];
			if (!props.isNewWorkflow && productionChecklistRef.value?.hasActions) workflowTools.push({
				id: WORKFLOW_MENU_ACTIONS.PRODUCTION_CHECKLIST,
				label: locale.baseText("menuActions.productionChecklist"),
				icon: {
					type: "icon",
					value: "list-checks"
				},
				suppressCloseAutoFocus: true
			});
			const lifecycle = [];
			if (props.workflowPermissions.delete === true && !collaborationReadOnly.value && !sourceControlStore.preferences.branchReadOnly || props.isNewWorkflow) {
				if (props.isArchived) {
					lifecycle.push({
						id: WORKFLOW_MENU_ACTIONS.UNARCHIVE,
						label: locale.baseText("menuActions.unarchive"),
						icon: {
							type: "icon",
							value: "archive-restore"
						},
						disabled: props.isNewWorkflow
					});
					lifecycle.push({
						id: WORKFLOW_MENU_ACTIONS.DELETE,
						label: locale.baseText("menuActions.delete"),
						icon: {
							type: "icon",
							value: "trash-2"
						},
						disabled: props.isNewWorkflow,
						destructive: true
					});
				} else lifecycle.push({
					id: WORKFLOW_MENU_ACTIONS.ARCHIVE,
					label: locale.baseText("menuActions.archive"),
					icon: {
						type: "icon",
						value: "archive"
					},
					disabled: props.isNewWorkflow,
					destructive: true
				});
			}
			return [
				nameAndMetadata,
				organization,
				importExport,
				workflowTools,
				lifecycle
			].filter((group) => group.length > 0).flatMap((group, index) => index === 0 ? group : group.map((item, i) => i === 0 ? {
				...item,
				divided: true
			} : item)).map(addWorkflowMenuTestIds);
		});
		function openDescriptionAndTagsModal() {
			const workflowId = getWorkflowId(props.id, route.params.workflowId);
			if (!workflowId) return;
			const workflowDescription = workflowDocumentStore?.value?.description ?? workflowsListStore.getWorkflowById(workflowId)?.description;
			uiStore.openModalWithData({
				name: WORKFLOW_DESCRIPTION_MODAL_KEY,
				data: {
					workflowId,
					workflowName: props.name,
					workflowDescription,
					workflowTags: [...props.tags],
					isNewWorkflow: props.isNewWorkflow
				}
			});
		}
		function onWorkflowMenuToggle(open) {
			if (!open || !props.id || props.isNewWorkflow) return;
			fetchDependencies([props.id], "workflow");
		}
		async function onWorkflowMenuSelect(action) {
			const dependency = resolveDependencyMenuId(getDependencies(props.id, "workflow")?.dependencies ?? [], action);
			if (dependency) {
				workflowTelemetry.track("User clicked dependency pill item", {
					source: "workflow_menu",
					dependency_type: dependency.type
				});
				openDependency(dependency);
				return;
			}
			switch (action) {
				case WORKFLOW_MENU_ACTIONS.EDIT_DESCRIPTION:
					openDescriptionAndTagsModal();
					break;
				case WORKFLOW_MENU_ACTIONS.DUPLICATE:
					uiStore.openModalWithData({
						name: DUPLICATE_MODAL_KEY,
						data: {
							id: props.id,
							name: props.name,
							tags: props.tags,
							parentFolderId: props.currentFolder?.id
						}
					});
					break;
				case WORKFLOW_MENU_ACTIONS.RENAME:
					nodeViewEventBus.emit("renameWorkflow");
					break;
				case WORKFLOW_MENU_ACTIONS.PRODUCTION_CHECKLIST:
					requestAnimationFrame(() => productionChecklistRef.value?.open());
					break;
				case WORKFLOW_MENU_ACTIONS.VERSION_HISTORY:
					router.push({
						name: VIEWS.WORKFLOW_HISTORY,
						params: { workflowId: props.id }
					});
					break;
				case WORKFLOW_MENU_ACTIONS.DOWNLOAD: {
					if (!workflowDocumentStore?.value) throw new Error("Cannot download workflow: workflow document store is unavailable");
					const workflowData = workflowDocumentStore.value.serialize();
					const { tags, ...data } = workflowData;
					const exportData = {
						...data,
						meta: {
							...data.meta,
							instanceId: rootStore.instanceId
						},
						tags: (tags ?? []).map((tagId) => {
							const { usageCount, ...tag } = tagsStore.tagsById[tagId];
							return tag;
						})
					};
					if (!emptyCanvasGroupsEnabled.value) removeEmptyCanvasGroupsFromWorkflowData(exportData);
					const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json;charset=utf-8" });
					let name = props.name || "unsaved_workflow";
					name = sanitizeFilename(name);
					await mcpJsonNudgeTrigger.gate("export", () => {
						telemetry.track("User exported workflow", { workflow_id: workflowData.id });
						(0, import_FileSaver_min.default)(blob, name + ".json");
					});
					break;
				}
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL:
					uiStore.openModal(IMPORT_WORKFLOW_URL_MODAL_KEY);
					break;
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE:
					nodeViewEventBus.emit("importWorkflowFromFile");
					break;
				case WORKFLOW_MENU_ACTIONS.PUSH:
					try {
						router.push({ query: {
							...route.query,
							sourceControl: "push"
						} });
					} catch (error) {
						switch (error.message) {
							case "source_control_not_connected":
								toast.showError({
									...error,
									message: ""
								}, locale.baseText("settings.sourceControl.error.not.connected.title"), { message: locale.baseText("settings.sourceControl.error.not.connected.message") });
								break;
							default: toast.showError(error, locale.baseText("error"));
						}
					}
					break;
				case WORKFLOW_MENU_ACTIONS.SETTINGS:
					uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
					break;
				case WORKFLOW_MENU_ACTIONS.SHARE:
					uiStore.openModalWithData({
						name: WORKFLOW_SHARE_MODAL_KEY,
						data: { id: props.id }
					});
					workflowTelemetry.track("User opened sharing modal", {
						workflow_id: props.id,
						user_id_sharer: usersStore.currentUser?.id,
						sub_view: route.name === VIEWS.WORKFLOWS ? "Workflows listing" : "Workflow editor"
					});
					break;
				case WORKFLOW_MENU_ACTIONS.ARCHIVE:
					nodeViewEventBus.emit("archiveWorkflow");
					break;
				case WORKFLOW_MENU_ACTIONS.UNARCHIVE:
					nodeViewEventBus.emit("unarchiveWorkflow");
					break;
				case WORKFLOW_MENU_ACTIONS.DELETE:
					nodeViewEventBus.emit("deleteWorkflow");
					break;
				case WORKFLOW_MENU_ACTIONS.FAVORITE:
					await favoritesStore.toggleFavorite(props.id, "workflow");
					break;
				case WORKFLOW_MENU_ACTIONS.CHANGE_OWNER: {
					const workflowId = getWorkflowId(props.id, route.params.workflowId);
					if (!workflowId) return;
					const workflow = workflowsListStore.workflowsById[workflowId];
					const navigateAway = async () => await router.push({ name: VIEWS.WORKFLOWS });
					moveWorkflowEventBus.once("workflow-transferred", async (event) => {
						await navigateAway();
						showMoveToProjectToast({
							resourceType: ResourceType.Workflow,
							resourceTypeLabel: locale.baseText("generic.workflow").toLowerCase(),
							resourceName: event.source.workflow.name,
							targetProject: event.toast.targetProject,
							targetProjectName: event.toast.targetProjectName,
							destinationFolderId: event.destination.parentFolder.id,
							shareUsedCredentials: event.toast.shareUsedCredentials,
							areAllUsedCredentialsShareable: event.toast.areAllUsedCredentialsShareable
						});
					});
					uiStore.openMoveToFolderModal("workflow", {
						id: workflow.id,
						name: workflow.name,
						parentFolderId: props.currentFolder?.id,
						sharedWithProjects: workflow.sharedWithProjects,
						homeProjectId: workflow.homeProject?.id
					}, moveWorkflowEventBus);
					break;
				}
			}
		}
		onMounted(() => {
			nodeViewEventBus.on("addTag", openDescriptionAndTagsModal);
		});
		onBeforeUnmount(() => {
			nodeViewEventBus.off("addTag", openDescriptionAndTagsModal);
		});
		__expose({ importFileRef });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([unref($style).group]) }, [
				createBaseVNode("input", {
					ref_key: "importFileRef",
					ref: importFileRef,
					class: normalizeClass(unref($style).hiddenInput),
					type: "file",
					"data-test-id": "workflow-import-input",
					onChange: _cache[0] || (_cache[0] = ($event) => handleFileImport())
				}, null, 34),
				createBaseVNode("span", { class: normalizeClass(unref($style).checklistAnchor) }, [!__props.isNewWorkflow ? (openBlock(), createBlock(WorkflowProductionChecklist_default, {
					key: 0,
					ref: "productionChecklist",
					"hide-trigger": ""
				}, null, 512)) : createCommentVNode("", true)], 2),
				createVNode(unref(DropdownMenu_default), {
					items: workflowMenuItems.value,
					"data-test-id": "workflow-menu",
					"content-test-id": "workflow-menu",
					placement: "bottom-start",
					"max-height": "var(--reka-dropdown-menu-content-available-height)",
					"sub-menu-max-height": 384,
					onSelect: onWorkflowMenuSelect,
					"onUpdate:modelValue": onWorkflowMenuToggle
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						size: "medium",
						icon: "ellipsis",
						"icon-size": "large",
						"aria-label": unref(locale).baseText("node.moreActions")
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["items"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	group: "_group_1gp4i_1",
	checklistAnchor: "_checklistAnchor_1gp4i_5",
	hiddenInput: "_hiddenInput_1gp4i_11"
} }]]);
//#endregion
//#region src/features/collaboration/collaboration/components/CollaborationPane.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CollaborationPane_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CollaborationPane",
	setup(__props) {
		const collaborationStore = useCollaborationStore();
		const usersStore = useUsersStore();
		const workflowId = useWorkflowId();
		const visibility = useDocumentVisibility();
		watch(visibility, (visibilityState) => {
			if (visibilityState === "hidden") collaborationStore.stopHeartbeat();
			else collaborationStore.startHeartbeat();
		});
		const showUserStack = computed(() => collaborationStore.collaborators.length > 1);
		const collaboratorsSorted = computed(() => {
			const users = collaborationStore.collaborators.map(({ user }) => user);
			const index = users.findIndex((user) => user.id === usersStore.currentUser?.id);
			if (index < 1) return { defaultGroup: users };
			const [currentUser] = users.splice(index, 1);
			return { defaultGroup: [currentUser, ...users] };
		});
		const currentUserEmail = computed(() => usersStore.currentUser?.email);
		onMounted(() => {
			collaborationStore.initialize(workflowId.value);
		});
		onBeforeUnmount(() => {
			collaborationStore.terminate();
		});
		return (_ctx, _cache) => {
			return showUserStack.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(`collaboration-pane-container ${_ctx.$style.container}`),
				"data-test-id": "collaboration-pane"
			}, [createVNode(unref(N8nUserStack_default), {
				users: collaboratorsSorted.value,
				"current-user-email": currentUserEmail.value
			}, null, 8, ["users", "current-user-email"])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_1r1q8_1" } }]]);
//#endregion
//#region src/app/composables/useWorkflowPublicationStatusSync.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/** Tunable: delay before re-checking the status API while still publishing. */
var PUBLICATION_STATUS_POLL_INTERVAL_MS = 8e3;
var API_TO_LIFECYCLE = {
	in_progress: "publishing",
	published: "published",
	partial: "partial",
	failed: "failed",
	not_published: "idle"
};
function useWorkflowPublicationStatusSync(documentId) {
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const { onDocumentVisible } = useDocumentVisibility$1();
	let timer;
	let disposed = false;
	function armPoll() {
		if (disposed) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			refetch();
		}, PUBLICATION_STATUS_POLL_INTERVAL_MS);
	}
	/**
	* Saved check for the document this composable is scoped to. The global
	* `workflowsStore.isNewWorkflow` describes the currently active workflow, which
	* can still be uninitialized while this document already points at a saved
	* workflow — the fetch would then be skipped and the status stay stale.
	*/
	function isDocumentWorkflowSaved() {
		const workflowId = useWorkflowDocumentStore(toValue(documentId)).workflowId;
		return Boolean(workflowId && workflowsStore.isWorkflowSaved[workflowId]);
	}
	async function refetch() {
		if (disposed || !settingsStore.isWorkflowPublicationServiceEnabled) return;
		const workflowDocumentStore = useWorkflowDocumentStore(toValue(documentId));
		const workflowId = workflowDocumentStore.workflowId;
		if (!workflowId || !workflowsStore.isWorkflowSaved[workflowId]) return;
		clearTimeout(timer);
		try {
			const result = await workflowsStore.fetchPublicationStatus(workflowId);
			if (disposed) return;
			workflowDocumentStore.setPublicationStatus({
				status: API_TO_LIFECYCLE[result.status] ?? "idle",
				failures: result.triggers.filter((t) => t.status === "failed").map((t) => ({
					nodeId: t.nodeId,
					nodeName: workflowDocumentStore.getNodeById(t.nodeId)?.name ?? t.nodeId,
					errorMessage: t.errorMessage ?? ""
				})).sort((a, b) => a.nodeName.localeCompare(b.nodeName))
			});
			if (result.status === "in_progress") armPoll();
		} catch {
			if (!disposed && workflowDocumentStore.publicationStatus === "publishing") armPoll();
		}
	}
	watch([() => toValue(documentId), isDocumentWorkflowSaved], () => {
		refetch();
	});
	watch(() => useWorkflowDocumentStore(toValue(documentId)).publicationStatus, (status) => {
		if (status === "publishing" && isDocumentWorkflowSaved()) armPoll();
	});
	onMounted(() => {
		refetch();
	});
	onDocumentVisible(() => {
		refetch();
	});
	onBeforeUnmount(() => {
		disposed = true;
		clearTimeout(timer);
	});
	return { refetch };
}
//#endregion
//#region src/features/workflow-reviews/reviewRequired.store.ts
var useReviewRequiredStore = defineStore("workflowReviewRequired", () => {
	const usersStore = useUsersStore();
	const storage = useLocalStorage(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW(usersStore.currentUserId ?? "anonymous"), {}, {
		deep: true,
		flush: "sync"
	});
	const isReviewRequired = (workflowId) => storage.value[workflowId] ?? false;
	const setReviewRequired = (workflowId, value) => {
		storage.value[workflowId] = value;
	};
	return {
		isReviewRequired,
		setReviewRequired
	};
});
//#endregion
//#region src/features/workflow-reviews/workflowReviews.api.ts
/** Workflow-scoped list used by the review status sync (toggle + canvas banner). */
async function fetchWorkflowReviewRequests(context, query) {
	return await makeRestApiRequest(context, "GET", "/workflow-review-requests", { ...query });
}
async function fetchEligibleReviewers(context, query) {
	return await makeRestApiRequest(context, "GET", "/workflow-review-requests/eligible-reviewers", { ...query });
}
async function createWorkflowReviewRequest(context, payload) {
	return await makeRestApiRequest(context, "POST", "/workflow-review-requests", { ...payload });
}
async function updateWorkflowReviewRequestVersion(context, workflowReviewRequestId, payload) {
	return await makeRestApiRequest(context, "POST", `/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/update-version`, { ...payload });
}
//#endregion
//#region src/features/workflow-reviews/reviewStatus.store.ts
init_reactivity_esm_bundler();
/**
* Authoritative state of a workflow's *latest* review — one request serves both
* the open-review gate and the canvas banner, which also needs the last approved
* review. `null` means "fetched, no review"; a missing key means "not fetched yet".
*/
var useWorkflowReviewStatusStore = defineStore("workflowReviewStatus", () => {
	const rootStore = useRootStore();
	const latestReviewByWorkflowId = ref({});
	const latestSequenceByWorkflowId = {};
	const latestReviewRequest = (workflowId) => {
		return latestReviewByWorkflowId.value[workflowId] ?? null;
	};
	/**
	* The latest review only while it is still open. There is at most one open
	* review per workflow, so the latest request is the only candidate.
	*/
	const openReviewRequest = (workflowId) => {
		const review = latestReviewRequest(workflowId);
		return review?.state === "open" ? review : null;
	};
	/** The single client-side seam deriving "this workflow has an open review". */
	const hasOpenReview = (workflowId) => {
		return openReviewRequest(workflowId) !== null;
	};
	/** True when a newer fetch has started since this one. */
	const isStale = (workflowId, sequence) => sequence !== latestSequenceByWorkflowId[workflowId];
	const fetchStatus = async (workflowId) => {
		const sequence = (latestSequenceByWorkflowId[workflowId] ?? 0) + 1;
		latestSequenceByWorkflowId[workflowId] = sequence;
		try {
			const { data } = await fetchWorkflowReviewRequests(rootStore.restApiContext, {
				workflowId,
				take: 1
			});
			if (isStale(workflowId, sequence)) return;
			latestReviewByWorkflowId.value[workflowId] = data[0] ?? null;
		} catch (error) {
			if (isStale(workflowId, sequence)) return;
			if (error instanceof ResponseError && (error.httpStatusCode === 404 || error.httpStatusCode === 403)) {
				delete latestReviewByWorkflowId.value[workflowId];
				return;
			}
		}
	};
	/**
	* Adopt a freshly opened review as the latest one, without waiting for a
	* refetch. Mutation responses carry the minimal summary: a brand-new review is
	* pending, so neither derived field applies yet. The pinned version's name
	* comes from the caller for the same reason — the summary omits it, and
	* without it the banner would label the version the caller just named by id.
	*/
	const setOpenReview = (workflowId, review, description = null, workflowVersionName = null) => {
		latestSequenceByWorkflowId[workflowId] = (latestSequenceByWorkflowId[workflowId] ?? 0) + 1;
		latestReviewByWorkflowId.value[workflowId] = {
			...review,
			description,
			workflowVersionName,
			decisionBy: null,
			viewerCanOpen: true
		};
	};
	return {
		latestReviewByWorkflowId: readonly(latestReviewByWorkflowId),
		latestReviewRequest,
		openReviewRequest,
		hasOpenReview,
		fetchStatus,
		setOpenReview
	};
});
//#endregion
//#region src/features/workflow-reviews/components/WorkflowReviewRequiredToggle.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewRequiredToggle_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewRequiredToggle",
	props: {
		workflowId: {},
		lockedByInstance: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const reviewRequiredStore = useReviewRequiredStore();
		const reviewStatusStore = useWorkflowReviewStatusStore();
		const hasOpenReview = computed(() => reviewStatusStore.hasOpenReview(props.workflowId));
		const isLocked = computed(() => props.lockedByInstance === true || hasOpenReview.value);
		const description = computed(() => {
			if (props.lockedByInstance) return i18n.baseText("workflowReviews.reviewRequired.enforcedDescription");
			return hasOpenReview.value ? i18n.baseText("workflowReviews.reviewRequired.lockedDescription") : i18n.baseText("workflowReviews.reviewRequired.description");
		});
		const reviewRequired = computed({
			get: () => isLocked.value || reviewRequiredStore.isReviewRequired(props.workflowId),
			set: (value) => {
				if (isLocked.value) return;
				reviewRequiredStore.setReviewRequired(props.workflowId, value);
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(DropdownMenuItem_default), {
				id: "review-required",
				label: unref(i18n).baseText("workflowReviews.reviewRequired.title"),
				checked: reviewRequired.value,
				checkbox: "",
				"close-on-select": false,
				disabled: isLocked.value,
				divided: "",
				"test-id": "workflow-review-required-toggle",
				onSelect: _cache[0] || (_cache[0] = ($event) => reviewRequired.value = !reviewRequired.value)
			}, {
				"item-label": withCtx(({ ui }) => [createVNode(unref(N8nText_default), {
					size: "small",
					class: normalizeClass(ui.class)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.reviewRequired.title")), 1)]),
					_: 1
				}, 8, ["class"])]),
				"item-trailing": withCtx(({ ui }) => [createVNode(unref(N8nSwitch_default), {
					"model-value": reviewRequired.value,
					disabled: isLocked.value,
					"aria-hidden": "true",
					tabindex: "-1",
					"data-test-id": "workflow-review-required-switch",
					class: normalizeClass([ui.class, _ctx.$style.switch])
				}, null, 8, [
					"model-value",
					"disabled",
					"class"
				])]),
				_: 1
			}, 8, [
				"label",
				"checked",
				"disabled"
			]), createVNode(unref(N8nText_default), {
				tag: "p",
				size: "xsmall",
				color: "text-base",
				class: normalizeClass(_ctx.$style.description)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	footer: "_footer_1bx3p_2",
	description: "_description_1bx3p_6",
	"switch": "_switch_1bx3p_10"
} }]]);
//#endregion
//#region src/features/workflow-reviews/composables/useWorkflowReviewDialogPreferences.ts
init_reactivity_esm_bundler();
var useWorkflowReviewDialogPreferences = () => {
	const userId = useUsersStore().currentUserId;
	if (!userId) return {
		publishChoiceDismissed: ref(false),
		submittedDialogDismissed: ref(false)
	};
	return {
		publishChoiceDismissed: useLocalStorage(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN(userId), false, { writeDefaults: false }),
		submittedDialogDismissed: useLocalStorage(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN(userId), false, { writeDefaults: false })
	};
};
//#endregion
//#region src/features/workflow-reviews/components/WorkflowPublishChoiceDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowPublishChoiceDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowPublishChoiceDialog",
	props: { open: { type: Boolean } },
	emits: [
		"update:open",
		"publish",
		"submit-for-review"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const { publishChoiceDismissed } = useWorkflowReviewDialogPreferences();
		const choosePublish = () => {
			emit("update:open", false);
			emit("publish");
		};
		const chooseReview = () => {
			emit("update:open", false);
			emit("submit-for-review");
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				header: unref(i18n).baseText("workflowReviews.publishChoice.title"),
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), { class: normalizeClass(_ctx.$style.description) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.publishChoice.description")), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}), createVNode(unref(DialogFooter_default), {
					"data-test-id": "workflow-publish-choice-dialog",
					class: normalizeClass(_ctx.$style.footer)
				}, {
					default: withCtx(() => [createVNode(unref(Checkbox_default), {
						modelValue: unref(publishChoiceDismissed),
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(publishChoiceDismissed) ? publishChoiceDismissed.value = $event : null),
						"data-test-id": "workflow-publish-choice-dont-show-again",
						class: normalizeClass(_ctx.$style.dontShowAgain)
					}, {
						label: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.dontShowAgain")), 1)]),
						_: 1
					}, 8, ["modelValue", "class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"data-test-id": "workflow-submit-for-review-choice-button",
						onClick: chooseReview
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.publishChoice.submitForReview")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						"data-test-id": "workflow-publish-choice-button",
						onClick: choosePublish
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.publishChoice.publish")), 1)]),
						_: 1
					})], 2)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	description: "_description_qxiis_1",
	footer: "_footer_qxiis_6",
	actions: "_actions_qxiis_11",
	dontShowAgain: "_dontShowAgain_qxiis_16"
} }]]);
//#endregion
//#region src/features/workflow-reviews/composables/useReviewVersionName.ts
init_reactivity_esm_bundler();
/**
* Shared by the submit-for-review and update-review dialogs, which both prefill
* the current version's name and description and write the submitted ones back
* to the editor.
*/
var useReviewVersionName = () => {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const versionName = ref("");
	const versionDescription = ref("");
	const prefilledVersionDescription = ref("");
	/**
	* Every path into either dialog is gated on a saved workflow, so the document
	* store's version is the one `flushSave()` will return.
	* Falsy rather than nullish: the publish endpoints accept `name: ""`.
	*/
	const prefillVersionName = () => {
		versionName.value = workflowDocumentStore.value.versionData?.name || generateVersionLabelFromId(workflowDocumentStore.value.versionId);
		versionDescription.value = workflowDocumentStore.value.versionData?.description ?? "";
		prefilledVersionDescription.value = versionDescription.value;
	};
	const submittedVersionDescription = () => {
		const trimmed = versionDescription.value.trim();
		return trimmed === prefilledVersionDescription.value.trim() ? void 0 : trimmed;
	};
	/**
	* Mirror the persisted name and description into the editor so version
	* history and the publish modal's prefill reflect them without a refetch.
	*/
	const applyVersionMetadata = (workflowVersionId, name, description) => {
		const store = workflowDocumentStore.value;
		if (store.versionId !== workflowVersionId) return;
		store.setVersionData({
			versionId: workflowVersionId,
			name,
			description: description === void 0 ? store.versionData?.description ?? null : description.trim() || null
		});
	};
	return {
		versionName,
		versionDescription,
		prefillVersionName,
		submittedVersionDescription,
		applyVersionMetadata
	};
};
//#endregion
//#region src/features/workflow-reviews/components/WorkflowSubmitForReviewDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var REVIEW_TITLE_MAX_LENGTH = 128;
var REVIEW_DESCRIPTION_MAX_LENGTH$1 = 512;
var WorkflowSubmitForReviewDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowSubmitForReviewDialog",
	props: {
		open: { type: Boolean },
		workflowId: {},
		flushSave: { type: Function }
	},
	emits: [
		"update:open",
		"submitted",
		"conflict"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const toast = useToast();
		const reviewRequiredStore = useReviewRequiredStore();
		const reviewStatusStore = useWorkflowReviewStatusStore();
		const { versionName, versionDescription, prefillVersionName, submittedVersionDescription, applyVersionMetadata } = useReviewVersionName();
		const step = ref(1);
		const reviewTitle = ref("");
		const description = ref("");
		const isSubmitting = ref(false);
		const selectedReviewerId = ref("");
		const eligibleReviewers = ref([]);
		const isLoadingReviewers = ref(false);
		const titleInput = useTemplateRef("titleInput");
		const versionForm = useTemplateRef("versionForm");
		const stepLabel = computed(() => i18n.baseText("workflowReviews.submitForReview.step", { interpolate: {
			step: step.value,
			total: 2
		} }));
		const isNextDisabled = computed(() => versionName.value.trim().length === 0);
		const isSubmitDisabled = computed(() => isSubmitting.value || reviewTitle.value.trim().length === 0 || selectedReviewerId.value.length === 0);
		const reviewerOptions = computed(() => eligibleReviewers.value.map((reviewer) => ({
			...reviewer,
			fullName: formatUserDisplayName(reviewer) || void 0
		})));
		let loadReviewersSequence = 0;
		const loadEligibleReviewers = async () => {
			const sequence = ++loadReviewersSequence;
			isLoadingReviewers.value = true;
			try {
				const { data } = await fetchEligibleReviewers(rootStore.restApiContext, { workflowId: props.workflowId });
				if (sequence !== loadReviewersSequence) return;
				eligibleReviewers.value = data;
			} catch (error) {
				if (sequence !== loadReviewersSequence) return;
				eligibleReviewers.value = [];
				toast.showError(error, i18n.baseText("workflowReviews.submitForReview.error.loadReviewers"));
			} finally {
				if (sequence === loadReviewersSequence) isLoadingReviewers.value = false;
			}
		};
		watch(() => props.open, (isOpen) => {
			if (!isOpen) {
				loadReviewersSequence++;
				return;
			}
			step.value = 1;
			reviewTitle.value = "";
			description.value = "";
			selectedReviewerId.value = "";
			eligibleReviewers.value = [];
			prefillVersionName();
			loadEligibleReviewers();
		});
		const close = () => {
			if (isSubmitting.value) return;
			emit("update:open", false);
		};
		const handleOpenAutoFocus = (event) => {
			event.preventDefault();
			nextTick(() => versionForm.value?.focusInput());
		};
		const goToReviewStep = () => {
			if (isNextDisabled.value) return;
			step.value = 2;
			nextTick(() => titleInput.value?.focus());
		};
		const goBack = () => {
			if (isSubmitting.value) return;
			step.value = 1;
		};
		const handleFormSubmit = () => {
			if (step.value === 1) goToReviewStep();
			else submit();
		};
		const submit = async () => {
			if (isSubmitDisabled.value || versionName.value.trim().length === 0) return;
			const workflowId = props.workflowId;
			const trimmedVersionName = versionName.value.trim();
			const trimmedVersionDescription = submittedVersionDescription();
			const trimmedTitle = reviewTitle.value.trim();
			const trimmedDescription = description.value.trim();
			const reviewerId = selectedReviewerId.value;
			isSubmitting.value = true;
			try {
				const workflowVersionId = await props.flushSave();
				if (props.workflowId !== workflowId) return;
				if (!workflowVersionId) {
					toast.showError(new Error(i18n.baseText("workflowReviews.submitForReview.error.save")), i18n.baseText("workflowReviews.submitForReview.error.title"));
					return;
				}
				const reviewRequest = await createWorkflowReviewRequest(rootStore.restApiContext, {
					title: trimmedTitle,
					description: trimmedDescription || void 0,
					workflows: [{
						workflowId,
						workflowVersionId,
						workflowVersionName: trimmedVersionName,
						workflowVersionDescription: trimmedVersionDescription
					}],
					reviewerUserIds: [reviewerId]
				});
				if (props.workflowId !== workflowId) return;
				applyVersionMetadata(workflowVersionId, trimmedVersionName, trimmedVersionDescription);
				reviewStatusStore.setOpenReview(workflowId, reviewRequest, trimmedDescription || null, trimmedVersionName);
				reviewRequiredStore.setReviewRequired(workflowId, false);
				emit("update:open", false);
				emit("submitted", reviewRequest.id);
			} catch (error) {
				if (error instanceof ResponseError && error.httpStatusCode === 409) {
					reviewStatusStore.fetchStatus(workflowId);
					if (props.workflowId !== workflowId) return;
					emit("update:open", false);
					emit("conflict");
					return;
				}
				toast.showError(error, i18n.baseText("workflowReviews.submitForReview.error.title"));
			} finally {
				isSubmitting.value = false;
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				"aria-description": unref(i18n).baseText("workflowReviews.submitForReview.ariaDescription"),
				onOpenAutoFocus: handleOpenAutoFocus,
				"onUpdate:open": close
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.heading) }, [createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.step),
							size: "xsmall",
							color: "text-light",
							bold: "",
							tag: "p",
							"data-test-id": "workflow-review-dialog-step"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(stepLabel.value), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.submitForReview.title")), 1)]),
							_: 1
						})], 2)]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("form", {
							id: "workflow-submit-for-review-form",
							"data-test-id": "workflow-submit-for-review-dialog",
							class: normalizeClass(_ctx.$style.form),
							onSubmit: withModifiers(handleFormSubmit, ["prevent"])
						}, [step.value === 1 ? (openBlock(), createBlock(WorkflowVersionForm_default, {
							key: 0,
							ref_key: "versionForm",
							ref: versionForm,
							"version-name": unref(versionName),
							"onUpdate:versionName": _cache[0] || (_cache[0] = ($event) => isRef(versionName) ? versionName.value = $event : null),
							description: unref(versionDescription),
							"onUpdate:description": _cache[1] || (_cache[1] = ($event) => isRef(versionDescription) ? versionDescription.value = $event : null),
							"version-name-test-id": "workflow-review-version-name-input",
							"description-test-id": "workflow-review-version-description-input",
							onSubmit: goToReviewStep
						}, null, 8, ["version-name", "description"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
							createVNode(unref(N8nInputLabel_default), {
								"input-name": "workflow-review-title",
								label: unref(i18n).baseText("workflowReviews.submitForReview.reviewTitle.label"),
								required: ""
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									id: "workflow-review-title",
									ref_key: "titleInput",
									ref: titleInput,
									modelValue: reviewTitle.value,
									"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => reviewTitle.value = $event),
									maxlength: REVIEW_TITLE_MAX_LENGTH,
									disabled: isSubmitting.value,
									"data-test-id": "workflow-review-title-input"
								}, null, 8, ["modelValue", "disabled"]), createVNode(CharacterCount_default, {
									value: reviewTitle.value,
									max: REVIEW_TITLE_MAX_LENGTH,
									"data-test-id": "workflow-review-title-character-count"
								}, null, 8, ["value"])]),
								_: 1
							}, 8, ["label"]),
							createVNode(unref(N8nInputLabel_default), {
								"input-name": "workflow-review-description",
								label: unref(i18n).baseText("workflowReviews.submitForReview.description.label")
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									id: "workflow-review-description",
									modelValue: description.value,
									"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => description.value = $event),
									type: "textarea",
									rows: 3,
									maxlength: REVIEW_DESCRIPTION_MAX_LENGTH$1,
									disabled: isSubmitting.value,
									"data-test-id": "workflow-review-description-input"
								}, null, 8, ["modelValue", "disabled"]), createVNode(CharacterCount_default, {
									value: description.value,
									max: REVIEW_DESCRIPTION_MAX_LENGTH$1,
									"data-test-id": "workflow-review-description-character-count"
								}, null, 8, ["value"])]),
								_: 1
							}, 8, ["label"]),
							createVNode(unref(N8nInputLabel_default), {
								"input-name": "workflow-review-reviewer",
								label: unref(i18n).baseText("workflowReviews.submitForReview.reviewer.label"),
								required: ""
							}, {
								default: withCtx(() => [createVNode(unref(N8nUserSelect_default), {
									id: "workflow-review-reviewer",
									modelValue: selectedReviewerId.value,
									"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => selectedReviewerId.value = $event),
									users: reviewerOptions.value,
									loading: isLoadingReviewers.value,
									placeholder: unref(i18n).baseText("workflowReviews.submitForReview.reviewer.placeholder"),
									teleported: false,
									disabled: isSubmitting.value,
									clearable: "",
									"data-test-id": "workflow-review-reviewer-select"
								}, {
									prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
									_: 1
								}, 8, [
									"modelValue",
									"users",
									"loading",
									"placeholder",
									"disabled"
								])]),
								_: 1
							}, 8, ["label"])
						], 64))], 34)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [step.value === 1 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nButton_default), {
							type: "button",
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "workflow-review-cancel-button",
							onClick: close
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							form: "workflow-submit-for-review-form",
							disabled: isNextDisabled.value,
							"data-test-id": "workflow-review-next-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.next")), 1)]),
							_: 1
						}, 8, ["disabled"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nButton_default), {
							type: "button",
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "workflow-review-back-button",
							onClick: goBack
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.back")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							form: "workflow-submit-for-review-form",
							loading: isSubmitting.value,
							disabled: isSubmitDisabled.value,
							"data-test-id": "workflow-review-submit-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.submitForReview.submit")), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])], 64))]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open", "aria-description"]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_1ygz7_1",
	heading: "_heading_1ygz7_7",
	step: "_step_1ygz7_15"
} }]]);
//#endregion
//#region src/features/workflow-reviews/components/WorkflowReviewSubmittedDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewSubmittedDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewSubmittedDialog",
	props: {
		open: { type: Boolean },
		workflowReviewRequestId: {}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const { submittedDialogDismissed } = useWorkflowReviewDialogPreferences();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				header: unref(i18n).baseText("workflowReviews.submitted.title"),
				"onUpdate:open": _cache[2] || (_cache[2] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), {
						"data-test-id": "workflow-review-submitted-dialog",
						class: normalizeClass(_ctx.$style.description)
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "workflowReviews.submitted.description",
							tag: "span",
							scope: "global"
						}, {
							submission: withCtx(() => [createVNode(unref(N8nLink_default), { to: {
								name: unref(WORKFLOW_REVIEW_REQUESTS_VIEW),
								params: { reviewId: __props.workflowReviewRequestId }
							} }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.submitted.description.submission")), 1)]),
								_: 1
							}, 8, ["to"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}), createVNode(unref(DialogFooter_default), { class: normalizeClass(_ctx.$style.footer) }, {
					default: withCtx(() => [createVNode(unref(Checkbox_default), {
						modelValue: unref(submittedDialogDismissed),
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(submittedDialogDismissed) ? submittedDialogDismissed.value = $event : null),
						"data-test-id": "workflow-review-submitted-dont-show-again",
						class: normalizeClass(_ctx.$style.dontShowAgain)
					}, {
						label: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.dontShowAgain")), 1)]),
						_: 1
					}, 8, ["modelValue", "class"]), createVNode(unref(N8nButton_default), {
						"data-test-id": "workflow-review-submitted-got-it-button",
						onClick: _cache[1] || (_cache[1] = ($event) => emit("update:open", false))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.submitted.gotIt")), 1)]),
						_: 1
					})]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	description: "_description_e4d4y_1",
	footer: "_footer_e4d4y_6",
	dontShowAgain: "_dontShowAgain_e4d4y_11"
} }]]);
//#endregion
//#region src/features/workflow-reviews/components/WorkflowUpdateReviewDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = { key: 1 };
var REVIEW_DESCRIPTION_MAX_LENGTH = 512;
var WorkflowUpdateReviewDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowUpdateReviewDialog",
	props: {
		open: { type: Boolean },
		workflowId: {},
		flushSave: {},
		canSubmit: {
			type: Boolean,
			default: true
		}
	},
	emits: ["update:open", "updated"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const toast = useToast();
		const reviewStatusStore = useWorkflowReviewStatusStore();
		const { versionName, versionDescription, prefillVersionName, submittedVersionDescription, applyVersionMetadata } = useReviewVersionName();
		const step = ref(1);
		const reviewDescription = ref("");
		const prefilledReviewDescription = ref("");
		const loadedReview = ref(null);
		const isLoadingReviewDescription = ref(false);
		const isSubmitting = ref(false);
		const workflowReviewRequestId = computed(() => loadedReview.value?.id ?? reviewStatusStore.openReviewRequest(props.workflowId)?.id);
		const stepLabel = computed(() => i18n.baseText("workflowReviews.submitForReview.step", { interpolate: {
			step: step.value,
			total: 2
		} }));
		const hasInvalidVersion = computed(() => !props.canSubmit || versionName.value.trim().length === 0);
		const isNextDisabled = computed(() => hasInvalidVersion.value || isLoadingReviewDescription.value);
		const isSubmitDisabled = computed(() => isSubmitting.value || hasInvalidVersion.value);
		const close = () => {
			if (isSubmitting.value) return;
			emit("update:open", false);
		};
		/** The open review may have been closed elsewhere in the meantime — refetch once before giving up. */
		const resolveOpenReviewRequest = async (workflowId) => {
			let request = reviewStatusStore.openReviewRequest(workflowId);
			if (!request) {
				await reviewStatusStore.fetchStatus(workflowId);
				request = reviewStatusStore.openReviewRequest(workflowId);
			}
			return request;
		};
		const { next: nextReviewLoad } = useLatestFetch();
		const loadReviewDescription = async (workflowId) => {
			const isCurrent = nextReviewLoad();
			isLoadingReviewDescription.value = true;
			try {
				const openReviewRequest = await resolveOpenReviewRequest(workflowId);
				if (!isCurrent() || props.workflowId !== workflowId) return;
				if (!openReviewRequest) return;
				loadedReview.value = openReviewRequest;
				reviewDescription.value = openReviewRequest.description ?? "";
				prefilledReviewDescription.value = reviewDescription.value;
			} catch (error) {
				if (!isCurrent() || props.workflowId !== workflowId) return;
				toast.showError(error, i18n.baseText("workflowReviews.updateReview.error.title"));
			} finally {
				if (isCurrent()) isLoadingReviewDescription.value = false;
			}
		};
		watch(() => [props.open, props.workflowId], ([isOpen, workflowId]) => {
			if (!isOpen) {
				nextReviewLoad();
				loadedReview.value = null;
				isLoadingReviewDescription.value = false;
				return;
			}
			step.value = 1;
			loadedReview.value = null;
			reviewDescription.value = "";
			prefilledReviewDescription.value = "";
			prefillVersionName();
			loadReviewDescription(workflowId);
		});
		const goToReviewStep = () => {
			if (isNextDisabled.value) return;
			step.value = 2;
		};
		const goBack = () => {
			if (isSubmitting.value) return;
			step.value = 1;
		};
		const submittedReviewDescription = () => {
			const trimmed = reviewDescription.value.trim();
			return trimmed === prefilledReviewDescription.value.trim() ? void 0 : trimmed;
		};
		const handleFormSubmit = () => {
			if (step.value === 1) goToReviewStep();
			else submit();
		};
		const submit = async () => {
			if (isSubmitDisabled.value) return;
			const workflowId = props.workflowId;
			const trimmedVersionName = versionName.value.trim();
			const trimmedVersionDescription = submittedVersionDescription();
			const trimmedReviewDescription = submittedReviewDescription();
			isSubmitting.value = true;
			try {
				const workflowVersionId = await props.flushSave();
				if (props.workflowId !== workflowId) return;
				if (!workflowVersionId) {
					toast.showError(new Error(i18n.baseText("workflowReviews.submitForReview.error.save")), i18n.baseText("workflowReviews.updateReview.error.title"));
					return;
				}
				const reviewRequest = await resolveOpenReviewRequest(workflowId);
				if (props.workflowId !== workflowId) return;
				if (!reviewRequest) {
					toast.showError(new Error(i18n.baseText("workflowReviews.updateReview.error.noOpenReview")), i18n.baseText("workflowReviews.updateReview.error.title"));
					emit("update:open", false);
					return;
				}
				loadedReview.value = reviewRequest;
				if (reviewRequest.workflowVersionId === workflowVersionId && trimmedReviewDescription === void 0) {
					emit("update:open", false);
					return;
				}
				await updateWorkflowReviewRequestVersion(rootStore.restApiContext, reviewRequest.id, {
					workflowId,
					workflowVersionId,
					workflowVersionName: trimmedVersionName,
					workflowVersionDescription: trimmedVersionDescription,
					description: trimmedReviewDescription
				});
				if (props.workflowId !== workflowId) return;
				applyVersionMetadata(workflowVersionId, trimmedVersionName, trimmedVersionDescription);
				reviewStatusStore.fetchStatus(workflowId);
				emit("update:open", false);
				emit("updated", reviewRequest.id);
			} catch (error) {
				await reviewStatusStore.fetchStatus(workflowId);
				if (props.workflowId === workflowId) loadedReview.value = reviewStatusStore.openReviewRequest(workflowId);
				toast.showError(error, i18n.baseText("workflowReviews.updateReview.error.title"));
			} finally {
				isSubmitting.value = false;
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				"onUpdate:open": close
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.heading) }, [createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.step),
							size: "xsmall",
							color: "text-light",
							bold: "",
							tag: "p",
							"data-test-id": "workflow-update-review-dialog-step"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(stepLabel.value), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.updateReview.title")), 1)]),
							_: 1
						})], 2)]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createVNode(unref(DialogDescription_default), { class: normalizeClass(_ctx.$style.description) }, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "workflowReviews.updateReview.description",
								tag: "span",
								scope: "global"
							}, {
								review: withCtx(() => [workflowReviewRequestId.value ? (openBlock(), createBlock(unref(N8nLink_default), {
									key: 0,
									to: {
										name: unref(WORKFLOW_REVIEW_REQUESTS_VIEW),
										params: { reviewId: workflowReviewRequestId.value }
									}
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.updateReview.description.review")), 1)]),
									_: 1
								}, 8, ["to"])) : (openBlock(), createElementBlock("span", _hoisted_1$2, toDisplayString(unref(i18n).baseText("workflowReviews.updateReview.description.review")), 1))]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createBaseVNode("form", {
							id: "workflow-update-review-form",
							class: normalizeClass(_ctx.$style.form),
							"data-test-id": "workflow-update-review-dialog",
							onSubmit: withModifiers(handleFormSubmit, ["prevent"])
						}, [step.value === 1 ? (openBlock(), createBlock(WorkflowVersionForm_default, {
							key: 0,
							"version-name": unref(versionName),
							"onUpdate:versionName": _cache[0] || (_cache[0] = ($event) => isRef(versionName) ? versionName.value = $event : null),
							description: unref(versionDescription),
							"onUpdate:description": _cache[1] || (_cache[1] = ($event) => isRef(versionDescription) ? versionDescription.value = $event : null),
							disabled: isSubmitting.value,
							"version-name-test-id": "workflow-update-review-version-name-input",
							"description-test-id": "workflow-update-review-version-description-input",
							onSubmit: goToReviewStep
						}, null, 8, [
							"version-name",
							"description",
							"disabled"
						])) : (openBlock(), createBlock(unref(N8nInputLabel_default), {
							key: 1,
							"input-name": "workflow-update-review-description",
							label: unref(i18n).baseText("workflowReviews.submitForReview.description.label")
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "workflow-update-review-description",
								modelValue: reviewDescription.value,
								"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => reviewDescription.value = $event),
								type: "textarea",
								rows: 3,
								maxlength: REVIEW_DESCRIPTION_MAX_LENGTH,
								disabled: isSubmitting.value,
								"data-test-id": "workflow-update-review-description-input"
							}, null, 8, ["modelValue", "disabled"]), createVNode(CharacterCount_default, {
								value: reviewDescription.value,
								max: REVIEW_DESCRIPTION_MAX_LENGTH,
								"data-test-id": "workflow-update-review-description-character-count"
							}, null, 8, ["value"])]),
							_: 1
						}, 8, ["label"]))], 34)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [step.value === 1 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nButton_default), {
							type: "button",
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "workflow-update-review-cancel-button",
							onClick: close
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							form: "workflow-update-review-form",
							loading: isLoadingReviewDescription.value,
							disabled: isNextDisabled.value,
							"data-test-id": "workflow-update-review-next-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.next")), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nButton_default), {
							type: "button",
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "workflow-update-review-back-button",
							onClick: goBack
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.back")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							form: "workflow-update-review-form",
							loading: isSubmitting.value,
							disabled: isSubmitDisabled.value,
							"data-test-id": "workflow-update-review-submit-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.updateReview.submit")), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])], 64))]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	description: "_description_1d2jc_1",
	form: "_form_1d2jc_6",
	heading: "_heading_1d2jc_12",
	step: "_step_1d2jc_20"
} }]]);
//#endregion
//#region src/features/workflow-reviews/components/WorkflowReviewStatusBanner.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowReviewStatusBanner_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewStatusBanner",
	props: {
		review: {},
		savedVersionId: {},
		canSubmitChanges: { type: Boolean },
		submitBlockedReason: {},
		canOpenReview: { type: Boolean }
	},
	emits: ["open-review", "submit-changes"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const isOpen = ref(false);
		const pinnedVersionLabel = computed(() => {
			const review = props.review;
			if (!review?.workflowVersionId) return "";
			return getVersionLabel({ workflowHistory: {
				versionId: review.workflowVersionId,
				name: review.workflowVersionName
			} });
		});
		const actorName = computed(() => {
			const actor = props.review?.decisionBy;
			if (!actor) return null;
			return formatUserDisplayName(actor);
		});
		/**
		* Whether the working copy has moved past the reviewed version. An unknown saved
		* version reads as "in sync": submitting a version we cannot identify would be
		* worse than waiting for the next status sync.
		*/
		const hasDivergentVersion = computed(() => {
			const pinned = props.review?.workflowVersionId;
			if (!pinned || !props.savedVersionId) return false;
			return props.savedVersionId !== pinned;
		});
		const status = computed(() => {
			const review = props.review;
			if (!review?.workflowVersionId) return null;
			const version = pinnedVersionLabel.value;
			if (review.state === "open") {
				if (review.decision === "changes_requested") {
					const actor = actorName.value;
					return {
						pill: hasDivergentVersion.value ? i18n.baseText("workflowReviews.editorBanner.pendingStale.pill") : i18n.baseText("workflowReviews.editorBanner.changesRequested.pill"),
						title: i18n.baseText("workflowReviews.editorBanner.changesRequested.title"),
						body: actor ? i18n.baseText("workflowReviews.editorBanner.changesRequested.body", { interpolate: {
							actor,
							version
						} }) : i18n.baseText("workflowReviews.editorBanner.changesRequested.bodyWithoutActor", { interpolate: { version } }),
						support: i18n.baseText("workflowReviews.editorBanner.changesRequested.support"),
						tone: "warning",
						action: "submit-changes"
					};
				}
				if (hasDivergentVersion.value) return {
					pill: i18n.baseText("workflowReviews.editorBanner.pendingStale.pill"),
					title: i18n.baseText("workflowReviews.editorBanner.pendingStale.title"),
					body: i18n.baseText("workflowReviews.editorBanner.pendingStale.body"),
					support: i18n.baseText("workflowReviews.editorBanner.pendingStale.support"),
					tone: "warning",
					action: "submit-changes"
				};
				return {
					pill: i18n.baseText("workflowReviews.editorBanner.pending.pill"),
					title: i18n.baseText("workflowReviews.editorBanner.pending.title"),
					body: i18n.baseText("workflowReviews.editorBanner.pending.body", { interpolate: { version } }),
					support: i18n.baseText("workflowReviews.editorBanner.pending.support"),
					tone: "info",
					action: null
				};
			}
			return null;
		});
		/** Nothing to submit while the review already covers the saved version. */
		const isSubmitChangesEnabled = computed(() => props.canSubmitChanges && hasDivergentVersion.value);
		const submitChangesHint = computed(() => {
			if (props.submitBlockedReason) return props.submitBlockedReason;
			return props.canSubmitChanges && !hasDivergentVersion.value ? i18n.baseText("workflowReviews.editorBanner.submitChanges.savedVersionHint") : "";
		});
		/** A popover with no action left is still worth showing for its copy. */
		const hasActions = computed(() => props.canOpenReview || !!status.value?.action);
		/** Acting on the review always dismisses the popover first. */
		const onOpenReview = () => {
			isOpen.value = false;
			emit("open-review");
		};
		const onSubmitChanges = () => {
			isOpen.value = false;
			emit("submit-changes");
		};
		return (_ctx, _cache) => {
			return status.value ? (openBlock(), createBlock(unref(N8nPopover_default), {
				key: 0,
				open: isOpen.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isOpen.value = $event),
				side: "bottom",
				align: "end",
				width: "360px",
				"enable-scrolling": false,
				"content-class": _ctx.$style.popover
			}, {
				trigger: withCtx(() => [createBaseVNode("button", {
					type: "button",
					class: normalizeClass([_ctx.$style.pill, _ctx.$style[status.value.tone]]),
					"data-test-id": "workflow-review-status-pill"
				}, toDisplayString(status.value.pill), 3)]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.content),
					"data-test-id": "workflow-review-status-popover"
				}, [
					createVNode(unref(N8nHeading_default), {
						tag: "h3",
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(status.value.title), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						tag: "p",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(status.value.body), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						tag: "p",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(status.value.support), 1)]),
						_: 1
					}),
					hasActions.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.actions)
					}, [__props.canOpenReview ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						size: "small",
						"data-test-id": "workflow-review-open-review-button",
						onClick: onOpenReview
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.editorBanner.openReview")), 1)]),
						_: 1
					})) : createCommentVNode("", true), status.value.action === "submit-changes" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						disabled: !submitChangesHint.value,
						"show-after": 300
					}, {
						content: withCtx(() => [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.submitChangesHint),
							"data-test-id": "workflow-review-submit-changes-hint"
						}, toDisplayString(submitChangesHint.value), 3)]),
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							size: "small",
							disabled: !isSubmitChangesEnabled.value,
							"data-test-id": "workflow-review-submit-changes-button",
							onClick: onSubmitChanges
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.editorBanner.submitChanges")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					}, 8, ["disabled"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, ["open", "content-class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	submitChangesHint: "_submitChangesHint_1f9e0_4",
	pill: "_pill_1f9e0_8",
	info: "_info_1f9e0_24",
	warning: "_warning_1f9e0_32",
	popover: "_popover_1f9e0_40",
	content: "_content_1f9e0_44",
	actions: "_actions_1f9e0_50"
} }]]);
//#endregion
//#region src/features/workflow-reviews/composables/useWorkflowReviewStatusSync.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Keeps the review-status store in sync with the backend for the given
* workflow. Push messages are treated purely as invalidation signals.
*/
function useWorkflowReviewStatusSync(workflowId) {
	const pushStore = usePushConnectionStore();
	const reviewStatusStore = useWorkflowReviewStatusStore();
	const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();
	const { onDocumentVisible } = useDocumentVisibility$1();
	async function refetch() {
		if (!isWorkflowReviewsEnabled.value) return;
		const id = toValue(workflowId);
		if (!id) return;
		await reviewStatusStore.fetchStatus(id);
	}
	function onPushMessage(event) {
		if (event.type === "workflowReviewStateChanged" && event.data.workflowId === toValue(workflowId)) refetch();
	}
	const removePushListener = pushStore.addEventListener(onPushMessage);
	watch(() => toValue(workflowId), () => {
		refetch();
	});
	watch(() => pushStore.isConnected, (isConnected, wasConnected) => {
		if (isConnected && !wasConnected) refetch();
	});
	onMounted(() => {
		refetch();
	});
	onDocumentVisible(() => {
		refetch();
	});
	onBeforeUnmount(() => removePushListener());
	return { refetch };
}
//#endregion
//#region src/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "workflow-active-version-info" };
var WorkflowHeaderDraftPublishActions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHeaderDraftPublishActions",
	props: {
		id: {},
		isArchived: { type: Boolean },
		isNewWorkflow: { type: Boolean },
		workflowPermissions: {}
	},
	setup(__props) {
		const props = __props;
		const uiStore = useUIStore();
		const workflowDocumentStore = computed(() => useWorkflowDocumentStore(createWorkflowDocumentId(props.id)));
		useWorkflowPublicationStatusSync(() => workflowDocumentStore.value.documentId);
		const { reason: unusableCredentialReason } = useUnusableWorkflowCredentials(() => workflowDocumentStore.value.usedCredentials, () => workflowDocumentStore.value.allNodes);
		const { refetch: refetchReviewStatus } = useWorkflowReviewStatusSync(() => props.isNewWorkflow ? void 0 : props.id);
		const collaborationStore = useCollaborationStore();
		const projectStore = useProjectsStore();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const settingsStore = useSettingsStore();
		const nodeTypesStore = useNodeTypesStore();
		const i18n = useI18n();
		const router = useRouter();
		const toast = useToast();
		const saveStore = useWorkflowSaveStore();
		const { saveCurrentWorkflow, cancelAutoSave } = useWorkflowSaving({ router });
		const workflowActivate = useWorkflowActivate();
		const { isWorkflowReviewsEnabled, isReviewRequiredFor } = useWorkflowReviewsFeature();
		const reviewRequiredStore = useReviewRequiredStore();
		const reviewStatusStore = useWorkflowReviewStatusStore();
		const { publishChoiceDismissed, submittedDialogDismissed } = useWorkflowReviewDialogPreferences();
		const homeProject = computed(() => workflowDocumentStore.value.homeProject);
		const isPersonalWorkflow = computed(() => homeProject.value?.type === ProjectTypes.Personal);
		const hasOpenReview = computed(() => reviewStatusStore.hasOpenReview(props.id));
		/** A legacy open review on a personal workflow keeps its controls until it closes. */
		const reviewsApply = computed(() => isWorkflowReviewsEnabled.value && (!isPersonalWorkflow.value || hasOpenReview.value));
		const isApprovalAlwaysRequired = computed(() => isReviewRequiredFor(homeProject.value));
		/** Whether the editor holds anything beyond the live version. */
		const hasUnpublishedChanges = computed(() => workflowDocumentStore.value.versionId !== activeVersion.value?.versionId || uiStore.hasUnsavedWorkflowChanges);
		/** Re-applying the live version needs no review, e.g. to retry a failed publication. */
		const savedVersionIsLive = computed(() => !!activeVersion.value && !hasUnpublishedChanges.value);
		/** An approved version needs no new review, e.g. when the publish after the approval failed. */
		const savedVersionIsApproved = computed(() => {
			const review = reviewStatusStore.latestReviewRequest(props.id);
			return review?.decision === "approved" && review.workflowVersionId === workflowDocumentStore.value.versionId && !uiStore.hasUnsavedWorkflowChanges;
		});
		const mustSubmitForReview = computed(() => isApprovalAlwaysRequired.value && !savedVersionIsLive.value && !savedVersionIsApproved.value);
		const effectiveReviewRequired = computed(() => isApprovalAlwaysRequired.value ? hasOpenReview.value || mustSubmitForReview.value : hasOpenReview.value || reviewRequiredStore.isReviewRequired(props.id));
		const isNamedVersionsEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.NamedVersions]);
		const showWorkflowReviewControls = computed(() => reviewsApply.value && !props.isNewWorkflow);
		const latestReviewRequest = computed(() => reviewStatusStore.latestReviewRequest(props.id));
		const openReviewRequest = computed(() => reviewStatusStore.openReviewRequest(props.id));
		/** Saved version of the working copy — what a review is pinned to, or diverges from. */
		const savedVersionId = computed(() => workflowDocumentStore.value.versionId || void 0);
		/** Whether the open review already contains the current saved workflow version. */
		const reviewContainsSavedVersion = computed(() => {
			const reviewVersionId = openReviewRequest.value?.workflowVersionId;
			return !!reviewVersionId && reviewVersionId === savedVersionId.value;
		});
		/** Unsaved workflow edits can still produce a new version when Publish saves first. */
		const isReviewUpdateBlocked = computed(() => reviewContainsSavedVersion.value && !uiStore.hasUnsavedWorkflowChanges);
		const autoSaveForPublish = ref(false);
		const isSaving = ref(false);
		const showPublishChoiceDialog = ref(false);
		const showSubmitForReviewDialog = ref(false);
		const showReviewSubmittedDialog = ref(false);
		const submittedReviewRequestId = ref();
		const showUpdateReviewDialog = ref(false);
		watch(() => props.id, () => {
			showPublishChoiceDialog.value = false;
			showSubmitForReviewDialog.value = false;
			showReviewSubmittedDialog.value = false;
			submittedReviewRequestId.value = void 0;
			showUpdateReviewDialog.value = false;
			uiStore.closeModal(WORKFLOW_PUBLISH_MODAL_KEY);
		});
		const showSaveButton = computed(() => !settingsStore.isAutosaveEnabled);
		const onSaveButtonClick = async () => {
			isSaving.value = true;
			try {
				await saveCurrentWorkflow({});
			} finally {
				isSaving.value = false;
			}
		};
		const foundTriggers = computed(() => getActivatableTriggerNodes(workflowDocumentStore.value.workflowTriggerNodes));
		const containsTrigger = computed(() => {
			return foundTriggers.value.length > 0;
		});
		const nodesWithValidationIssues = computed(() => workflowDocumentStore.value.publishBlockingNodes);
		const hasNodeIssues = computed(() => workflowDocumentStore.value.hasPublishBlockingIssues);
		/** The publish policy check judges every node, disabled or unreachable ones too. */
		const restrictedNodeTypes = computed(() => collectRestrictedNodeTypes(workflowDocumentStore.value.allNodes.map((node) => node.type), (type) => nodeTypesStore.getNodeType(type)?.displayName ?? type));
		const hasRestrictedNodeTypes = computed(() => restrictedNodeTypes.value.length > 0);
		const isWorkflowPublishable = computed(() => containsTrigger.value && !hasNodeIssues.value && !hasRestrictedNodeTypes.value);
		/** Why publishing is blocked, or '' when it is not. Also the Publish tooltip. */
		const publishBlockedReason = computed(() => {
			if (isWorkflowPublishable.value) return "";
			if (!containsTrigger.value) return i18n.baseText("workflows.publishModal.noTriggerMessage");
			if (hasRestrictedNodeTypes.value) return describeRestrictedNodeTypes(restrictedNodeTypes.value);
			return i18n.baseText("workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title", {
				interpolate: { count: nodesWithValidationIssues.value.length },
				adjustToNumber: nodesWithValidationIssues.value.length
			});
		});
		const publicationStatus = computed(() => workflowDocumentStore.value.publicationStatus);
		const publicationFailures = computed(() => workflowDocumentStore.value.publicationFailures);
		const publicationServiceEnabled = computed(() => settingsStore.isWorkflowPublicationServiceEnabled);
		const workflowPublishState = computed(() => {
			if (publicationServiceEnabled.value) {
				if (publicationStatus.value === "publishing") return "publishing";
				if (publicationStatus.value === "partial") return "publication-partial";
				if (publicationStatus.value === "failed") return "publication-failed";
			}
			if (!!!activeVersion.value) return isWorkflowPublishable.value ? "not-published-eligible" : "not-published-not-eligible";
			if (!containsTrigger.value) return "published-invalid-trigger";
			if (hasNodeIssues.value || hasRestrictedNodeTypes.value) return "published-node-issues";
			return hasUnpublishedChanges.value ? "published-with-changes" : "published-no-changes";
		});
		const collaborationReadOnly = computed(() => collaborationStore.shouldBeReadOnly);
		const hasUpdatePermission = computed(() => props.workflowPermissions.update);
		const hasPublishPermission = computed(() => props.workflowPermissions.publish);
		const hasUnpublishPermission = computed(() => props.workflowPermissions.unpublish);
		const isPersonalSpace = computed(() => projectStore.currentProject?.type === ProjectTypes.Personal);
		/**
		* Submitting changes needs publish rights and write access. An archived workflow
		* keeps the status readable but rejects writes. It also clears the same
		* publishability bar as the Publish button, so the two cannot drift apart.
		*/
		const canActOnReview = computed(() => !!hasPublishPermission.value && !collaborationReadOnly.value && !props.isArchived && isWorkflowPublishable.value);
		const canOpenReview = computed(() => latestReviewRequest.value?.viewerCanOpen ?? false);
		/**
		* Cancel autosave if scheduled or wait for it to finish if in progress
		* Save immediately if autosave idle or cancelled
		*/
		const saveBeforePublish = async () => {
			let saved = false;
			if (saveStore.autoSaveState === AutoSaveState.InProgress && saveStore.pendingSave) {
				autoSaveForPublish.value = true;
				try {
					await saveStore.pendingSave;
					saved = true;
				} catch {} finally {
					autoSaveForPublish.value = false;
				}
			} else if (saveStore.autoSaveState === AutoSaveState.Scheduled) cancelAutoSave();
			if (!saved || uiStore.stateIsDirty || props.isNewWorkflow) {
				autoSaveForPublish.value = true;
				saved = await saveCurrentWorkflow({}, true);
				autoSaveForPublish.value = false;
			}
			return saved;
		};
		const ensureWorkflowSaved = async () => {
			if (!uiStore.stateIsDirty && !props.isNewWorkflow) return true;
			return await saveBeforePublish();
		};
		const openPublishModal = () => {
			uiStore.openModalWithData({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {}
			});
		};
		const flushSaveForReview = async () => {
			if (!await ensureWorkflowSaved()) return void 0;
			return workflowDocumentStore.value.versionId || void 0;
		};
		const showReviewToast = (titleKey, reviewRequestId) => {
			const reviewRoute = {
				name: WORKFLOW_REVIEW_REQUESTS_VIEW,
				params: { reviewId: reviewRequestId }
			};
			const reviewUrl = router.resolve(reviewRoute).href;
			toast.showToast({
				type: "success",
				title: i18n.baseText(titleKey),
				message: `<a href="${reviewUrl}">${i18n.baseText("workflowReviews.editorBanner.openReview")}</a>`,
				onClick: (event) => {
					if (!(event?.target instanceof HTMLAnchorElement)) return;
					if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
					event.preventDefault();
					router.push(reviewRoute);
				}
			});
		};
		const onReviewSubmitted = (workflowReviewRequestId) => {
			submittedReviewRequestId.value = workflowReviewRequestId;
			showReviewToast("workflowReviews.submitted.title", workflowReviewRequestId);
			if (!submittedDialogDismissed.value) showReviewSubmittedDialog.value = true;
		};
		const onReviewUpdated = (workflowReviewRequestId) => {
			showReviewToast("workflowReviews.updateReview.toast", workflowReviewRequestId);
		};
		/** The submit dialog hit a 409: an open review exists, so offer updating it instead. */
		const onReviewConflict = () => {
			showUpdateReviewDialog.value = true;
		};
		/**
		* Save before opening. The dialog prefills the version name from the current
		* `versionId`, but submitting flushes a dirty editor into a *new* version, so
		* opening dirty would name the new version after the old one.
		*/
		const onSubmitChangesFromBanner = async () => {
			if (!await ensureWorkflowSaved()) return;
			if (reviewContainsSavedVersion.value) return;
			showUpdateReviewDialog.value = true;
		};
		const onOpenReviewFromBanner = async () => {
			const review = latestReviewRequest.value;
			if (!review) return;
			await router.push({
				name: WORKFLOW_REVIEW_REQUESTS_VIEW,
				params: { reviewId: review.id },
				query: review.state === "closed" ? { [REVIEW_INBOX_QUERY_PARAM.state]: review.state } : void 0
			});
		};
		const onPublishButtonClick = async () => {
			if (unusableCredentialReason.value) {
				toast.showMessage({
					title: unusableCredentialReason.value,
					type: "warning"
				});
				return;
			}
			if (!await ensureWorkflowSaved()) return;
			if (reviewsApply.value) {
				if (reviewStatusStore.hasOpenReview(props.id)) {
					if (reviewContainsSavedVersion.value) return;
					showUpdateReviewDialog.value = true;
					return;
				}
				if (effectiveReviewRequired.value) {
					showSubmitForReviewDialog.value = true;
					return;
				}
				if (!isApprovalAlwaysRequired.value && !publishChoiceDismissed.value) {
					showPublishChoiceDialog.value = true;
					return;
				}
			}
			openPublishModal();
		};
		const publishButtonConfig = computed(() => {
			if (unusableCredentialReason.value) return {
				text: i18n.baseText("workflows.publish"),
				enabled: false,
				loading: false,
				showIndicator: !!activeVersion.value,
				indicatorClass: activeVersion.value ? "published" : "",
				tooltip: unusableCredentialReason.value,
				showVersionInfo: !!activeVersion.value
			};
			if (!hasPublishPermission.value) {
				const defaultConfigForNoPermission = {
					text: i18n.baseText("workflows.publish"),
					enabled: false,
					loading: false,
					showIndicator: false,
					indicatorClass: "",
					tooltip: isPersonalSpace.value ? i18n.baseText("workflows.publish.personalSpaceRestricted") : i18n.baseText("workflows.publish.permissionDenied"),
					showVersionInfo: false
				};
				if (!!activeVersion.value) return {
					...defaultConfigForNoPermission,
					showIndicator: true,
					showVersionInfo: true,
					indicatorClass: "published"
				};
				else return defaultConfigForNoPermission;
			}
			if (props.isNewWorkflow) return {
				text: i18n.baseText("workflows.publish"),
				enabled: isWorkflowPublishable.value,
				loading: false,
				showIndicator: false,
				indicatorClass: "",
				tooltip: publishBlockedReason.value,
				showVersionInfo: false
			};
			return {
				"not-published-not-eligible": {
					text: i18n.baseText("workflows.publish"),
					enabled: false,
					loading: false,
					showIndicator: false,
					indicatorClass: "",
					tooltip: publishBlockedReason.value,
					showVersionInfo: false
				},
				"not-published-eligible": {
					text: i18n.baseText("workflows.publish"),
					enabled: true,
					loading: false,
					showIndicator: false,
					indicatorClass: "",
					tooltip: "",
					showVersionInfo: false
				},
				"published-no-changes": {
					text: i18n.baseText("generic.published"),
					enabled: false,
					loading: false,
					showIndicator: true,
					indicatorClass: "published",
					tooltip: "",
					showVersionInfo: true
				},
				"published-with-changes": {
					text: i18n.baseText("workflows.publish"),
					enabled: true,
					loading: false,
					showIndicator: true,
					indicatorClass: "changes",
					tooltip: i18n.baseText("workflows.publishModal.changes"),
					showVersionInfo: false
				},
				"published-node-issues": {
					text: i18n.baseText("workflows.publish"),
					enabled: false,
					loading: false,
					showIndicator: true,
					indicatorClass: "error",
					tooltip: publishBlockedReason.value,
					showVersionInfo: true
				},
				"published-invalid-trigger": {
					text: i18n.baseText("workflows.publish"),
					enabled: false,
					loading: false,
					showIndicator: true,
					indicatorClass: "changes",
					tooltip: i18n.baseText("workflows.publishModal.noTriggerMessage"),
					showVersionInfo: true
				},
				publishing: {
					text: i18n.baseText("workflows.publish.publishing"),
					enabled: false,
					loading: true,
					showIndicator: false,
					indicatorClass: "",
					tooltip: i18n.baseText("workflows.publish.publishing.tooltip"),
					showVersionInfo: false
				},
				"publication-partial": {
					text: i18n.baseText("workflows.publish"),
					enabled: isWorkflowPublishable.value,
					loading: false,
					showIndicator: true,
					indicatorClass: "partial",
					tooltip: i18n.baseText("workflows.publish.partial.tooltip"),
					showVersionInfo: false
				},
				"publication-failed": {
					text: i18n.baseText("workflows.publish"),
					enabled: isWorkflowPublishable.value,
					loading: false,
					showIndicator: true,
					indicatorClass: "error",
					tooltip: i18n.baseText("workflows.publish.failed.tooltip"),
					showVersionInfo: false
				}
			}[workflowPublishState.value];
		});
		const shouldHidePublishButton = computed(() => {
			if (props.isNewWorkflow) return false;
			return props.isArchived || !hasUpdatePermission.value && !hasPublishPermission.value;
		});
		const shouldDisablePublishButton = computed(() => {
			return props.isNewWorkflow || collaborationReadOnly.value || !publishButtonConfig.value.enabled || !hasPublishPermission.value || reviewsApply.value && isReviewUpdateBlocked.value;
		});
		const showSubmitForReview = computed(() => mustSubmitForReview.value && !shouldDisablePublishButton.value);
		const publishButtonText = computed(() => showSubmitForReview.value ? i18n.baseText("workflows.submitForReview") : publishButtonConfig.value.text);
		/**
		* A workflow that is ready to publish has nothing to explain, so the tooltip
		* stays off. A credential this user cannot use is the exception: the button is
		* disabled in that state too, and the reason is the only way to learn why.
		*/
		const isPublishTooltipDisabled = computed(() => {
			if (unusableCredentialReason.value) return false;
			return workflowPublishState.value === "not-published-eligible" && props.workflowPermissions.publish || !publishButtonConfig.value.tooltip && !(publishButtonConfig.value.showVersionInfo && activeVersion.value);
		});
		const activeVersion = computed(() => workflowDocumentStore.value.activeVersion ?? null);
		/**
		* The approved-but-unpublished banner is derived from publish history, so any
		* publish or unpublish — from this canvas, another surface, or a push — has to
		* re-resolve it. Watching the active version keeps publication code free of
		* review concerns. The header only renders once the workflow is hydrated, so
		* this never duplicates the sync's on-mount fetch.
		*/
		watch(() => ({
			workflowId: props.id,
			activeVersionId: activeVersion.value?.versionId ?? null
		}), (current, previous) => {
			if (current.workflowId !== previous.workflowId) return;
			if (current.activeVersionId === previous.activeVersionId) return;
			refetchReviewStatus();
		});
		const activeVersionName = computed(() => {
			if (!activeVersion.value) return "";
			return activeVersion.value.name ?? generateVersionLabelFromId(activeVersion.value.versionId);
		});
		const latestPublishDate = computed(() => {
			return getLastPublishedVersion(activeVersion.value?.workflowPublishHistory ?? [])?.createdAt;
		});
		const versionMenuActions = computed(() => {
			const actions = [{
				id: "publish",
				label: showSubmitForReview.value ? i18n.baseText("workflows.submitForReview") : i18n.baseText("workflows.publish"),
				shortcut: {
					shiftKey: true,
					keys: ["P"]
				},
				disabled: shouldDisablePublishButton.value
			}];
			if (isNamedVersionsEnabled.value) actions.push({
				id: "name-version",
				label: i18n.baseText("generic.nameVersion"),
				shortcut: {
					metaKey: true,
					keys: ["S"]
				},
				disabled: !hasUpdatePermission.value || !workflowDocumentStore.value.versionId
			});
			actions.push({
				id: "publish-timeline",
				label: i18n.baseText("workflowHistory.action.viewTimeline"),
				disabled: props.isNewWorkflow
			});
			actions.push({
				id: "unpublish",
				label: i18n.baseText("workflows.unpublish"),
				disabled: !activeVersion.value || collaborationReadOnly.value || !hasUnpublishPermission.value,
				divided: true,
				shortcut: {
					metaKey: true,
					keys: ["U"]
				}
			});
			return actions;
		});
		const shouldDisableActionDropdown = computed(() => {
			if (activeVersion.value) return false;
			return versionMenuActions.value.every((action) => action.disabled);
		});
		const onNameVersion = async () => {
			if (!await ensureWorkflowSaved()) return;
			const currentVersionId = workflowDocumentStore.value.versionId ?? "";
			const currentVersionData = workflowDocumentStore.value.versionData;
			const nameVersionEventBus = createEventBus();
			const modalData = ref({
				versionId: currentVersionId,
				versionName: currentVersionData?.name ?? void 0,
				description: currentVersionData?.description ?? void 0,
				modalTitle: i18n.baseText("workflowHistory.nameVersionModal.title"),
				submitButtonLabel: i18n.baseText("workflowHistory.nameVersionModal.confirmButton"),
				submitting: false,
				eventBus: nameVersionEventBus
			});
			nameVersionEventBus.once("submit", async (submitData) => {
				modalData.value.submitting = true;
				try {
					await workflowHistoryStore.updateWorkflowHistoryVersion(props.id, currentVersionId, {
						name: submitData.name,
						description: submitData.description
					});
					workflowDocumentStore.value.setVersionData({
						versionId: currentVersionId,
						name: submitData.name,
						description: submitData.description
					});
					toast.showMessage({
						title: i18n.baseText("workflowHistory.action.nameVersion.success.title"),
						type: "success"
					});
					uiStore.closeModal(WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY);
				} catch (error) {
					toast.showError(error, i18n.baseText("workflowHistory.action.nameVersion.error.title"));
				} finally {
					modalData.value.submitting = false;
				}
			});
			uiStore.openModalWithData({
				name: WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
				data: modalData.value
			});
		};
		const onUnpublish = () => {
			if (!activeVersion.value) {
				toast.showMessage({
					title: i18n.baseText("workflowHistory.action.unpublish.notAvailable"),
					type: "warning"
				});
				return;
			}
			const unpublishEventBus = createEventBus();
			unpublishEventBus.once("unpublish", async () => {
				const success = await workflowActivate.unpublishWorkflowFromHistory(props.id);
				uiStore.closeModal(WORKFLOW_HISTORY_VERSION_UNPUBLISH);
				if (success) toast.showMessage({
					title: i18n.baseText("workflowHistory.action.unpublish.success.title"),
					type: "success"
				});
			});
			uiStore.openModalWithData({
				name: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
				data: {
					workflowId: props.id,
					versionName: activeVersion.value.name,
					eventBus: unpublishEventBus
				}
			});
		};
		const onDropdownMenuSelect = async (action) => {
			switch (action) {
				case "publish":
					await onPublishButtonClick();
					break;
				case "name-version":
					await onNameVersion();
					break;
				case "publish-timeline":
					await router.push({
						name: VIEWS.WORKFLOW_HISTORY,
						params: { workflowId: props.id },
						query: { tab: WORKFLOW_HISTORY_PUBLISH_TIMELINE_TAB }
					});
					break;
				case "unpublish": onUnpublish();
			}
		};
		useKeybindings({
			shift_p: {
				disabled: () => shouldDisablePublishButton.value,
				run: async () => {
					await onPublishButtonClick();
				}
			},
			"ctrl+s": {
				disabled: () => !isNamedVersionsEnabled.value || !hasUpdatePermission.value || !workflowDocumentStore.value.versionId,
				run: async () => {
					await onNameVersion();
				}
			},
			"ctrl+u": {
				disabled: () => !activeVersion.value || !hasUnpublishPermission.value || collaborationReadOnly.value,
				run: onUnpublish
			}
		});
		onMounted(() => {
			nodeViewEventBus.on("publishWorkflow", onPublishButtonClick);
			nodeViewEventBus.on("unpublishWorkflow", onUnpublish);
		});
		onBeforeUnmount(() => {
			nodeViewEventBus.off("publishWorkflow", onPublishButtonClick);
			nodeViewEventBus.off("unpublishWorkflow", onUnpublish);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				!__props.isNewWorkflow ? (openBlock(), createBlock(CollaborationPane_default, { key: 0 })) : createCommentVNode("", true),
				showSaveButton.value && !__props.isArchived && __props.workflowPermissions.update ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					loading: isSaving.value,
					disabled: !unref(uiStore).stateIsDirty || collaborationReadOnly.value,
					"data-test-id": "workflow-save-button",
					onClick: onSaveButtonClick
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(uiStore).stateIsDirty ? unref(i18n).baseText("saveButton.save") : unref(i18n).baseText("saveButton.saved")), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])) : createCommentVNode("", true),
				showWorkflowReviewControls.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.reviewStatusBannerSlot)
				}, [createVNode(WorkflowReviewStatusBanner_default, {
					review: latestReviewRequest.value,
					"saved-version-id": savedVersionId.value,
					"can-submit-changes": canActOnReview.value,
					"submit-blocked-reason": publishBlockedReason.value,
					"can-open-review": canOpenReview.value,
					onOpenReview: onOpenReviewFromBanner,
					onSubmitChanges: onSubmitChangesFromBanner
				}, null, 8, [
					"review",
					"saved-version-id",
					"can-submit-changes",
					"submit-blocked-reason",
					"can-open-review"
				])], 2)) : createCommentVNode("", true),
				!shouldHidePublishButton.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.publishButtonWrapper)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.buttonGroup) }, [createVNode(unref(N8nTooltip_default), {
					disabled: isPublishTooltipDisabled.value,
					"show-after": 300,
					offset: 15
				}, {
					content: withCtx(() => [createBaseVNode("div", null, [
						publishButtonConfig.value.tooltip ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createBaseVNode("span", { class: normalizeClass(_ctx.$style.tooltipReason) }, toDisplayString(publishButtonConfig.value.tooltip), 3),
							_cache[5] || (_cache[5] = createTextVNode()),
							_cache[6] || (_cache[6] = createBaseVNode("br", null, null, -1))
						], 64)) : createCommentVNode("", true),
						activeVersion.value && publishButtonConfig.value.showVersionInfo ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
							createBaseVNode("span", _hoisted_1$1, toDisplayString(activeVersionName.value), 1),
							_cache[7] || (_cache[7] = createBaseVNode("br", null, null, -1)),
							createTextVNode(toDisplayString(unref(i18n).baseText("workflowHistory.item.active")) + " ", 1),
							latestPublishDate.value ? (openBlock(), createBlock(TimeAgo_default, {
								key: 0,
								date: latestPublishDate.value
							}, null, 8, ["date"])) : createCommentVNode("", true)
						], 64)) : createCommentVNode("", true),
						publicationFailures.value.length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
							_cache[9] || (_cache[9] = createBaseVNode("br", null, null, -1)),
							createTextVNode(" " + toDisplayString(unref(i18n).baseText("workflows.publish.failures.label")), 1),
							_cache[10] || (_cache[10] = createBaseVNode("br", null, null, -1)),
							(openBlock(true), createElementBlock(Fragment, null, renderList(publicationFailures.value, (failure) => {
								return openBlock(), createElementBlock("span", { key: failure.nodeId }, [createTextVNode(toDisplayString(failure.nodeName), 1), _cache[8] || (_cache[8] = createBaseVNode("br", null, null, -1))]);
							}), 128))
						], 64)) : createCommentVNode("", true)
					])]),
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						class: normalizeClass(_ctx.$style.groupButtonLeft),
						loading: autoSaveForPublish.value,
						disabled: !publishButtonConfig.value.enabled || shouldDisablePublishButton.value,
						variant: "ghost",
						"data-test-id": "workflow-open-publish-modal-button",
						onClick: onPublishButtonClick
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass([_ctx.$style.flex]) }, [
							publishButtonConfig.value.showIndicator ? (openBlock(), createElementBlock("span", {
								key: 0,
								"data-test-id": "workflow-active-version-indicator",
								class: normalizeClass({
									[_ctx.$style.indicatorDot]: true,
									[_ctx.$style.indicatorPublished]: publishButtonConfig.value.indicatorClass === "published",
									[_ctx.$style.indicatorChanges]: publishButtonConfig.value.indicatorClass === "changes",
									[_ctx.$style.indicatorIssues]: publishButtonConfig.value.indicatorClass === "error",
									[_ctx.$style.indicatorPartial]: publishButtonConfig.value.indicatorClass === "partial"
								})
							}, null, 2)) : createCommentVNode("", true),
							publishButtonConfig.value.loading ? (openBlock(), createBlock(unref(N8nSpinner_default), {
								key: 1,
								class: normalizeClass(_ctx.$style.publishingSpinner),
								size: "xsmall",
								"data-test-id": "publishing-spinner"
							}, null, 8, ["class"])) : createCommentVNode("", true),
							createBaseVNode("span", { class: normalizeClass([workflowPublishState.value === "published-no-changes" && _ctx.$style.indicatorPublishedText]) }, toDisplayString(publishButtonText.value), 3)
						], 2)]),
						_: 1
					}, 8, [
						"class",
						"loading",
						"disabled"
					])]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nActionDropdown_default), {
					items: versionMenuActions.value,
					width: showWorkflowReviewControls.value ? "230px" : void 0,
					placement: "bottom-end",
					"data-test-id": "version-menu",
					onSelect: onDropdownMenuSelect
				}, createSlots({
					activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						class: normalizeClass(_ctx.$style.groupButtonRight),
						variant: "ghost",
						icon: "chevron-down",
						disabled: shouldDisableActionDropdown.value,
						"aria-label": unref(i18n).baseText("node.moreActions"),
						"data-test-id": "version-menu-button"
					}, null, 8, [
						"class",
						"disabled",
						"aria-label"
					])]),
					_: 2
				}, [showWorkflowReviewControls.value ? {
					name: "footer",
					fn: withCtx(() => [createVNode(WorkflowReviewRequiredToggle_default, {
						"workflow-id": props.id,
						"locked-by-instance": isApprovalAlwaysRequired.value
					}, null, 8, ["workflow-id", "locked-by-instance"])]),
					key: "0"
				} : void 0]), 1032, ["items", "width"])], 2)], 2)) : createCommentVNode("", true),
				unref(isWorkflowReviewsEnabled) ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
					createVNode(WorkflowPublishChoiceDialog_default, {
						open: showPublishChoiceDialog.value,
						"onUpdate:open": _cache[0] || (_cache[0] = ($event) => showPublishChoiceDialog.value = $event),
						onPublish: openPublishModal,
						onSubmitForReview: _cache[1] || (_cache[1] = ($event) => showSubmitForReviewDialog.value = true)
					}, null, 8, ["open"]),
					createVNode(WorkflowSubmitForReviewDialog_default, {
						open: showSubmitForReviewDialog.value,
						"onUpdate:open": _cache[2] || (_cache[2] = ($event) => showSubmitForReviewDialog.value = $event),
						"workflow-id": props.id,
						"flush-save": flushSaveForReview,
						onSubmitted: onReviewSubmitted,
						onConflict: onReviewConflict
					}, null, 8, ["open", "workflow-id"]),
					submittedReviewRequestId.value ? (openBlock(), createBlock(WorkflowReviewSubmittedDialog_default, {
						key: 0,
						open: showReviewSubmittedDialog.value,
						"onUpdate:open": _cache[3] || (_cache[3] = ($event) => showReviewSubmittedDialog.value = $event),
						"workflow-review-request-id": submittedReviewRequestId.value
					}, null, 8, ["open", "workflow-review-request-id"])) : createCommentVNode("", true),
					createVNode(WorkflowUpdateReviewDialog_default, {
						open: showUpdateReviewDialog.value,
						"onUpdate:open": _cache[4] || (_cache[4] = ($event) => showUpdateReviewDialog.value = $event),
						"workflow-id": props.id,
						"flush-save": flushSaveForReview,
						"can-submit": !isReviewUpdateBlocked.value,
						onUpdated: onReviewUpdated
					}, null, 8, [
						"open",
						"workflow-id",
						"can-submit"
					])
				], 64)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1m61o_2",
	tooltipReason: "_tooltipReason_1m61o_7",
	activeVersionIndicator: "_activeVersionIndicator_1m61o_11",
	icon: "_icon_1m61o_15",
	reviewStatusBannerSlot: "_reviewStatusBannerSlot_1m61o_25",
	publishButtonWrapper: "_publishButtonWrapper_1m61o_31",
	buttonGroup: "_buttonGroup_1m61o_36",
	groupButtonLeft: "_groupButtonLeft_1m61o_42",
	groupButtonRight: "_groupButtonRight_1m61o_54",
	indicatorDot: "_indicatorDot_1m61o_64",
	publishingSpinner: "_publishingSpinner_1m61o_72",
	indicatorPublished: "_indicatorPublished_1m61o_76",
	indicatorPublishedText: "_indicatorPublishedText_1m61o_80",
	indicatorChanges: "_indicatorChanges_1m61o_84",
	indicatorIssues: "_indicatorIssues_1m61o_88",
	indicatorPartial: "_indicatorPartial_1m61o_92",
	flex: "_flex_1m61o_96"
} }]]);
//#endregion
//#region src/app/components/MainHeader/WorkflowDetails.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	class: "name-container",
	"data-test-id": "canvas-breadcrumbs"
};
var _hoisted_2 = { class: "spacer" };
var WorkflowDetails_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDetails",
	props: {
		id: {},
		tags: {},
		name: {},
		currentFolder: {},
		isArchived: { type: Boolean },
		description: {}
	},
	setup(__props) {
		const props = __props;
		const $style = useCssModule();
		const uiStore = useUIStore();
		const workflowsStore = useWorkflowsStore();
		const workflowsListStore = useWorkflowsListStore();
		const projectsStore = useProjectsStore();
		const collaborationStore = useCollaborationStore();
		const sourceControlStore = useSourceControlStore();
		const foldersStore = useFoldersStore();
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const locale = useI18n();
		const message = useMessage();
		const toast = useToast();
		const documentTitle = useDocumentTitle();
		const workflowId = useInjectWorkflowId();
		const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);
		const actionsMenuRef = useTemplateRef("actionsMenu");
		const isNewWorkflow = computed(() => {
			return !workflowsStore.isWorkflowSaved[props.id];
		});
		const workflowPermissions = computed(() => getResourcePermissions(workflowDocumentStore?.value?.scopes).workflow);
		const readOnly = computed(() => sourceControlStore.preferences.branchReadOnly || collaborationStore.shouldBeReadOnly);
		const readOnlyActions = computed(() => {
			if (isNewWorkflow.value) return readOnly.value;
			return readOnly.value || props.isArchived || !workflowPermissions.value.update;
		});
		const currentFolderForBreadcrumbs = computed(() => {
			if (!isNewWorkflow.value && props.currentFolder) return props.currentFolder;
			const folderId = route.query.parentFolderId;
			if (folderId) return foldersStore.getCachedFolder(folderId);
			return null;
		});
		watch(() => props.id, () => {
			renameInput.value?.forceCancel();
		});
		const renameInput = useTemplateRef("renameInput");
		function onNameToggle() {
			if (renameInput.value?.forceFocus) renameInput.value.forceFocus();
		}
		function onNameSubmit(name) {
			const newName = name.trim();
			if (!newName) {
				toast.showMessage({
					title: locale.baseText("renameAction.emptyName.title"),
					message: locale.baseText("renameAction.emptyName.message"),
					type: "error"
				});
				renameInput.value?.forceCancel();
				return;
			}
			if (newName === props.name) {
				renameInput.value?.forceCancel();
				return;
			}
			workflowDocumentStore?.value?.setName(newName);
			uiStore.markStateDirty("metadata");
			documentTitle.setDocumentTitle(newName, "IDLE");
			renameInput.value?.forceCancel();
		}
		async function handleArchiveWorkflow() {
			if (workflowDocumentStore?.value?.active) {
				if (await message.confirm(locale.baseText("mainSidebar.confirmMessage.workflowArchive.message", { interpolate: { workflowName: props.name } }), locale.baseText("mainSidebar.confirmMessage.workflowArchive.headline"), {
					type: "warning",
					confirmButtonText: locale.baseText("mainSidebar.confirmMessage.workflowArchive.confirmButtonText"),
					cancelButtonText: locale.baseText("mainSidebar.confirmMessage.workflowArchive.cancelButtonText")
				}) !== "confirm") return;
			}
			try {
				const expectedChecksum = props.id === workflowId.value ? workflowDocumentStore?.value?.checksum : void 0;
				await workflowsStore.archiveWorkflow(props.id, expectedChecksum);
				workflowDocumentStore?.value?.setActiveState({
					activeVersionId: null,
					activeVersion: null
				});
			} catch (error) {
				toast.showError(error, locale.baseText("generic.archiveWorkflowError"));
				return;
			}
			uiStore.markStateClean();
			const archivedWorkflowId = props.id;
			const archivedWorkflowName = props.name;
			const archiveToast = toast.showToast({
				title: locale.baseText("mainSidebar.showMessage.handleArchive.title", { interpolate: { workflowName: archivedWorkflowName } }),
				message: `<a href="#" data-test-id="archive-toast-delete-permanently-link">${locale.baseText("mainSidebar.showMessage.handleArchive.message")}</a>`,
				onClick: (event) => {
					if (event?.target instanceof HTMLAnchorElement) {
						event.preventDefault();
						deleteArchivedWorkflow(archivedWorkflowId, archivedWorkflowName, archiveToast);
					}
				},
				type: "success"
			});
			const homeProject = workflowDocumentStore?.value?.homeProject;
			if (homeProject) await router.push({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: homeProject.id }
			});
			else await router.push({ name: VIEWS.WORKFLOWS });
		}
		async function deleteArchivedWorkflow(id, name, archiveToast) {
			if (await message.confirm(locale.baseText("mainSidebar.confirmMessage.workflowDelete.message", { interpolate: { workflowName: name } }), locale.baseText("mainSidebar.confirmMessage.workflowDelete.headline"), {
				type: "warning",
				confirmButtonText: locale.baseText("mainSidebar.confirmMessage.workflowDelete.confirmButtonText"),
				cancelButtonText: locale.baseText("mainSidebar.confirmMessage.workflowDelete.cancelButtonText")
			}) !== "confirm") return;
			try {
				await workflowsListStore.deleteWorkflow(id);
			} catch (error) {
				toast.showError(error, locale.baseText("generic.deleteWorkflowError"));
				return;
			}
			archiveToast.close();
			toast.showMessage({
				title: locale.baseText("mainSidebar.showMessage.handleSelect1.title", { interpolate: { workflowName: name } }),
				type: "success"
			});
		}
		async function handleUnarchiveWorkflow() {
			await workflowsStore.unarchiveWorkflow(props.id);
			toast.showMessage({
				title: locale.baseText("mainSidebar.showMessage.handleUnarchive.title", { interpolate: { workflowName: props.name } }),
				type: "success"
			});
		}
		async function handleDeleteWorkflow() {
			if (await message.confirm(locale.baseText("mainSidebar.confirmMessage.workflowDelete.message", { interpolate: { workflowName: props.name } }), locale.baseText("mainSidebar.confirmMessage.workflowDelete.headline"), {
				type: "warning",
				confirmButtonText: locale.baseText("mainSidebar.confirmMessage.workflowDelete.confirmButtonText"),
				cancelButtonText: locale.baseText("mainSidebar.confirmMessage.workflowDelete.cancelButtonText")
			}) !== "confirm") return;
			const homeProject = workflowDocumentStore?.value?.homeProject;
			try {
				await workflowsListStore.deleteWorkflow(props.id);
			} catch (error) {
				toast.showError(error, locale.baseText("generic.deleteWorkflowError"));
				return;
			}
			uiStore.markStateClean();
			documentTitle.reset();
			toast.showMessage({
				title: locale.baseText("mainSidebar.showMessage.handleSelect1.title", { interpolate: { workflowName: props.name } }),
				type: "success"
			});
			if (homeProject) await router.push({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: homeProject.id }
			});
			else await router.push({ name: VIEWS.WORKFLOWS });
		}
		const onBreadcrumbsItemSelected = (item) => {
			if (item.href) router.push(item.href).catch((error) => {
				toast.showError(error, i18n.baseText("folders.open.error.title"));
			});
		};
		const handleImportWorkflowFromFile = () => {
			if (actionsMenuRef.value?.importFileRef) actionsMenuRef.value.importFileRef.click();
		};
		onMounted(() => {
			nodeViewEventBus.on("importWorkflowFromFile", handleImportWorkflowFromFile);
			nodeViewEventBus.on("archiveWorkflow", handleArchiveWorkflow);
			nodeViewEventBus.on("unarchiveWorkflow", handleUnarchiveWorkflow);
			nodeViewEventBus.on("deleteWorkflow", handleDeleteWorkflow);
			nodeViewEventBus.on("renameWorkflow", onNameToggle);
		});
		onBeforeUnmount(() => {
			nodeViewEventBus.off("importWorkflowFromFile", handleImportWorkflowFromFile);
			nodeViewEventBus.off("archiveWorkflow", handleArchiveWorkflow);
			nodeViewEventBus.off("unarchiveWorkflow", handleUnarchiveWorkflow);
			nodeViewEventBus.off("deleteWorkflow", handleDeleteWorkflow);
			nodeViewEventBus.off("renameWorkflow", onNameToggle);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(unref($style).container) }, [
				createBaseVNode("div", _hoisted_1, [createVNode(FolderBreadcrumbs_default, {
					"current-folder": currentFolderForBreadcrumbs.value,
					"current-folder-as-link": true,
					onItemSelected: onBreadcrumbsItemSelected
				}, {
					append: withCtx(() => [unref(projectsStore).currentProject ?? unref(projectsStore).personalProject ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(unref($style)["path-separator"])
					}, "/", 2)) : createCommentVNode("", true), (openBlock(), createBlock(unref(N8nInlineTextEdit_default), {
						ref_key: "renameInput",
						ref: renameInput,
						key: __props.id,
						placeholder: "Workflow name",
						"data-test-id": "workflow-name-input",
						class: "name",
						"model-value": __props.name,
						"max-length": unref(128),
						"max-width": "100%",
						"read-only": readOnlyActions.value,
						disabled: readOnlyActions.value,
						"onUpdate:modelValue": onNameSubmit
					}, null, 8, [
						"model-value",
						"max-length",
						"read-only",
						"disabled"
					]))]),
					_: 1
				}, 8, ["current-folder"])]),
				createVNode(ActionsDropdownMenu_default, {
					id: __props.id,
					ref: "actionsMenu",
					"workflow-permissions": workflowPermissions.value,
					"is-new-workflow": isNewWorkflow.value,
					"is-archived": __props.isArchived,
					name: __props.name,
					tags: __props.tags,
					"current-folder": currentFolderForBreadcrumbs.value ?? void 0
				}, null, 8, [
					"id",
					"workflow-permissions",
					"is-new-workflow",
					"is-archived",
					"name",
					"tags",
					"current-folder"
				]),
				createBaseVNode("span", _hoisted_2, [createBaseVNode("span", { class: normalizeClass(unref($style)["header-controls"]) }, [__props.isArchived ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					class: "ml-3xs",
					variant: "outline",
					"data-test-id": "workflow-archived-tag"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.item.archived")), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2)]),
				createVNode(ConnectionTracker_default, { class: "actions" }, {
					default: withCtx(() => [createVNode(WorkflowHeaderDraftPublishActions_default, {
						id: __props.id,
						"is-archived": __props.isArchived,
						"is-new-workflow": isNewWorkflow.value,
						"workflow-permissions": workflowPermissions.value
					}, null, 8, [
						"id",
						"is-archived",
						"is-new-workflow",
						"workflow-permissions"
					])]),
					_: 1
				})
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_qey36_1",
	"path-separator": "_path-separator_qey36_12",
	closeNodeViewDiscovery: "_closeNodeViewDiscovery_qey36_27",
	"header-controls": "_header-controls_qey36_34"
} }], ["__scopeId", "data-v-d3c1a7bc"]]);
//#endregion
//#region src/app/components/MainHeader/MainHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var MainHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MainHeader",
	setup(__props) {
		const router = useRouter();
		const route = useRoute();
		const locale = useI18n();
		const pushConnection = usePushConnection({ router });
		const toast = useToast();
		const ndvStore = injectNDVStoreIfProvided();
		const uiStore = useUIStore();
		const workflowsListStore = useWorkflowsListStore();
		const executionsStore = useExecutionsStore();
		const settingsStore = useSettingsStore();
		const activeHeaderTab = ref(MAIN_HEADER_TABS.WORKFLOW);
		const workflowToReturnTo = ref("");
		const executionToReturnTo = ref("");
		const dirtyState = ref(false);
		const evaluationRoutes = [VIEWS.EVALUATION_EDIT, VIEWS.EVALUATION_RUNS_DETAIL];
		const workflowRoutes = [
			VIEWS.WORKFLOW,
			VIEWS.NEW_WORKFLOW,
			VIEWS.EXECUTION_DEBUG
		];
		const executionRoutes = [
			VIEWS.EXECUTION_HOME,
			VIEWS.WORKFLOW_EXECUTIONS,
			VIEWS.EXECUTION_PREVIEW
		];
		const tabBarItems = computed(() => {
			return [
				{
					value: MAIN_HEADER_TABS.WORKFLOW,
					label: locale.baseText("generic.editor")
				},
				{
					value: MAIN_HEADER_TABS.EXECUTIONS,
					label: locale.baseText("generic.executions")
				},
				{
					value: MAIN_HEADER_TABS.EVALUATION,
					label: locale.baseText("generic.tests")
				}
			];
		});
		const activeNode = computed(() => ndvStore.value?.activeNode ?? null);
		const hideMenuBar = computed(() => Boolean(activeNode.value && activeNode.value.type !== "n8n-nodes-base.stickyNote"));
		const workflowId = useInjectWorkflowId();
		const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);
		const workflowName = computed(() => workflowDocumentStore?.value?.name ?? "");
		const workflowTags = computed(() => workflowDocumentStore?.value?.tags ?? []);
		const workflowIsArchived = computed(() => workflowDocumentStore?.value?.isArchived ?? false);
		const workflowDescription = computed(() => workflowDocumentStore?.value?.description ?? "");
		const onWorkflowPage = computed(() => !!(route.meta.nodeView || route.meta.keepWorkflowAlive));
		const parentFolderForBreadcrumbs = computed(() => {
			const folder = workflowDocumentStore?.value?.parentFolder;
			if (!folder) return void 0;
			return {
				id: folder.id,
				name: folder.name,
				parentFolder: folder.parentFolderId ?? void 0
			};
		});
		watch(route, (to, from) => {
			syncTabsWithRoute(to, from);
		});
		onBeforeMount(() => {
			pushConnection.initialize();
		});
		onBeforeUnmount(() => {
			pushConnection.terminate();
		});
		onMounted(async () => {
			dirtyState.value = uiStore.stateIsDirty;
			syncTabsWithRoute(route);
		});
		function isViewRoute(name) {
			return typeof name === "string" && [
				evaluationRoutes,
				workflowRoutes,
				executionRoutes
			].flat().includes(name);
		}
		function syncTabsWithRoute(to, from) {
			const routeTabMapping = [
				{
					routes: evaluationRoutes,
					tab: MAIN_HEADER_TABS.EVALUATION
				},
				{
					routes: executionRoutes,
					tab: MAIN_HEADER_TABS.EXECUTIONS
				},
				{
					routes: workflowRoutes,
					tab: MAIN_HEADER_TABS.WORKFLOW
				}
			];
			if (to.name && isViewRoute(to.name)) {
				const matchingTab = routeTabMapping.find(({ routes }) => routes.includes(to.name));
				if (matchingTab) activeHeaderTab.value = matchingTab.tab;
			}
			if (typeof to.params.workflowId === "string") workflowToReturnTo.value = to.params.workflowId;
			if (from?.name === VIEWS.EXECUTION_PREVIEW && to.params.workflowId === from.params.workflowId && typeof from.params.executionId === "string") executionToReturnTo.value = from.params.executionId;
		}
		function onTabSelected(tab, event) {
			const openInNewTab = event.ctrlKey || event.metaKey;
			switch (tab) {
				case MAIN_HEADER_TABS.WORKFLOW:
					navigateToWorkflowView(openInNewTab);
					break;
				case MAIN_HEADER_TABS.EXECUTIONS:
					navigateToExecutionsView(openInNewTab);
					break;
				case MAIN_HEADER_TABS.EVALUATION: navigateToEvaluationsView(openInNewTab);
			}
		}
		async function navigateToWorkflowView(openInNewTab) {
			let routeToNavigateTo;
			if (workflowToReturnTo.value && workflowToReturnTo.value !== "") routeToNavigateTo = {
				name: VIEWS.WORKFLOW,
				params: { workflowId: workflowToReturnTo.value },
				query: route.query
			};
			else routeToNavigateTo = {
				name: VIEWS.NEW_WORKFLOW,
				query: route.query
			};
			if (openInNewTab) {
				const { href } = router.resolve(routeToNavigateTo);
				window.open(href, "_blank");
			} else if (route.name !== routeToNavigateTo.name) {
				if (route.name === VIEWS.NEW_WORKFLOW) {
					if (dirtyState.value) uiStore.markStateDirty();
					else uiStore.markStateClean();
				}
				activeHeaderTab.value = MAIN_HEADER_TABS.WORKFLOW;
				await router.push(routeToNavigateTo);
			}
		}
		async function navigateToExecutionsView(openInNewTab) {
			const executionToReturnToValue = executionsStore.activeExecution?.id || executionToReturnTo.value;
			const routeToNavigateTo = executionToReturnToValue ? {
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId: workflowId.value,
					executionId: executionToReturnToValue
				},
				query: route.query
			} : {
				name: VIEWS.EXECUTION_HOME,
				params: { workflowId: workflowId.value },
				query: route.query
			};
			if (openInNewTab) {
				const { href } = router.resolve(routeToNavigateTo);
				window.open(href, "_blank");
			} else if (route.name !== routeToNavigateTo.name) {
				dirtyState.value = uiStore.stateIsDirty;
				workflowToReturnTo.value = workflowId.value;
				activeHeaderTab.value = MAIN_HEADER_TABS.EXECUTIONS;
				await router.push(routeToNavigateTo);
			}
		}
		async function navigateToEvaluationsView(openInNewTab) {
			const routeToNavigateTo = {
				name: VIEWS.EVALUATION_EDIT,
				params: { workflowId: workflowId.value },
				query: route.query
			};
			if (openInNewTab) {
				const { href } = router.resolve(routeToNavigateTo);
				window.open(href, "_blank");
			} else if (route.name !== routeToNavigateTo.name) {
				dirtyState.value = uiStore.stateIsDirty;
				workflowToReturnTo.value = workflowId.value;
				activeHeaderTab.value = MAIN_HEADER_TABS.EVALUATION;
				await router.push(routeToNavigateTo);
			}
		}
		async function onWorkflowDeactivated() {
			if (settingsStore.isModuleActive("mcp") && workflowDocumentStore?.value?.settings?.availableInMCP) try {
				const updatedWorkflow = await workflowsListStore.fetchWorkflow(workflowId.value);
				workflowDocumentStore?.value?.hydrate(updatedWorkflow);
				toast.showToast({
					title: locale.baseText("mcp.workflowDeactivated.title"),
					message: locale.baseText("mcp.workflowDeactivated.message"),
					type: "info"
				});
			} catch (error) {
				toast.showError(error, locale.baseText("workflowSettings.showError.fetchSettings.title"));
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass({
				[_ctx.$style["main-header"]]: true,
				[_ctx.$style.expanded]: !unref(uiStore).sidebarMenuCollapsed,
				[_ctx.$style["canvas-only"]]: unref(settingsStore).isCanvasOnly
			}) }, [!unref(settingsStore).isCanvasOnly ? withDirectives((openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style["top-menu"])
			}, [workflowName.value ? (openBlock(), createBlock(WorkflowDetails_default, {
				key: 0,
				id: unref(workflowId),
				tags: workflowTags.value,
				name: workflowName.value,
				"current-folder": parentFolderForBreadcrumbs.value,
				"is-archived": workflowIsArchived.value,
				description: workflowDescription.value,
				"onWorkflow:deactivated": onWorkflowDeactivated
			}, null, 8, [
				"id",
				"tags",
				"name",
				"current-folder",
				"is-archived",
				"description"
			])) : createCommentVNode("", true)], 2)), [[vShow, !hideMenuBar.value]]) : createCommentVNode("", true), onWorkflowPage.value ? (openBlock(), createBlock(TabBar_default, {
				key: 1,
				items: tabBarItems.value,
				"model-value": activeHeaderTab.value,
				floating: unref(settingsStore).isCanvasOnly,
				"onUpdate:modelValue": onTabSelected
			}, null, 8, [
				"items",
				"model-value",
				"floating"
			])) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_sqfsw_1",
	"main-header": "_main-header_sqfsw_8",
	"canvas-only": "_canvas-only_sqfsw_16",
	"top-menu": "_top-menu_sqfsw_22"
} }]]);
//#endregion
export { MainHeader_default as t };
