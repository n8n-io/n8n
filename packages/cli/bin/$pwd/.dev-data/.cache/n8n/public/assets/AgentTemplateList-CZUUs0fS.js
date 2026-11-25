import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $E as N8N_CHAT_INTEGRATION_TYPE, Jg as useUIStore, MA as RadioGroupItem_default, Rc as useAgentTelemetry, SN as _plugin_vue_export_helper_default, Xo as publishAgent, Yo as moveAgent, _N as N8nText_default, ah as AGENT_PUBLISHED_MODAL_KEY, as as unarchiveAgent, bC as useRootStore, cN as Input_default, cc as deleteFolder, co as getAgent, dC as useToast, dx as MODAL_CONFIRM, eO as folderNameSchema, es as revertAgentToPublished, fc as moveFolder, gM as N8nInputLabel_default, jA as RadioGroup_default, jN as useI18n, lc as getFolderContent, os as unpublishAgent, pC as useStorage, pc as renameFolder, ph as AGENT_VERSION_METADATA_MODAL_KEY, qa as archiveAgent, sc as createFolder, wy as TELEMETRY_EVENT, xN as N8nIcon_default, yN as N8nButton_default, yo as getAgentVersion, zc as useAgentsN8nChatFlag } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { n as removeProjectAgentFromListCache, r as upsertProjectAgentsListCache, t as invalidateProjectAgentsListCache } from "./useProjectAgentsList-yCWZeTO1.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { t as MoveToFolderDropdown_default } from "./MoveToFolderDropdown-D_YeLgLU.js";
//#region src/features/agents/components/AgentFolderDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { for: "agent-folder-name" };
var _hoisted_2$1 = { for: "agent-move-project" };
var _hoisted_3$1 = { for: "agent-folder-target" };
var _hoisted_4 = { for: "agent-folder-target" };
var AgentFolderDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentFolderDialog",
	props: {
		projectId: {},
		action: {}
	},
	emits: ["close", "saved"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const toast = useToast();
		const { safeTrack } = useAgentTelemetry();
		const { projectName, projectIcon } = useAgentProjectBreadcrumb(computed(() => props.projectId));
		const name = ref("");
		const removal = ref("");
		const deleteConfirmText = ref("");
		const busy = ref(false);
		const loading = ref(false);
		const loadFailed = ref(false);
		const error = ref("");
		const count = ref(0);
		const subFolderCount = ref(0);
		let generation = 0;
		const selectedLocation = ref(null);
		const isNaming = computed(() => props.action?.mode === "create" || props.action?.mode === "rename");
		const isDelete = computed(() => props.action?.mode === "delete");
		const isMoving = computed(() => props.action?.mode === "moveAgent" || props.action?.mode === "moveFolder");
		const confirmationText = computed(() => i18n.baseText("folders.delete.typeToConfirm", { interpolate: { folderName: props.action?.name ?? "" } }));
		const canSave = computed(() => {
			if (loading.value || loadFailed.value || busy.value) return false;
			if (isDelete.value) return removal.value === "relocate" ? selectedLocation.value !== null : removal.value === "archive" && deleteConfirmText.value === confirmationText.value;
			return !isMoving.value || selectedLocation.value !== null;
		});
		const contentDescription = computed(() => {
			const labels = [];
			if (subFolderCount.value > 0) labels.push(i18n.baseText("folders.move.modal.folder.count", { interpolate: { count: subFolderCount.value } }));
			if (count.value > 0) labels.push(i18n.baseText("agents.folders.agentCount", { interpolate: { count: count.value } }));
			return labels.length ? i18n.baseText("agents.folders.deleteContents", { interpolate: { contents: labels.join(` ${i18n.baseText("generic.and")} `) } }) : i18n.baseText("agents.folders.deleteContentsFallback");
		});
		const moveLabel = computed(() => props.action?.mode === "moveAgent" ? i18n.baseText("agents.folders.moveAgent") : i18n.baseText("folders.move.modal.confirm", { interpolate: { resourceTypeLabel: i18n.baseText("generic.folder").toLowerCase() } }));
		const title = computed(() => {
			if (props.action?.mode === "create") return i18n.baseText("agents.folders.create");
			if (props.action?.mode === "rename") return i18n.baseText("agents.folders.rename");
			if (isDelete.value) return i18n.baseText("folders.delete.confirm.title", { interpolate: { folderName: props.action?.name ?? "" } });
			if (props.action?.mode === "moveAgent") return i18n.baseText("agents.folders.moveAgentTitle", { interpolate: { name: props.action.name ?? "" } }).trim();
			return i18n.baseText("folders.move.modal.title", { interpolate: {
				resourceTypeLabel: i18n.baseText("generic.folder").toLowerCase(),
				folderName: props.action?.name ?? ""
			} }).trim();
		});
		watch(() => props.action, async (action) => {
			const requestGeneration = ++generation;
			loading.value = false;
			loadFailed.value = false;
			selectedLocation.value = null;
			if (!action) return;
			name.value = action.name ?? "";
			removal.value = "";
			deleteConfirmText.value = "";
			error.value = "";
			count.value = 0;
			subFolderCount.value = 0;
			if (action.mode !== "delete" || !action.id) return;
			loading.value = true;
			try {
				const contents = await getFolderContent(rootStore.restApiContext, props.projectId, action.id);
				if (generation !== requestGeneration) return;
				count.value = contents.totalAgents;
				subFolderCount.value = contents.totalSubFolders;
			} catch (cause) {
				if (generation !== requestGeneration) return;
				loadFailed.value = true;
				toast.showError(cause, i18n.baseText("agents.folders.error"));
			} finally {
				if (generation === requestGeneration) loading.value = false;
			}
		}, { immediate: true });
		function onDestinationError(cause) {
			selectedLocation.value = null;
			toast.showError(cause, i18n.baseText("agents.folders.error"));
		}
		async function save() {
			const action = props.action;
			if (!action || !canSave.value) return;
			if (isNaming.value) {
				const result = folderNameSchema.safeParse(name.value);
				if (!result.success) {
					error.value = i18n.baseText("agents.folders.invalidName");
					return;
				}
				name.value = result.data;
			}
			busy.value = true;
			try {
				const context = rootStore.restApiContext;
				const target = selectedLocation.value?.resource === "project" ? "0" : selectedLocation.value?.id ?? "0";
				if (action.mode === "create") {
					const folder = await createFolder(context, props.projectId, name.value, action.parentFolderId ?? void 0, "agent");
					safeTrack(TELEMETRY_EVENT.PLATFORM.USER_CREATED_FOLDER, {
						folder_id: folder.id,
						resource_type: "agent"
					});
				} else if (action.id && action.mode === "rename") {
					await renameFolder(context, props.projectId, action.id, name.value);
					safeTrack(TELEMETRY_EVENT.PLATFORM.USER_RENAMED_FOLDER, {
						folder_id: action.id,
						resource_type: "agent"
					});
				} else if (action.id && action.mode === "moveFolder") await moveFolder(context, props.projectId, action.id, target);
				else if (action.id && action.mode === "moveAgent") {
					await moveAgent(context, props.projectId, action.id, target === "0" ? null : target);
					safeTrack(TELEMETRY_EVENT.PLATFORM.USER_MOVED_CONTENT, {
						agent_id: action.id,
						resource_type: "agent",
						source_folder_id: action.parentFolderId,
						destination_folder_id: target
					});
				} else if (action.id && action.mode === "delete") {
					await deleteFolder(context, props.projectId, action.id, removal.value === "archive" ? void 0 : target);
					safeTrack(TELEMETRY_EVENT.PLATFORM.USER_DELETED_FOLDER, {
						folder_id: action.id,
						resource_type: "agent",
						deleted_sub_folders: subFolderCount.value,
						deleted_sub_agents: count.value
					});
				}
				invalidateProjectAgentsListCache(props.projectId);
				emit("saved");
				emit("close");
			} catch (cause) {
				toast.showError(cause, i18n.baseText("agents.folders.error"));
			} finally {
				busy.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: __props.action !== null,
				title: title.value,
				size: isDelete.value ? "large" : isMoving.value ? "medium" : "small",
				busy: busy.value,
				"onUpdate:open": _cache[5] || (_cache[5] = ($event) => !$event && emit("close"))
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: isDelete.value ? "destructive" : "solid",
					loading: busy.value,
					disabled: !canSave.value,
					"data-testid": "agent-folder-save",
					onClick: save
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(isDelete.value ? unref(i18n).baseText("agents.folders.deleteTitle") : isMoving.value ? moveLabel.value : unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, [
					"variant",
					"loading",
					"disabled"
				])]),
				default: withCtx(() => [createBaseVNode("form", {
					class: normalizeClass(_ctx.$style.fields),
					onSubmit: withModifiers(save, ["prevent"])
				}, [isNaming.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
					createBaseVNode("label", _hoisted_1$1, toDisplayString(unref(i18n).baseText("generic.name")), 1),
					createVNode(unref(Input_default), {
						id: "agent-folder-name",
						modelValue: name.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
						maxlength: 128,
						"data-testid": "agent-folder-name"
					}, null, 8, ["modelValue"]),
					error.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "danger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(error.value), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 64)) : isMoving.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createBaseVNode("label", _hoisted_2$1, toDisplayString(unref(i18n).baseText("folders.move.modal.project.label")), 1), createVNode(unref(Input_default), {
					id: "agent-move-project",
					"model-value": unref(projectName) ?? "",
					disabled: "",
					title: unref(i18n).baseText("agents.folders.sameProject"),
					"data-testid": "agent-move-project"
				}, {
					prefix: withCtx(() => [createVNode(ProjectIcon_default, {
						icon: unref(projectIcon),
						size: "small",
						"border-less": ""
					}, null, 8, ["icon"])]),
					_: 1
				}, 8, ["model-value", "title"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createBaseVNode("label", _hoisted_3$1, toDisplayString(unref(i18n).baseText("folders.move.modal.folder.label")), 1), (openBlock(), createBlock(MoveToFolderDropdown_default, {
					key: __props.action?.id,
					"input-id": "agent-folder-target",
					"selected-location": selectedLocation.value,
					"selected-project-id": __props.projectId,
					"current-project-id": __props.projectId,
					"current-folder-id": __props.action?.mode === "moveFolder" ? __props.action.id : void 0,
					"parent-folder-id": __props.action?.parentFolderId ?? void 0,
					"resource-type": "agent",
					autofocus: "",
					teleported: false,
					"data-testid": "agent-folder-target",
					"onLocation:selected": _cache[1] || (_cache[1] = ($event) => selectedLocation.value = $event),
					"onLoad:error": onDestinationError
				}, null, 8, [
					"selected-location",
					"selected-project-id",
					"current-project-id",
					"current-folder-id",
					"parent-folder-id"
				]))], 2)], 64)) : isDelete.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nText_default), { id: "agent-folder-delete-description" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(contentDescription.value), 1)]),
					_: 1
				}), createVNode(unref(RadioGroup_default), {
					modelValue: removal.value,
					"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => removal.value = $event),
					"aria-labelledby": "agent-folder-delete-description",
					"data-testid": "agent-folder-removal"
				}, {
					default: withCtx(() => [__props.action?.canRelocate !== false ? (openBlock(), createBlock(unref(RadioGroupItem_default), {
						key: 0,
						value: "relocate",
						"data-testid": "agent-folder-relocate"
					}, {
						label: withCtx(() => [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(projectName) ? "agents.folders.relocate" : "agents.folders.relocate.noProject", { interpolate: { projectName: unref(projectName) ?? "" } })), 1)]),
							_: 1
						})]),
						content: withCtx(() => [removal.value === "relocate" ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.optionContent)
						}, [createBaseVNode("label", _hoisted_4, toDisplayString(unref(i18n).baseText("folders.transfer.selectFolder")), 1), (openBlock(), createBlock(MoveToFolderDropdown_default, {
							key: __props.action?.id,
							"input-id": "agent-folder-target",
							"selected-location": selectedLocation.value,
							"selected-project-id": __props.projectId,
							"current-project-id": __props.projectId,
							"current-folder-id": __props.action?.id,
							"resource-type": "agent",
							teleported: false,
							"data-testid": "agent-folder-target",
							"onLocation:selected": _cache[2] || (_cache[2] = ($event) => selectedLocation.value = $event),
							"onLoad:error": onDestinationError
						}, null, 8, [
							"selected-location",
							"selected-project-id",
							"current-project-id",
							"current-folder-id"
						]))], 2)) : createCommentVNode("", true)]),
						_: 1
					})) : createCommentVNode("", true), __props.action?.canDelete !== false ? (openBlock(), createBlock(unref(RadioGroupItem_default), {
						key: 1,
						value: "archive",
						"data-testid": "agent-folder-archive"
					}, {
						label: withCtx(() => [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.folders.archive")), 1)]),
							_: 1
						})]),
						content: withCtx(() => [removal.value === "archive" ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.optionContent)
						}, [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.folders.archiveDescription", {
								adjustToNumber: count.value,
								interpolate: { count: count.value }
							})), 1)]),
							_: 1
						}), createVNode(unref(N8nInputLabel_default), {
							"input-name": "agent-folder-delete-confirm",
							label: unref(i18n).baseText("folders.delete.confirmation.message", { interpolate: { folderName: __props.action?.name ?? "" } })
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "agent-folder-delete-confirm",
								modelValue: deleteConfirmText.value,
								"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => deleteConfirmText.value = $event),
								placeholder: confirmationText.value,
								"data-testid": "agent-folder-delete-confirm"
							}, null, 8, ["modelValue", "placeholder"])]),
							_: 1
						}, 8, ["label"])], 2)) : createCommentVNode("", true)]),
						_: 1
					})) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["modelValue"])], 64)) : createCommentVNode("", true)], 34)]),
				_: 1
			}, 8, [
				"open",
				"title",
				"size",
				"busy"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	fields: "_fields_1okoj_1",
	field: "_field_1okoj_1",
	optionContent: "_optionContent_1okoj_13"
} }]]);
//#endregion
//#region src/features/agents/composables/useAgentArchive.ts
var agentIdsInFlight = /* @__PURE__ */ new Set();
/**
* Shared archive/unarchive flow used by the builder header menu and the list card.
* Owns the confirmation modal, toasts, error handling, and the project list cache.
*/
function useAgentArchive() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	async function confirmArchivePublished(agentName) {
		return await openAgentConfirmationModal({
			title: locale.baseText("agents.archive.modal.title", { interpolate: { name: agentName } }),
			description: locale.baseText("agents.archive.modal.description"),
			confirmButtonText: locale.baseText("menuActions.archive"),
			cancelButtonText: locale.baseText("generic.cancel")
		}) === MODAL_CONFIRM;
	}
	async function archive(agent) {
		if (agent.activeVersionId !== null && !await confirmArchivePublished(agent.name)) return null;
		if (agentIdsInFlight.has(agent.id)) return null;
		agentIdsInFlight.add(agent.id);
		try {
			const updated = await archiveAgent(rootStore.restApiContext, agent.projectId, agent.id);
			removeProjectAgentFromListCache(agent.projectId, agent.id);
			showMessage({
				title: locale.baseText("agents.archive.toast.archived"),
				type: "success"
			});
			return updated;
		} catch (error) {
			showError(error, locale.baseText("agents.archive.error.archive"));
			return null;
		} finally {
			agentIdsInFlight.delete(agent.id);
		}
	}
	async function unarchive(agent) {
		if (agentIdsInFlight.has(agent.id)) return null;
		agentIdsInFlight.add(agent.id);
		try {
			const updated = await unarchiveAgent(rootStore.restApiContext, agent.projectId, agent.id);
			upsertProjectAgentsListCache(agent.projectId, updated);
			showMessage({
				title: locale.baseText("agents.archive.toast.unarchived"),
				type: "success"
			});
			return updated;
		} catch (error) {
			showError(error, locale.baseText("agents.archive.error.unarchive"));
			return null;
		} finally {
			agentIdsInFlight.delete(agent.id);
		}
	}
	return {
		archive,
		unarchive
	};
}
//#endregion
//#region src/features/agents/agentTemplates.ts
/** Distinct from the home-screen suggestion catalog (`v1`). */
var AGENT_TEMPLATE_SUGGESTIONS_VERSION = "agent-templates-v1";
function isAgentStarter(value) {
	if (typeof value !== "object" || value === null) return false;
	const starter = value;
	if (starter.kind === "prompt") return typeof starter.text === "string" && starter.text.trim() !== "";
	if (starter.kind === "template") return typeof starter.templateId === "string" && starter.templateId !== "";
	return false;
}
var AGENT_TEMPLATES = [
	{
		id: "morning-news-brief",
		labelKey: "agents.builder.templates.morningNewsBrief.label",
		descriptionKey: "agents.builder.templates.morningNewsBrief.description",
		placeholderKey: "agents.builder.templates.morningNewsBrief.placeholder",
		icon: "sun",
		gradient: {
			from: "#F5A524",
			to: "#FF5A1F",
			angle: 160,
			fromStop: 8,
			toStop: 92
		},
		config: {
			name: "Morning News Brief",
			instructions: "You are a news brief agent. Every morning at 9am, search the web for today’s top headlines and compile a concise summary. For each story include a headline, a one-sentence summary, and a source link. Limit the brief to five stories.",
			config: { webSearch: {
				enabled: true,
				provider: "native"
			} }
		},
		tasks: [{
			name: "Morning news brief",
			objective: "Search the web for today’s top headlines and compile a concise summary. For each story include a headline, a one-sentence summary, and a source link. Limit the brief to five stories.",
			cronExpression: "0 9 * * *"
		}]
	},
	{
		id: "process-incoming-emails",
		labelKey: "agents.builder.templates.processIncomingEmails.label",
		descriptionKey: "agents.builder.templates.processIncomingEmails.description",
		placeholderKey: "agents.builder.templates.processIncomingEmails.placeholder",
		icon: "mail",
		gradient: {
			from: "#2563EB",
			to: "#7C3AED",
			angle: 135,
			fromStop: 0,
			toStop: 100
		},
		config: {
			name: "Process Incoming Emails",
			instructions: "You are an email processing agent. Read new emails from Gmail, identify action items, and update the user’s Google Calendar with any meetings, deadlines, or follow-ups mentioned. Summarize each email and flag urgent items.",
			tools: [{
				type: "node",
				name: "Gmail",
				description: "Read and send emails through Gmail.",
				node: {
					nodeType: "n8n-nodes-base.gmail",
					nodeTypeVersion: 2,
					nodeParameters: {
						resource: "message",
						operation: "getAll"
					},
					credentials: { gmailOAuth2: {
						id: "",
						name: "gmailOAuth2"
					} }
				}
			}, {
				type: "node",
				name: "Google Calendar",
				description: "Create and update calendar events.",
				node: {
					nodeType: "n8n-nodes-base.googleCalendar",
					nodeTypeVersion: 1,
					nodeParameters: {
						resource: "event",
						operation: "create",
						start: "={{ $fromAI('start', 'Event start time', 'string') }}",
						end: "={{ $fromAI('end', 'Event end time', 'string') }}"
					},
					credentials: { googleCalendarOAuth2Api: {
						id: "",
						name: "googleCalendarOAuth2Api"
					} }
				}
			}]
		}
	},
	{
		id: "qualify-new-leads",
		labelKey: "agents.builder.templates.qualifyNewLeads.label",
		descriptionKey: "agents.builder.templates.qualifyNewLeads.description",
		placeholderKey: "agents.builder.templates.qualifyNewLeads.placeholder",
		icon: "users",
		gradient: {
			from: "#059669",
			to: "#84CC16",
			angle: 120,
			fromStop: 4,
			toStop: 88
		},
		config: {
			name: "Qualify New Leads",
			instructions: "You are a lead qualification agent. Score new leads from the CRM based on their profile, activity, and engagement. Route high-scoring leads to sales for immediate follow-up, and nurture low-scoring leads with relevant content."
		}
	},
	{
		id: "propose-meeting-times",
		labelKey: "agents.builder.templates.proposeMeetingTimes.label",
		descriptionKey: "agents.builder.templates.proposeMeetingTimes.description",
		placeholderKey: "agents.builder.templates.proposeMeetingTimes.placeholder",
		icon: "calendar",
		gradient: {
			from: "#0F766E",
			to: "#2DD4BF",
			angle: 150,
			fromStop: 4,
			toStop: 96
		},
		config: {
			name: "Propose Meeting Times",
			instructions: "You are a scheduling agent. Find open slots on the user’s Google Calendar and suggest a few meeting times. Match the requested duration and time window. Do not book a meeting until the user confirms a time.",
			tools: [{
				type: "node",
				name: "Google Calendar",
				description: "Find open slots on Google Calendar.",
				node: {
					nodeType: "n8n-nodes-base.googleCalendar",
					nodeTypeVersion: 1.3,
					nodeParameters: {
						resource: "calendar",
						operation: "availability",
						timeMin: "={{ $fromAI('timeMin', 'Start of the interval to check', 'string') }}",
						timeMax: "={{ $fromAI('timeMax', 'End of the interval to check', 'string') }}"
					},
					credentials: { googleCalendarOAuth2Api: {
						id: "",
						name: "googleCalendarOAuth2Api"
					} }
				}
			}]
		}
	}
];
var isN8nChat = (integration) => integration.type === N8N_CHAT_INTEGRATION_TYPE;
/**
* A blank agent: no instructions, no tools, and no channel integrations.
* `name` and `model` are ignored — both are seeded on every new agent, so a
* default name or model does not count as content the user would lose by
* applying a template. n8n Chat is ignored for the same reason.
*/
function isAgentConfigBlank(config) {
	return config.instructions.trim() === "" && (config.tools?.length ?? 0) === 0 && (config.integrations ?? []).every(isN8nChat);
}
/**
* Returns the config with the template written onto it, or `null` when the
* agent already has content (instructions or tools). `name` is only replaced
* while it still equals `defaultName` (the seeded "Untitled"), so a renamed
* agent keeps its name. The template icon and gradient replace the
* personalisation. `model`, a default n8n Chat channel and every other field
* are preserved.
*/
function applyAgentTemplate(config, template, defaultName) {
	if (!isAgentConfigBlank(config)) return null;
	return {
		...config,
		name: config.name === defaultName ? template.config.name : config.name,
		instructions: template.config.instructions,
		tools: template.config.tools ?? [],
		integrations: [...(config.integrations ?? []).filter(isN8nChat), ...(template.config.integrations ?? []).filter((integration) => !isN8nChat(integration))],
		config: {
			...config.config,
			...template.config.config
		},
		personalisation: {
			icon: template.icon,
			gradient: { ...template.gradient }
		}
	};
}
//#endregion
//#region src/features/agents/composables/useAgentVersionMetadataModal.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function useAgentVersionMetadataModal() {
	const uiStore = useUIStore();
	let cancelPending;
	let disposed = false;
	onScopeDispose(() => {
		disposed = true;
		cancelPending?.();
	}, true);
	async function openVersionMetadata({ isCurrent = () => true, ...options }) {
		if (disposed || !isCurrent()) return false;
		cancelPending?.();
		return await new Promise((resolve) => {
			let closed = false;
			const stopWatching = watch(isCurrent, (current) => {
				if (!current) cancelPending?.();
			}, { flush: "sync" });
			const finish = (saved) => {
				if (closed) return;
				closed = true;
				stopWatching();
				cancelPending = void 0;
				resolve(saved);
			};
			cancelPending = () => {
				uiStore.closeModal(AGENT_VERSION_METADATA_MODAL_KEY);
				finish(false);
			};
			uiStore.openModalWithData({
				name: AGENT_VERSION_METADATA_MODAL_KEY,
				data: {
					...options,
					onSubmit: async (metadata) => {
						if (closed || !isCurrent()) return false;
						const saved = await options.onSubmit(metadata);
						return !closed && saved;
					},
					onClose: finish
				}
			});
		});
	}
	return { openVersionMetadata };
}
//#endregion
//#region src/features/agents/composables/useAgentPublish.ts
init_reactivity_esm_bundler();
/**
* Opens the "Agent published" confirmation modal after a successful publish,
* unless the user opted out with "Don't show again". Shared by the
* header/list publish flow and the version-history republish flow (AGENT-1102).
*/
function showAgentPublishedConfirmation(agent) {
	if (useStorage("N8N_HIDE_AGENT_PUBLISHED_CONFIRMATION").value === "true") return;
	const n8nChatLive = useAgentsN8nChatFlag().value && (agent.activeVersion?.integrations ?? []).some(({ type }) => type === "n8n_chat");
	useUIStore().openModalWithData({
		name: AGENT_PUBLISHED_MODAL_KEY,
		data: {
			agentId: agent.id,
			projectId: agent.projectId,
			n8nChatLive
		}
	});
}
/**
* Shared publish/unpublish flow used by the builder header button and the list card.
* Owns the confirmation modal, toasts, error handling, and the `publishing` spinner
* state so both call sites stay thin and behave consistently.
*/
function useAgentPublish() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const { trackRevertedChangesOnAgent } = useAgentTelemetry();
	const publishing = ref(false);
	const { openVersionMetadata } = useAgentVersionMetadataModal();
	async function publish(projectId, agentId, versionId, isCurrent = () => true) {
		if (publishing.value) return null;
		publishing.value = true;
		try {
			const currentDraft = versionId ? void 0 : await getAgent(rootStore.restApiContext, projectId, agentId);
			const selectedId = versionId ?? currentDraft?.versionId;
			if (!selectedId) return null;
			const draft = currentDraft ? {
				versionId: selectedId,
				skillVersions: Object.fromEntries(Object.entries(currentDraft.skillVersions ?? {}).map(([id, info]) => [id, info.draft]))
			} : void 0;
			const version = await getAgentVersion(rootStore.restApiContext, projectId, agentId, selectedId);
			if (!isCurrent()) return null;
			let updated = null;
			if (await openVersionMetadata({
				mode: "publish",
				versionId: selectedId,
				isCurrent,
				name: version.name,
				description: version.description,
				onSubmit: async (metadata) => {
					try {
						updated = await publishAgent(rootStore.restApiContext, projectId, agentId, versionId, metadata, draft);
						upsertProjectAgentsListCache(projectId, updated);
						showMessage({
							title: locale.baseText("agents.publish.toast.published"),
							type: "success"
						});
						return true;
					} catch (error) {
						showError(error, locale.baseText("agents.publish.error.publish"));
						return false;
					}
				}
			}) && updated && isCurrent()) showAgentPublishedConfirmation(updated);
			return updated;
		} catch (error) {
			showError(error, locale.baseText("agents.publish.error.publish"));
			return null;
		} finally {
			publishing.value = false;
		}
	}
	async function unpublish(projectId, agentId, agentName) {
		if (publishing.value) return null;
		if (await openAgentConfirmationModal({
			title: locale.baseText("agents.unpublish.modal.title", { interpolate: { name: agentName ?? "" } }),
			description: locale.baseText("agents.unpublish.modal.description"),
			confirmButtonText: locale.baseText("agents.unpublish.modal.button.unpublish"),
			cancelButtonText: locale.baseText("generic.cancel")
		}) !== "confirm") return null;
		publishing.value = true;
		try {
			const updated = await unpublishAgent(rootStore.restApiContext, projectId, agentId);
			upsertProjectAgentsListCache(projectId, updated);
			showMessage({
				title: locale.baseText("agents.publish.toast.unpublished"),
				type: "success"
			});
			return updated;
		} catch (error) {
			showError(error, locale.baseText("agents.publish.error.unpublish"));
			return null;
		} finally {
			publishing.value = false;
		}
	}
	async function revertToPublished(projectId, agentId) {
		if (publishing.value) return null;
		if (await openAgentConfirmationModal({
			title: locale.baseText("agents.revertToPublished.modal.title"),
			description: locale.baseText("agents.revertToPublished.modal.description"),
			confirmButtonText: locale.baseText("agents.revertToPublished.modal.button.revert"),
			cancelButtonText: locale.baseText("generic.cancel")
		}) !== "confirm") return null;
		publishing.value = true;
		try {
			const updated = await revertAgentToPublished(rootStore.restApiContext, projectId, agentId);
			trackRevertedChangesOnAgent({ agentId });
			upsertProjectAgentsListCache(projectId, updated);
			showMessage({
				title: locale.baseText("agents.publish.toast.reverted"),
				type: "success"
			});
			return updated;
		} catch (error) {
			showError(error, locale.baseText("agents.publish.error.revert"));
			return null;
		} finally {
			publishing.value = false;
		}
	}
	return {
		publish,
		unpublish,
		revertToPublished,
		publishing
	};
}
//#endregion
//#region src/features/agents/components/AgentTemplateList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var _hoisted_2 = ["onClick"];
var _hoisted_3 = ["data-test-id"];
var AgentTemplateList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTemplateList",
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("ul", { class: normalizeClass(_ctx.$style.examples) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(AGENT_TEMPLATES), (template, index) => {
				return openBlock(), createElementBlock("li", {
					key: template.id,
					class: normalizeClass(_ctx.$style.example),
					style: normalizeStyle({ "--intro-index": index + 1 }),
					"data-test-id": `agent-template-${template.id}`
				}, [createBaseVNode("button", {
					type: "button",
					class: normalizeClass(_ctx.$style.exampleButton),
					onClick: ($event) => emit("select", template)
				}, [
					createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.exampleIcon),
						"data-test-id": `agent-template-icon-${template.id}`
					}, [createVNode(AgentPersonalisationIcon_default, {
						personalisation: {
							icon: template.icon,
							gradient: template.gradient
						},
						size: 40
					}, null, 8, ["personalisation"])], 10, _hoisted_3),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.exampleText) }, [createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.exampleLabel) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(template.labelKey)), 1)]),
						_: 2
					}, 1032, ["class"]), createVNode(unref(N8nText_default), {
						color: "text-light",
						class: normalizeClass(_ctx.$style.exampleDescription),
						title: unref(i18n).baseText(template.descriptionKey)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(template.descriptionKey)), 1)]),
						_: 2
					}, 1032, ["class", "title"])], 2),
					createVNode(unref(N8nIcon_default), {
						icon: "arrow-right",
						color: "text-light",
						size: "medium",
						class: normalizeClass(_ctx.$style.exampleArrow)
					}, null, 8, ["class"])
				], 10, _hoisted_2)], 14, _hoisted_1);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	examples: "_examples_1g82h_452",
	example: "_example_1g82h_452",
	fadeInUp: "_fadeInUp_1g82h_1",
	exampleButton: "_exampleButton_1g82h_474",
	exampleArrow: "_exampleArrow_1g82h_493",
	exampleIcon: "_exampleIcon_1g82h_502",
	exampleText: "_exampleText_1g82h_507",
	exampleLabel: "_exampleLabel_1g82h_514",
	exampleDescription: "_exampleDescription_1g82h_518",
	shimmer: "_shimmer_1g82h_1",
	spin: "_spin_1g82h_1",
	"skeleton-pulse": "_skeleton-pulse_1g82h_1",
	opacityPulse: "_opacityPulse_1g82h_1",
	popoverIn: "_popoverIn_1g82h_1",
	fadeIn: "_fadeIn_1g82h_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1g82h_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1g82h_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1g82h_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1g82h_1",
	blurSwapIn: "_blurSwapIn_1g82h_1",
	blurSwapOut: "_blurSwapOut_1g82h_1",
	pulse: "_pulse_1g82h_1",
	pulseGlow: "_pulseGlow_1g82h_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1g82h_1",
	fade: "_fade_1g82h_1",
	fadeInDown: "_fadeInDown_1g82h_1",
	fadeInLeft: "_fadeInLeft_1g82h_1",
	fadeInRight: "_fadeInRight_1g82h_1",
	fadeOut: "_fadeOut_1g82h_1",
	fadeOutDown: "_fadeOutDown_1g82h_1",
	fadeOutUp: "_fadeOutUp_1g82h_1",
	fadeOutLeft: "_fadeOutLeft_1g82h_1",
	fadeOutRight: "_fadeOutRight_1g82h_1",
	ping: "_ping_1g82h_1",
	blinkBackground: "_blinkBackground_1g82h_1",
	typingBlink: "_typingBlink_1g82h_1"
} }]]);
//#endregion
export { AGENT_TEMPLATE_SUGGESTIONS_VERSION as a, isAgentStarter as c, AGENT_TEMPLATES as i, useAgentArchive as l, useAgentPublish as n, applyAgentTemplate as o, useAgentVersionMetadataModal as r, isAgentConfigBlank as s, AgentTemplateList_default as t, AgentFolderDialog_default as u };
