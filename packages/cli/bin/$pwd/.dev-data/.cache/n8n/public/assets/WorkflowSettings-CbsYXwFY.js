import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Zd as h, _f as resolveDirective, _p as normalizeClass, du as ElCol, ff as openBlock, fu as ElRow, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $O as policyToChannels, $d as injectWorkflowDocumentStore, BC as ProjectTypes, Ex as WORKFLOW_SETTINGS_MODAL_KEY, GA as DialogDescription_default, GS as EnterpriseEditionFeature, Gk as BINARY_MODE_SEPARATE, JA as DialogHeader_default, KA as Dialog_default, Ll as useNodeCreatorStore, OC as getSecuritySettings, Od as useWorkflowsStore, QO as channelsToPolicy, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, TS as EXECUTION_LOGIC_V2_EXPERIMENT, UA as DialogFooter_default, WA as DialogBody_default, Wk as BINARY_MODE_COMBINED, Wp as useWorkflowsListStore, Wt as useMcp, Yc as useCollaborationStore, Zf as useRolesStore, _ as useDynamicCredentials, _N as N8nText_default, bC as useRootStore, bE as SYSTEM_RESOLVER_ID, bm as useSourceControlStore, by as useDebounce, cN as Input_default, cO as pickVersionedSettings, dC as useToast, dM as N8nSwitch_default, eM as N8nInputNumber_default, fN as N8nTooltip_default, gM as N8nInputLabel_default, hC as useTelemetry, hM as N8nLink_default, jM as createEventBus, jN as useI18n, mM as N8nOption_default, nD as getResourcePermissions, nN as N8nBadge_default, ob as NODE_CREATOR_OPEN_SOURCES, oj as N8nUserInfo_default, pM as N8nSelect_default, qA as DialogTitle_default, tN as N8nLoading_default, uf as useNodeTypesStore, vN as N8nIconButton_default, vd as useExternalHooks, vm as useProjectsStore, vy as usePostHog, xN as N8nIcon_default, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default, zy as EXECUTION_DATA_REDACTION_DOCS_URL } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as useGlobalLinkActions } from "./useGlobalLinkActions-86G2p5eR.js";
import { t as useCredentialResolvers } from "./useCredentialResolvers-fevamwxP.js";
import { t as useWorkflowsEEStore } from "./workflows.ee.store-CVTEYmBM.js";
//#region src/features/workflows/components/WorkflowSettings/RedactionMembersModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RedactionMembersModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RedactionMembersModal",
	props: {
		open: { type: Boolean },
		projectId: {}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const rolesStore = useRolesStore();
		const i18n = useI18n();
		const membersData = ref({ members: [] });
		const isLoading = ref(false);
		watch(() => props.open, async (isOpen) => {
			if (!isOpen) return;
			isLoading.value = true;
			try {
				membersData.value = await rolesStore.fetchRoleProjectMembers("project:admin", props.projectId);
			} finally {
				isLoading.value = false;
			}
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				"show-close-button": false,
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nIconButton_default), {
						icon: "chevron-left",
						variant: "ghost",
						size: "small",
						"aria-label": unref(i18n).baseText("generic.back"),
						onClick: _cache[0] || (_cache[0] = ($event) => emit("update:open", false))
					}, null, 8, ["aria-label"]), createVNode(unref(DialogTitle_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactionMembersModal.title")), 1)]),
						_: 1
					})], 2)]),
					_: 1
				}), createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						color: "text-base",
						size: "small",
						class: normalizeClass(_ctx.$style.description)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactionMembersModal.description")), 1)]),
						_: 1
					}, 8, ["class"]), isLoading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
						key: 0,
						rows: 3
					})) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.memberList)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(membersData.value.members, (member) => {
						return openBlock(), createElementBlock("div", {
							key: member.userId,
							class: normalizeClass(_ctx.$style.memberRow)
						}, [createVNode(unref(N8nUserInfo_default), {
							"first-name": member.firstName,
							"last-name": member.lastName,
							email: member.email
						}, null, 8, [
							"first-name",
							"last-name",
							"email"
						])], 2);
					}), 128))], 2))]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1b1c3_2",
	header: "_header_1b1c3_6",
	description: "_description_1b1c3_12",
	memberList: "_memberList_1b1c3_17",
	memberRow: "_memberRow_1b1c3_22"
} }]]);
//#endregion
//#region src/features/workflows/components/WorkflowSettings/WorkflowCustomTelemetryTags.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "workflow-settings-custom-telemetry-tags-modal" };
var OPEN_TELEMETRY_DOCS_URL = "https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/";
var WorkflowCustomTelemetryTags_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowCustomTelemetryTags",
	props: {
		modelValue: {},
		isReadOnly: { type: Boolean },
		saveTags: { type: Function }
	},
	emits: ["update:modelValue", "validity-change"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const showModal = ref(false);
		const isSaving = ref(false);
		const draft = ref([]);
		const tags = computed(() => props.modelValue ?? []);
		const cloneTags = (tagsToClone = []) => tagsToClone.map((tag) => ({ ...tag }));
		const createEmptyTag = () => ({
			key: "",
			value: ""
		});
		const isEmptyTag = (tag) => !tag.key.trim() && !tag.value.trim();
		const getSavedTags = (tagsToSave) => tagsToSave.filter((tag) => !isEmptyTag(tag)).map((tag) => ({
			key: tag.key.trim(),
			value: tag.value
		}));
		const getTagErrors = (tagsToValidate) => {
			const seen = /* @__PURE__ */ new Set();
			return tagsToValidate.map((tag) => {
				const trimmedKey = tag.key.trim();
				if (!trimmedKey) return i18n.baseText("workflowSettings.customSpanAttributes.error.emptyKey");
				if (seen.has(trimmedKey)) return i18n.baseText("workflowSettings.customSpanAttributes.error.duplicateKey");
				seen.add(trimmedKey);
				return null;
			});
		};
		const tagErrors = computed(() => getTagErrors(tags.value));
		const draftErrors = computed(() => getTagErrors(draft.value));
		const validationError = computed(() => {
			return tagErrors.value.find((tagError) => tagError !== null) ?? null;
		});
		const draftValidationError = computed(() => {
			return draftErrors.value.find((tagError) => tagError !== null) ?? null;
		});
		const hasTagErrors = computed(() => validationError.value !== null);
		const hasDraftErrors = computed(() => draftValidationError.value !== null);
		const areControlsDisabled = computed(() => props.isReadOnly || isSaving.value);
		const configuredTagsCount = computed(() => tags.value.length);
		const hasConfiguredTags = computed(() => configuredTagsCount.value > 0);
		const configuredTagsCountLabel = computed(() => i18n.baseText("workflowSettings.customSpanAttributes.configuredCount", {
			adjustToNumber: configuredTagsCount.value,
			interpolate: { count: configuredTagsCount.value }
		}));
		const configureButtonAriaLabel = computed(() => {
			const label = `${i18n.baseText("workflowSettings.customSpanAttributes.configure")} ${i18n.baseText("workflowSettings.customSpanAttributes.displayName").toLowerCase()}`;
			return hasConfiguredTags.value ? `${label}, ${configuredTagsCountLabel.value.toLowerCase()}` : label;
		});
		watch(hasTagErrors, (hasErrors) => {
			emit("validity-change", hasErrors);
		}, { immediate: true });
		onBeforeUnmount(() => {
			emit("validity-change", false);
		});
		const updateDraftTag = (index, field, value) => {
			draft.value = draft.value.map((tag, tagIndex) => tagIndex === index ? {
				...tag,
				[field]: value
			} : tag);
		};
		const addRow = ref(null);
		/** The dialog body that scrolls, when this node sits inside one. */
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
			const row = addRow.value;
			if (!row) return;
			const scroller = scrollParent(row);
			if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
			const rowRect = row.getBoundingClientRect();
			const scrollerRect = scroller.getBoundingClientRect();
			if (rowRect.bottom <= scrollerRect.bottom) return;
			scroller.scrollTo({
				top: scroller.scrollHeight - scroller.clientHeight,
				behavior: "smooth"
			});
		}
		const addTag = async () => {
			draft.value = [...draft.value, createEmptyTag()];
			await nextTick();
			keepAddButtonInView();
		};
		const deleteTag = (index) => {
			draft.value = draft.value.filter((_, tagIndex) => tagIndex !== index);
		};
		const openModal = () => {
			draft.value = cloneTags(tags.value);
			showModal.value = true;
		};
		const cancelModal = () => {
			draft.value = cloneTags(tags.value);
			showModal.value = false;
		};
		const saveModal = async () => {
			if (hasDraftErrors.value || isSaving.value) return;
			const savedTags = getSavedTags(draft.value);
			isSaving.value = true;
			try {
				await props.saveTags?.(savedTags);
				emit("update:modelValue", savedTags);
			} catch {
				return;
			} finally {
				isSaving.value = false;
			}
			showModal.value = false;
		};
		const onModalOpenChange = (open) => {
			if (open) {
				openModal();
				return;
			}
			if (isSaving.value) return;
			cancelModal();
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.wrapper) }, [createVNode(unref(ElRow), {
				class: normalizeClass(_ctx.$style.customTelemetryTags),
				"data-test-id": "workflow-settings-custom-telemetry-tags"
			}, {
				default: withCtx(() => [createVNode(unref(ElCol), {
					span: 10,
					class: normalizeClass(_ctx.$style.settingName)
				}, {
					default: withCtx(() => [createBaseVNode("label", null, [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.displayName")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.description")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
						_: 1
					})])]),
					_: 1
				}, 8, ["class"]), createVNode(unref(ElCol), {
					span: 14,
					class: normalizeClass(_ctx.$style.customTelemetryTagsControl)
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.customTelemetryTagsSummary) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "large",
						"native-type": "button",
						class: normalizeClass(_ctx.$style.customTelemetryTagsConfigure),
						"aria-label": configureButtonAriaLabel.value,
						"data-test-id": "workflow-settings-custom-telemetry-tags-configure",
						onClick: openModal
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.configure")), 1)]),
						_: 1
					}, 8, ["class", "aria-label"]), hasConfiguredTags.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.customTelemetryTagsCount),
						"data-test-id": "workflow-settings-custom-telemetry-tags-count"
					}, toDisplayString(configuredTagsCountLabel.value), 3)) : createCommentVNode("", true)], 2), validationError.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "danger",
						tag: "p",
						class: normalizeClass(_ctx.$style.customTelemetryTagsError),
						"data-test-id": "workflow-settings-custom-telemetry-tags-error"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(validationError.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["class"]), createVNode(unref(Dialog_default), {
				open: showModal.value,
				size: "large",
				"onUpdate:open": onModalOpenChange
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.customTelemetryTagsModalTitle) }, [createVNode(unref(N8nIconButton_default), {
							icon: "chevron-left",
							variant: "ghost",
							size: "medium",
							"icon-size": "large",
							disabled: isSaving.value,
							"aria-label": unref(i18n).baseText("generic.back"),
							onClick: cancelModal
						}, null, 8, ["disabled", "aria-label"]), createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.modal.title")), 1)]),
							_: 1
						})], 2), createVNode(unref(DialogDescription_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.description")) + " " + toDisplayString(" ") + " " + toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.modal.learnMore")) + " " + toDisplayString(" ") + " ", 1), createBaseVNode("a", {
								class: normalizeClass(_ctx.$style.customTelemetryTagsDocsLink),
								href: OPEN_TELEMETRY_DOCS_URL,
								target: "_blank"
							}, [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.modal.documentation")) + " ", 1), createVNode(unref(N8nIcon_default), {
								icon: "arrow-up-right",
								size: "xsmall"
							})], 2)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
						default: withCtx(() => [createBaseVNode("div", _hoisted_1$1, [
							(openBlock(true), createElementBlock(Fragment, null, renderList(draft.value, (tag, index) => {
								return openBlock(), createElementBlock("div", {
									key: index,
									class: normalizeClass(_ctx.$style.customTelemetryTagsRow),
									"data-test-id": "workflow-settings-custom-telemetry-tags-row"
								}, [
									createVNode(unref(N8nInputLabel_default), {
										class: normalizeClass(_ctx.$style.customTelemetryTagsField),
										label: index === 0 ? unref(i18n).baseText("workflowSettings.customSpanAttributes.tag.key.displayName") : void 0,
										size: "small",
										"input-name": `workflow-custom-telemetry-tag-key-${index}`
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: `workflow-custom-telemetry-tag-key-${index}`,
											"model-value": tag.key,
											size: "medium",
											disabled: areControlsDisabled.value,
											placeholder: unref(i18n).baseText("workflowSettings.customSpanAttributes.tag.key.placeholder"),
											"aria-label": unref(i18n).baseText("workflowSettings.customSpanAttributes.tag.key.displayName"),
											"data-test-id": "workflow-settings-custom-telemetry-tags-key",
											"onUpdate:modelValue": ($event) => updateDraftTag(index, "key", String($event))
										}, null, 8, [
											"id",
											"model-value",
											"disabled",
											"placeholder",
											"aria-label",
											"onUpdate:modelValue"
										])]),
										_: 2
									}, 1032, [
										"class",
										"label",
										"input-name"
									]),
									createVNode(unref(N8nInputLabel_default), {
										class: normalizeClass(_ctx.$style.customTelemetryTagsField),
										label: index === 0 ? unref(i18n).baseText("workflowSettings.customSpanAttributes.tag.value.displayName") : void 0,
										size: "small",
										"input-name": `workflow-custom-telemetry-tag-value-${index}`
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: `workflow-custom-telemetry-tag-value-${index}`,
											"model-value": tag.value,
											size: "medium",
											disabled: areControlsDisabled.value,
											placeholder: unref(i18n).baseText("workflowSettings.customSpanAttributes.tag.value.placeholder"),
											"aria-label": unref(i18n).baseText("workflowSettings.customSpanAttributes.tag.value.displayName"),
											"data-test-id": "workflow-settings-custom-telemetry-tags-value",
											"onUpdate:modelValue": ($event) => updateDraftTag(index, "value", String($event))
										}, null, 8, [
											"id",
											"model-value",
											"disabled",
											"placeholder",
											"aria-label",
											"onUpdate:modelValue"
										])]),
										_: 2
									}, 1032, [
										"class",
										"label",
										"input-name"
									]),
									createVNode(unref(N8nIconButton_default), {
										icon: "trash-2",
										variant: "ghost",
										size: "small",
										disabled: areControlsDisabled.value,
										title: unref(i18n).baseText("workflowSettings.customSpanAttributes.delete"),
										"aria-label": unref(i18n).baseText("workflowSettings.customSpanAttributes.delete"),
										"data-test-id": "workflow-settings-custom-telemetry-tags-delete",
										onClick: ($event) => deleteTag(index)
									}, null, 8, [
										"disabled",
										"title",
										"aria-label",
										"onClick"
									])
								], 2);
							}), 128)),
							createBaseVNode("div", {
								ref_key: "addRow",
								ref: addRow
							}, [createVNode(unref(N8nButton_default), {
								icon: "plus",
								variant: "outline",
								size: "small",
								"native-type": "button",
								disabled: areControlsDisabled.value,
								class: normalizeClass(_ctx.$style.customTelemetryTagsAdd),
								"data-test-id": "workflow-settings-custom-telemetry-tags-add",
								onClick: addTag
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.customSpanAttributes.placeholder")), 1)]),
								_: 1
							}, 8, ["disabled", "class"])], 512),
							draftValidationError.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								size: "small",
								color: "danger",
								tag: "p",
								class: normalizeClass(_ctx.$style.customTelemetryTagsError),
								"data-test-id": "workflow-settings-custom-telemetry-tags-modal-error"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(draftValidationError.value), 1)]),
								_: 1
							}, 8, ["class"])) : createCommentVNode("", true)
						])]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: isSaving.value,
							"data-test-id": "workflow-settings-custom-telemetry-tags-cancel",
							onClick: cancelModal
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							disabled: areControlsDisabled.value || hasDraftErrors.value,
							"data-test-id": "workflow-settings-custom-telemetry-tags-save",
							onClick: saveModal
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_xyute_1",
	wrapper: "_wrapper_xyute_5",
	customTelemetryTags: "_customTelemetryTags_xyute_9",
	settingName: "_settingName_xyute_14",
	customTelemetryTagsControl: "_customTelemetryTagsControl_xyute_28",
	customTelemetryTagsSummary: "_customTelemetryTagsSummary_xyute_35",
	customTelemetryTagsCount: "_customTelemetryTagsCount_xyute_41",
	customTelemetryTagsConfigure: "_customTelemetryTagsConfigure_xyute_48",
	customTelemetryTagsModalTitle: "_customTelemetryTagsModalTitle_xyute_54",
	customTelemetryTagsDocsLink: "_customTelemetryTagsDocsLink_xyute_60",
	customTelemetryTagsRow: "_customTelemetryTagsRow_xyute_71",
	customTelemetryTagsField: "_customTelemetryTagsField_xyute_78",
	customTelemetryTagsAdd: "_customTelemetryTagsAdd_xyute_83",
	customTelemetryTagsError: "_customTelemetryTagsError_xyute_87"
} }]]);
//#endregion
//#region src/features/workflows/components/WorkflowSettings/WorkflowSettings.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["textContent"];
var _hoisted_2 = { class: "list-option" };
var _hoisted_3 = { class: "option-headline" };
var _hoisted_4 = { class: "option-description" };
var _hoisted_5 = ["textContent"];
var _hoisted_6 = ["disabled"];
var _hoisted_7 = ["textContent"];
var _hoisted_8 = ["textContent"];
var _hoisted_9 = ["textContent"];
var _hoisted_10 = ["textContent"];
var _hoisted_11 = ["textContent"];
var _hoisted_12 = ["textContent"];
var _hoisted_13 = ["textContent"];
var _hoisted_14 = { key: 0 };
var _hoisted_15 = { key: 1 };
var _hoisted_16 = { key: 0 };
var _hoisted_17 = { key: 1 };
var _hoisted_18 = { key: 2 };
var _hoisted_19 = ["textContent"];
var _hoisted_20 = {
	key: 4,
	"data-test-id": "workflow-settings-timeout-form"
};
var _hoisted_21 = ["textContent"];
var _hoisted_22 = { for: "availableInMCP" };
var _hoisted_23 = { for: "timeSavedPerExecution" };
var _hoisted_24 = { class: "ignore-key-press-canvas" };
var WorkflowSettings_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowSettings",
	setup(__props) {
		const i18n = useI18n();
		const externalHooks = useExternalHooks();
		const toast = useToast();
		const modalBus = createEventBus();
		const telemetry = useTelemetry();
		const { trackMcpAccessEnabledForWorkflow } = useMcp();
		const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const { isEnabled: isCredentialResolverEnabled } = useDynamicCredentials();
		const instanceRedactionFloor = ref("off");
		const originalRedactionPolicy = ref(void 0);
		const canListCredentialResolvers = hasPermission(["rbac"], { rbac: { scope: "credentialResolver:list" } });
		const canCreateCredentialResolver = hasPermission(["rbac"], { rbac: { scope: "credentialResolver:create" } });
		const canUpdateCredentialResolver = hasPermission(["rbac"], { rbac: { scope: "credentialResolver:update" } });
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const nodeTypesStore = useNodeTypesStore();
		const sourceControlStore = useSourceControlStore();
		const collaborationStore = useCollaborationStore();
		const workflowsStore = useWorkflowsStore();
		const workflowsListStore = useWorkflowsListStore();
		const projectsStore = useProjectsStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const workflowsEEStore = useWorkflowsEEStore();
		const nodeCreatorStore = useNodeCreatorStore();
		const posthogStore = usePostHog();
		const isLoading = ref(true);
		const hasCustomTelemetryTagErrors = ref(false);
		const workflowCallerPolicyOptions = ref([]);
		const redactionToggleOptions = ref([{
			key: "default",
			value: i18n.baseText("workflowSettings.redactionOptions.default")
		}, {
			key: "redact",
			value: i18n.baseText("workflowSettings.redactionOptions.redact")
		}]);
		const saveDataErrorExecutionOptions = ref([]);
		const saveDataSuccessExecutionOptions = ref([]);
		const saveExecutionProgressOptions = ref([]);
		const saveManualOptions = ref([]);
		const executionLogicAllOptions = ref([
			{
				key: "v0",
				value: i18n.baseText("workflowSettings.executionLogic.v0.title"),
				description: i18n.baseText("workflowSettings.executionLogic.v0.description")
			},
			{
				key: "v1",
				value: i18n.baseText("workflowSettings.executionLogic.v1.title"),
				description: i18n.baseText("workflowSettings.executionLogic.v1.description")
			},
			{
				key: "v2",
				value: i18n.baseText("workflowSettings.executionLogic.v2.title"),
				description: i18n.baseText("workflowSettings.executionLogic.v2.description")
			}
		]);
		const timezones = ref([]);
		const workflowSettings = ref({});
		const workflows = ref([]);
		const credentialResolverSelectRef = ref(null);
		const originalBinaryMode = ref(void 0);
		const { resolvers: credentialResolvers, resolverTypes: credentialResolverTypes, fetchResolvers: loadCredentialResolvers, fetchResolverTypes: loadCredentialResolverTypes, openCreateModal, openEditModal } = useCredentialResolvers();
		const executionTimeout = ref(0);
		const maxExecutionTimeout = ref(0);
		const timeoutHMS = ref({
			hours: 0,
			minutes: 0,
			seconds: 0
		});
		const isSelectedResolverEditable = computed(() => {
			const resolverId = workflowSettings.value.credentialResolverId;
			if (!resolverId) return false;
			const resolver = credentialResolvers.value.find((r) => r.id === resolverId);
			if (!resolver) return false;
			return !!credentialResolverTypes.value.find((t) => t.name === resolver.type)?.options?.length;
		});
		const selectedResolverId = computed({
			get() {
				const resolverId = workflowSettings.value.credentialResolverId;
				if (resolverId) return resolverId;
				return credentialResolvers.value.some((r) => r.id === "system-n8n") ? SYSTEM_RESOLVER_ID : void 0;
			},
			set(value) {
				workflowSettings.value.credentialResolverId = value === "system-n8n" ? void 0 : value;
			}
		});
		const helpTexts = computed(() => ({
			errorWorkflow: i18n.baseText("workflowSettings.helpTexts.errorWorkflow"),
			timezone: i18n.baseText("workflowSettings.helpTexts.timezone"),
			credentialResolver: i18n.baseText("workflowSettings.helpTexts.credentialResolver"),
			saveDataErrorExecution: i18n.baseText("workflowSettings.helpTexts.saveDataErrorExecution"),
			saveDataSuccessExecution: i18n.baseText("workflowSettings.helpTexts.saveDataSuccessExecution"),
			saveExecutionProgress: i18n.baseText("workflowSettings.helpTexts.saveExecutionProgress"),
			saveManualExecutions: i18n.baseText("workflowSettings.helpTexts.saveManualExecutions"),
			executionTimeoutToggle: i18n.baseText("workflowSettings.helpTexts.executionTimeoutToggle"),
			executionTimeout: i18n.baseText("workflowSettings.helpTexts.executionTimeout"),
			workflowCallerPolicy: i18n.baseText("workflowSettings.helpTexts.workflowCallerPolicy"),
			workflowCallerIds: i18n.baseText("workflowSettings.helpTexts.workflowCallerIds"),
			redactProductionData: i18n.baseText("workflowSettings.helpTexts.redactProductionData"),
			redactManualData: i18n.baseText("workflowSettings.helpTexts.redactManualData"),
			redactCallerExecutions: i18n.baseText("workflowSettings.helpTexts.redactCallerExecutions"),
			engineType: i18n.baseText("workflowSettings.helpTexts.engineType")
		}));
		const defaultValues = ref({
			timezone: "America/New_York",
			saveDataErrorExecution: "all",
			saveDataSuccessExecution: "all",
			saveExecutionProgress: false,
			saveManualExecutions: false,
			workflowCallerPolicy: "workflowsFromSameOwner",
			availableInMCP: false,
			redactCallerExecutions: true
		});
		const executionLogic = computed(() => {
			if (workflowSettings.value.binaryMode === "combined") return "v2";
			return workflowSettings.value.executionOrder || "v0";
		});
		const isMCPEnabled = computed(() => settingsStore.isModuleActive("mcp") && settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
		const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly || collaborationStore.shouldBeReadOnly);
		const workflowName = computed(() => workflowDocumentStore.value.name);
		const workflowId = computed(() => workflowDocumentStore.value.workflowId);
		const workflow = computed(() => workflowsListStore.getWorkflowById(workflowId.value));
		const isSharingEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]);
		const workflowOwnerName = computed(() => {
			const fallback = i18n.baseText("workflowSettings.callerPolicy.options.workflowsFromSameProject");
			return workflowsEEStore.getWorkflowOwnerName(`${workflowId.value}`, fallback);
		});
		const workflowPermissions = computed(() => getResourcePermissions(workflow.value?.scopes).workflow);
		const projectPermissions = computed(() => {
			const project = projectsStore.myProjects.find((p) => p.id === workflow.value?.homeProject?.id) ?? projectsStore.personalProject;
			return getResourcePermissions(project?.scopes);
		});
		const isDataRedactionLicensed = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction]);
		const isRedactionSettingVisible = computed(() => settingsStore.isModuleActive("redaction"));
		const isEngineTypeSettingVisible = computed(() => settingsStore.isModuleActive("engine-v2"));
		const engineTypeOptions = computed(() => [{
			key: "v1",
			value: i18n.baseText("workflowSettings.engineType.v1")
		}, {
			key: "v2",
			value: i18n.baseText("workflowSettings.engineType.v2")
		}]);
		const engineType = computed({
			get() {
				return workflowSettings.value.engineType ?? "v1";
			},
			set(value) {
				workflowSettings.value.engineType = value;
			}
		});
		const isEngineTypeChangePendingPublish = computed(() => {
			const activeVersion = workflowDocumentStore.value.activeVersion;
			if (!activeVersion) return false;
			return pickVersionedSettings(activeVersion.settings).engineType !== engineType.value;
		});
		const isProductionRedactionLockedByFloor = computed(() => instanceRedactionFloor.value === "production" || instanceRedactionFloor.value === "all");
		const isManualRedactionLockedByFloor = computed(() => instanceRedactionFloor.value === "all");
		function resolveRedactionLockReason(currentValue, lockedByFloor) {
			if (!isDataRedactionLicensed.value) return null;
			if (lockedByFloor) return "floor";
			if (currentValue === "default" ? !projectPermissions.value.workflow.enableRedaction : !projectPermissions.value.workflow.disableRedaction) return "permission";
			return null;
		}
		const productionRedactionLockReason = computed(() => resolveRedactionLockReason(redactProductionData.value, isProductionRedactionLockedByFloor.value));
		const manualRedactionLockReason = computed(() => resolveRedactionLockReason(redactManualData.value, isManualRedactionLockedByFloor.value));
		const isProductionRedactionLocked = computed(() => productionRedactionLockReason.value !== null);
		const isManualRedactionLocked = computed(() => manualRedactionLockReason.value !== null);
		const isCallerRedactionLocked = computed(() => {
			if (!isDataRedactionLicensed.value) return false;
			return workflowSettings.value.redactCallerExecutions !== false ? !projectPermissions.value.workflow.disableRedaction : !projectPermissions.value.workflow.enableRedaction;
		});
		const redactionMembersModalOpen = ref(false);
		function goToDataRedactionUpgrade() {
			pageRedirectionHelper.goToUpgrade("workflow-settings", "upgrade-data-redaction");
		}
		const workflowHasDynamicCredentials = computed(() => isCredentialResolverEnabled.value && !!workflowSettings.value.credentialResolverId);
		const isWorkflowSettingsReadOnly = computed(() => readOnlyEnv.value || !workflowPermissions.value.update);
		/**
		* Maps the two independent redaction toggles to/from the single `redactionPolicy` field.
		*
		* | Production | Manual | → redactionPolicy |
		* |-----------|--------|-------------------|
		* | default   | default| none              |
		* | redact    | redact | all               |
		* | redact    | default| non-manual        |
		* | default   | redact | manual-only       |
		*/
		const redactProductionData = computed({
			get() {
				if (workflowHasDynamicCredentials.value) return "redact";
				const policy = workflowSettings.value.redactionPolicy;
				return policy === "all" || policy === "non-manual" ? "redact" : "default";
			},
			set(val) {
				const manualRedacted = redactManualData.value === "redact";
				if (val === "redact") workflowSettings.value.redactionPolicy = manualRedacted ? "all" : "non-manual";
				else workflowSettings.value.redactionPolicy = manualRedacted ? "manual-only" : "none";
			}
		});
		const redactManualData = computed({
			get() {
				const policy = workflowSettings.value.redactionPolicy;
				return policy === "all" || policy === "manual-only" ? "redact" : "default";
			},
			set(val) {
				const productionRedacted = redactProductionData.value === "redact";
				if (val === "redact") workflowSettings.value.redactionPolicy = productionRedacted ? "all" : "manual-only";
				else workflowSettings.value.redactionPolicy = productionRedacted ? "non-manual" : "none";
			}
		});
		const isCallerRedactionSettingVisible = computed(() => redactProductionData.value === "redact" || redactManualData.value === "redact");
		const isManualRedactionDisabledByProduction = computed(() => redactProductionData.value !== "redact");
		watch(redactProductionData, (newVal) => {
			if (newVal !== "redact" && redactManualData.value === "redact") redactManualData.value = "default";
		});
		watch([isProductionRedactionLockedByFloor, isManualRedactionLockedByFloor], ([prodLocked, manualLocked]) => {
			if (prodLocked && redactProductionData.value !== "redact") redactProductionData.value = "redact";
			if (manualLocked && redactManualData.value !== "redact") redactManualData.value = "redact";
		});
		const mcpToggleDisabled = computed(() => {
			return readOnlyEnv.value || !workflowPermissions.value.update;
		});
		const mcpToggleTooltip = computed(() => {
			return i18n.baseText("workflowSettings.availableInMCP.tooltip");
		});
		const savedTimeNodes = computed(() => {
			if (!workflow?.value?.nodes) return [];
			return workflow.value.nodes.filter((node) => node.type === "n8n-nodes-base.timeSaved" && node.disabled !== true);
		});
		const hasSavedTimeNodes = computed(() => {
			return savedTimeNodes.value.length > 0;
		});
		const timeSavedModeOptions = computed(() => [{
			label: i18n.baseText("workflowSettings.timeSavedPerExecution.tab.fixed"),
			value: "fixed"
		}, {
			label: i18n.baseText("workflowSettings.timeSavedPerExecution.tab.dynamic"),
			value: "dynamic"
		}]);
		const executionLogicOptions = computed(() => {
			if (workflowSettings.value.binaryMode === "combined") return executionLogicAllOptions.value;
			if (posthogStore.isVariantEnabled(EXECUTION_LOGIC_V2_EXPERIMENT.name, EXECUTION_LOGIC_V2_EXPERIMENT.variant)) return executionLogicAllOptions.value;
			return executionLogicAllOptions.value.filter((option) => option.key !== "v2");
		});
		const onCallerIdsInput = (str) => {
			workflowSettings.value.callerIds = /^[a-zA-Z0-9,\s_-]+$/.test(str) ? str : str.replace(/[^a-zA-Z0-9,\s_-]/g, "");
		};
		const closeDialog = () => {
			modalBus.emit("close");
			externalHooks.run("workflowSettings.dialogVisibleChanged", { dialogVisible: false });
		};
		const setTheTimeout = (key, value) => {
			const time = value ? parseInt(value, 10) : 0;
			timeoutHMS.value = {
				...timeoutHMS.value,
				[key]: time
			};
		};
		const loadWorkflowCallerPolicyOptions = async () => {
			workflowCallerPolicyOptions.value = [
				{
					key: "none",
					value: i18n.baseText("workflowSettings.callerPolicy.options.none")
				},
				{
					key: "workflowsFromSameOwner",
					value: i18n.baseText(workflow.value?.homeProject?.type === ProjectTypes.Personal ? "workflowSettings.callerPolicy.options.workflowsFromPersonalProject" : "workflowSettings.callerPolicy.options.workflowsFromTeamProject", { interpolate: { projectName: workflowOwnerName.value } })
				},
				{
					key: "workflowsFromAList",
					value: i18n.baseText("workflowSettings.callerPolicy.options.workflowsFromAList")
				},
				{
					key: "any",
					value: i18n.baseText("workflowSettings.callerPolicy.options.any")
				}
			];
		};
		const loadSaveDataErrorExecutionOptions = async () => {
			saveDataErrorExecutionOptions.value = [
				{
					key: "DEFAULT",
					value: i18n.baseText("workflowSettings.saveDataErrorExecutionOptions.defaultSave", { interpolate: { defaultValue: defaultValues.value.saveDataErrorExecution === "all" ? i18n.baseText("workflowSettings.saveDataErrorExecutionOptions.save") : i18n.baseText("workflowSettings.saveDataErrorExecutionOptions.doNotSave") } })
				},
				{
					key: "all",
					value: i18n.baseText("workflowSettings.saveDataErrorExecutionOptions.save")
				},
				{
					key: "none",
					value: i18n.baseText("workflowSettings.saveDataErrorExecutionOptions.doNotSave")
				}
			];
		};
		const loadSaveDataSuccessExecutionOptions = async () => {
			saveDataSuccessExecutionOptions.value = [
				{
					key: "DEFAULT",
					value: i18n.baseText("workflowSettings.saveDataSuccessExecutionOptions.defaultSave", { interpolate: { defaultValue: defaultValues.value.saveDataSuccessExecution === "all" ? i18n.baseText("workflowSettings.saveDataSuccessExecutionOptions.save") : i18n.baseText("workflowSettings.saveDataSuccessExecutionOptions.doNotSave") } })
				},
				{
					key: "all",
					value: i18n.baseText("workflowSettings.saveDataSuccessExecutionOptions.save")
				},
				{
					key: "none",
					value: i18n.baseText("workflowSettings.saveDataSuccessExecutionOptions.doNotSave")
				}
			];
		};
		const loadSaveExecutionProgressOptions = async () => {
			saveExecutionProgressOptions.value = [
				{
					key: "DEFAULT",
					value: i18n.baseText("workflowSettings.saveExecutionProgressOptions.defaultSave", { interpolate: { defaultValue: defaultValues.value.saveExecutionProgress ? i18n.baseText("workflowSettings.saveExecutionProgressOptions.save") : i18n.baseText("workflowSettings.saveExecutionProgressOptions.doNotSave") } })
				},
				{
					key: true,
					value: i18n.baseText("workflowSettings.saveExecutionProgressOptions.save")
				},
				{
					key: false,
					value: i18n.baseText("workflowSettings.saveExecutionProgressOptions.doNotSave")
				}
			];
		};
		const loadSaveManualOptions = async () => {
			saveManualOptions.value = [
				{
					key: "DEFAULT",
					value: i18n.baseText("workflowSettings.saveManualOptions.defaultSave", { interpolate: { defaultValue: defaultValues.value.saveManualExecutions ? i18n.baseText("workflowSettings.saveManualOptions.save") : i18n.baseText("workflowSettings.saveManualOptions.doNotSave") } })
				},
				{
					key: true,
					value: i18n.baseText("workflowSettings.saveManualOptions.save")
				},
				{
					key: false,
					value: i18n.baseText("workflowSettings.saveManualOptions.doNotSave")
				}
			];
		};
		const loadTimezones = async () => {
			if (timezones.value.length !== 0) return;
			const timezonesData = await settingsStore.getTimezones();
			let defaultTimezoneValue = timezonesData[defaultValues.value.timezone];
			if (defaultTimezoneValue === void 0) defaultTimezoneValue = i18n.baseText("workflowSettings.defaultTimezoneNotValid");
			timezones.value.push({
				key: "DEFAULT",
				value: i18n.baseText("workflowSettings.defaultTimezone", { interpolate: { defaultTimezoneValue } })
			});
			for (const timezone of Object.keys(timezonesData)) timezones.value.push({
				key: timezone,
				value: timezonesData[timezone]
			});
		};
		const loadWorkflows = async (searchTerm) => {
			const workflowsData = await workflowsListStore.searchWorkflows({
				query: searchTerm,
				isArchived: false,
				triggerNodeTypes: ["n8n-nodes-base.errorTrigger"]
			});
			workflowsData.sort((a, b) => {
				if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
				if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
				return 0;
			});
			workflowsData.unshift({
				id: "DEFAULT",
				name: i18n.baseText("workflowSettings.noWorkflow")
			});
			workflows.value = workflowsData;
		};
		const handleCreateNewResolver = async () => {
			credentialResolverSelectRef.value?.blur();
			await nextTick();
			openCreateModal({ onSave: async (resolverId) => {
				await loadCredentialResolvers({ includeSystem: true });
				workflowSettings.value.credentialResolverId = resolverId;
			} });
		};
		const handleEditResolver = async () => {
			if (!workflowSettings.value.credentialResolverId) return;
			openEditModal(workflowSettings.value.credentialResolverId, {
				onSave: async () => {
					await loadCredentialResolvers({ includeSystem: true });
				},
				onDelete: async (deletedResolverId) => {
					await loadCredentialResolvers({ includeSystem: true });
					if (workflowSettings.value.credentialResolverId === deletedResolverId) workflowSettings.value.credentialResolverId = void 0;
				}
			});
		};
		const { debounce } = useDebounce();
		const debouncedLoadWorkflows = debounce(loadWorkflows, {
			debounceTime: 300,
			trailing: true
		});
		const convertToHMS = (num) => {
			if (num > 0) {
				const hours = Math.floor(num / 3600);
				const remainder = num % 3600;
				return {
					hours,
					minutes: Math.floor(remainder / 60),
					seconds: remainder % 60
				};
			}
			return {
				hours: 0,
				minutes: 0,
				seconds: 0
			};
		};
		const saveCustomTelemetryTags = async (customTelemetryTags) => {
			try {
				await workflowsStore.updateWorkflow(workflowId.value, {
					settings: { customTelemetryTags },
					expectedChecksum: workflowDocumentStore.value.checksum
				});
				workflowDocumentStore.value.mergeSettings({ customTelemetryTags });
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowSettings.showError.saveSettings3.title"));
				throw error;
			}
		};
		const saveSettings = async () => {
			if (hasCustomTelemetryTagErrors.value) return;
			const data = { settings: workflowSettings.value };
			const { hours, minutes, seconds } = timeoutHMS.value;
			data.settings.executionTimeout = data.settings.executionTimeout !== -1 ? hours * 3600 + minutes * 60 + seconds : -1;
			if (data.settings.executionTimeout === 0) {
				toast.showError(new Error(i18n.baseText("workflowSettings.showError.saveSettings1.errorMessage")), i18n.baseText("workflowSettings.showError.saveSettings1.title"), { message: i18n.baseText("workflowSettings.showError.saveSettings1.message") + ":" });
				return;
			}
			if (workflowSettings.value?.maxExecutionTimeout && data.settings.executionTimeout > workflowSettings.value?.maxExecutionTimeout) {
				const convertedMaxExecutionTimeout = convertToHMS(workflowSettings.value.maxExecutionTimeout);
				toast.showError(new Error(i18n.baseText("workflowSettings.showError.saveSettings2.errorMessage", { interpolate: {
					hours: convertedMaxExecutionTimeout.hours.toString(),
					minutes: convertedMaxExecutionTimeout.minutes.toString(),
					seconds: convertedMaxExecutionTimeout.seconds.toString()
				} })), i18n.baseText("workflowSettings.showError.saveSettings2.title"), { message: i18n.baseText("workflowSettings.showError.saveSettings2.message") + ":" });
				return;
			}
			delete data.settings.maxExecutionTimeout;
			if (isCredentialResolverEnabled.value && !data.settings.credentialResolverId) data.settings.credentialResolverId = "";
			if (isRedactionSettingVisible.value) {
				const original = policyToChannels(originalRedactionPolicy.value ?? "none");
				const production = isProductionRedactionLockedByFloor.value ? original.production : redactProductionData.value === "redact";
				const manual = isManualRedactionLockedByFloor.value ? original.manual : redactManualData.value === "redact";
				const unchanged = production === original.production && manual === original.manual;
				data.settings.redactionPolicy = unchanged ? originalRedactionPolicy.value : channelsToPolicy({
					production,
					manual
				});
			}
			isLoading.value = true;
			data.versionId = workflowDocumentStore.value.versionId;
			data.expectedChecksum = workflowDocumentStore.value.checksum;
			try {
				await workflowsStore.updateWorkflow(workflowId.value, data);
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowSettings.showError.saveSettings3.title"));
				isLoading.value = false;
				return;
			}
			const localWorkflowSettings = Object.fromEntries(Object.entries(workflowSettings.value).filter(([, value]) => value !== "DEFAULT"));
			const oldSettings = workflowDocumentStore.value.getSettingsSnapshot();
			workflowDocumentStore.value.setSettings(localWorkflowSettings);
			isLoading.value = false;
			toast.showMessage({
				title: i18n.baseText("workflowSettings.showMessage.saveSettings.title"),
				type: "success"
			});
			closeDialog();
			externalHooks.run("workflowSettings.saveSettings", { oldSettings: { ...oldSettings } });
			telemetry.track("User updated workflow settings", {
				workflow_id: workflowDocumentStore.value.workflowId,
				time_saved: workflowSettings.value.timeSavedPerExecution ?? "",
				error_workflow: workflowSettings.value.errorWorkflow ?? ""
			});
			if (isMCPEnabled.value && workflowSettings.value.availableInMCP) trackMcpAccessEnabledForWorkflow(workflowId.value);
			if (workflowSettings.value.binaryMode !== originalBinaryMode.value) toast.showMessage({
				title: i18n.baseText("workflowSettings.executionLogic.changed.title"),
				message: h("span", [i18n.baseText("workflowSettings.executionLogic.changed.description"), h(N8nLink_default, {
					to: "https://docs.n8n.io/data/binary-data/",
					size: "small",
					newWindow: true
				}, () => i18n.baseText("generic.learnMore"))]),
				type: "warning",
				duration: 0
			});
		};
		const toggleTimeout = () => {
			workflowSettings.value.executionTimeout = workflowSettings.value.executionTimeout === -1 ? 0 : -1;
		};
		const toggleAvailableInMCP = () => {
			workflowSettings.value.availableInMCP = !workflowSettings.value.availableInMCP;
		};
		const toggleRedactCallerExecutions = () => {
			workflowSettings.value.redactCallerExecutions = workflowSettings.value.redactCallerExecutions === false;
		};
		const updateTimeSavedPerExecution = (value) => {
			const numValue = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : NaN;
			workflowSettings.value.timeSavedPerExecution = Number.isNaN(numValue) ? void 0 : numValue < 0 ? 0 : numValue;
		};
		const onExecutionLogicModeChange = (value) => {
			if (value === "v0" || value === "v1") {
				workflowSettings.value.binaryMode = BINARY_MODE_SEPARATE;
				workflowSettings.value.executionOrder = value;
			}
			if (value === "v2") {
				workflowSettings.value.binaryMode = BINARY_MODE_COMBINED;
				workflowSettings.value.executionOrder = "v1";
			}
		};
		onMounted(async () => {
			executionTimeout.value = rootStore.executionTimeout;
			maxExecutionTimeout.value = rootStore.maxExecutionTimeout;
			if (!workflowsStore.isWorkflowSaved[workflowDocumentStore.value.workflowId]) {
				toast.showMessage({
					title: i18n.baseText("workflowSettings.showMessage.noWorkflowActive.title"),
					message: i18n.baseText("workflowSettings.showMessage.noWorkflowActive.message"),
					type: "error",
					duration: 0
				});
				closeDialog();
				return;
			}
			defaultValues.value.saveDataErrorExecution = settingsStore.saveDataErrorExecution;
			defaultValues.value.saveDataSuccessExecution = settingsStore.saveDataSuccessExecution;
			defaultValues.value.saveManualExecutions = settingsStore.saveManualExecutions;
			defaultValues.value.saveExecutionProgress = settingsStore.saveDataProgressExecution;
			defaultValues.value.timezone = rootStore.timezone;
			defaultValues.value.workflowCallerPolicy = settingsStore.workflowCallerPolicyDefaultOption;
			isLoading.value = true;
			let resolversLoaded = false;
			try {
				const promises = [
					workflowsListStore.fetchWorkflow(workflowId.value),
					loadWorkflows(),
					loadSaveDataErrorExecutionOptions(),
					loadSaveDataSuccessExecutionOptions(),
					loadSaveExecutionProgressOptions(),
					loadSaveManualOptions(),
					loadTimezones(),
					loadWorkflowCallerPolicyOptions()
				];
				if (isCredentialResolverEnabled.value && canListCredentialResolvers) promises.push(loadCredentialResolvers({ includeSystem: true }).then((success) => {
					resolversLoaded = success;
				}), loadCredentialResolverTypes());
				await Promise.all(promises);
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowSettings.showError.loadSettings.title"), { message: i18n.baseText("workflowSettings.showError.loadSettings.message") });
			}
			const workflowSettingsData = workflowDocumentStore.value.getSettingsSnapshot();
			if (workflowSettingsData.timeSavedMode === void 0) workflowSettingsData.timeSavedMode = "fixed";
			if (workflowSettingsData.errorWorkflow === void 0) workflowSettingsData.errorWorkflow = "DEFAULT";
			if (workflowSettingsData.timezone === void 0) workflowSettingsData.timezone = "DEFAULT";
			if (workflowSettingsData.saveDataErrorExecution === void 0) workflowSettingsData.saveDataErrorExecution = "DEFAULT";
			if (workflowSettingsData.saveDataSuccessExecution === void 0) workflowSettingsData.saveDataSuccessExecution = "DEFAULT";
			if (workflowSettingsData.saveExecutionProgress === void 0) workflowSettingsData.saveExecutionProgress = "DEFAULT";
			if (workflowSettingsData.saveManualExecutions === void 0) workflowSettingsData.saveManualExecutions = "DEFAULT";
			if (workflowSettingsData.callerPolicy === void 0) workflowSettingsData.callerPolicy = defaultValues.value.workflowCallerPolicy;
			if (nodeTypesStore.isNodeTypeUnavailable("n8n-nodes-base.executeWorkflow")) workflowSettingsData.callerPolicy = "none";
			if (workflowSettingsData.executionTimeout === void 0) workflowSettingsData.executionTimeout = rootStore.executionTimeout;
			if (workflowSettingsData.maxExecutionTimeout === void 0) workflowSettingsData.maxExecutionTimeout = rootStore.maxExecutionTimeout;
			if (workflowSettingsData.executionOrder === void 0) workflowSettingsData.executionOrder = "v0";
			if (workflowSettingsData.binaryMode === void 0) workflowSettingsData.binaryMode = BINARY_MODE_SEPARATE;
			if (workflowSettingsData.availableInMCP === void 0) workflowSettingsData.availableInMCP = defaultValues.value.availableInMCP;
			if (workflowSettingsData.redactCallerExecutions === void 0) workflowSettingsData.redactCallerExecutions = defaultValues.value.redactCallerExecutions;
			originalBinaryMode.value = workflowSettingsData.binaryMode;
			workflowSettings.value = workflowSettingsData;
			originalRedactionPolicy.value = workflowSettingsData.redactionPolicy;
			if (isDataRedactionLicensed.value) try {
				const response = await getSecuritySettings(rootStore.restApiContext);
				instanceRedactionFloor.value = response.redactionEnforcement?.floor ?? "off";
			} catch (error) {
				console.debug("Failed to fetch redaction enforcement state", error);
			}
			if (resolversLoaded && workflowSettingsData.credentialResolverId && !credentialResolvers.value.some((r) => r.id === workflowSettingsData.credentialResolverId)) workflowSettings.value.credentialResolverId = void 0;
			timeoutHMS.value = convertToHMS(workflowSettingsData.executionTimeout);
			isLoading.value = false;
			externalHooks.run("workflowSettings.dialogVisibleChanged", { dialogVisible: true });
			telemetry.track("User opened workflow settings", { workflow_id: workflowDocumentStore.value.workflowId });
			registerCustomAction({
				key: "openSavedTimeNodeCreator",
				action: () => {
					closeDialog();
					nodeCreatorStore.openNodeCreatorForRegularNodes(workflowDocumentStore.value.workflowId, NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION);
				}
			});
		});
		onBeforeUnmount(() => {
			debouncedLoadWorkflows.cancel?.();
			unregisterCustomAction("openSavedTimeNodeCreator");
		});
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			const _directive_loading = resolveDirective("loading");
			return openBlock(), createBlock(Modal_default, {
				name: unref(WORKFLOW_SETTINGS_MODAL_KEY),
				width: "65%",
				"max-height": "80%",
				title: unref(i18n).baseText("workflowSettings.settingsFor", { interpolate: {
					workflowName: workflowName.value,
					workflowId: workflowId.value
				} }),
				"event-bus": unref(modalBus),
				scrollable: true
			}, {
				content: withCtx(() => [withDirectives((openBlock(), createElementBlock("div", {
					class: normalizeClass(_ctx.$style["workflow-settings"]),
					"data-test-id": "workflow-settings-dialog"
				}, [
					isEngineTypeSettingVisible.value ? (openBlock(), createBlock(unref(ElRow), {
						key: 0,
						"data-test-id": "workflow-settings-engine-type"
					}, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [
								createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.engineType")) + " ", 1),
								createVNode(unref(N8nTooltip_default), { placement: "top" }, {
									content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.engineType) }, null, 8, _hoisted_1)]),
									default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
									_: 1
								}),
								isEngineTypeChangePendingPublish.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
									key: 0,
									placement: "top"
								}, {
									content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.engineType.appliesOnPublish")), 1)]),
									default: withCtx(() => [createVNode(unref(N8nBadge_default), {
										variant: "warning",
										"leading-icon": "clock",
										class: normalizeClass(_ctx.$style["engine-type-pending-badge"]),
										"data-test-id": "workflow-settings-engine-type-pending-publish"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.engineType.appliesOnPublish.badge")), 1)]),
										_: 1
									}, 8, ["class"])]),
									_: 1
								})) : createCommentVNode("", true)
							]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: engineType.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => engineType.value = $event),
								size: "medium",
								disabled: isWorkflowSettingsReadOnly.value,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-engine-type-select"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(engineTypeOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.key,
										label: option.value,
										value: option.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue", "disabled"])]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.executionLogic")), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: executionLogic.value,
								"onUpdate:modelValue": [_cache[1] || (_cache[1] = ($event) => executionLogic.value = $event), onExecutionLogicModeChange],
								placeholder: unref(i18n).baseText("workflowSettings.executionLogic.placeholder"),
								size: "medium",
								filterable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-execution-order"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(executionLogicOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.key,
										label: option.value,
										value: option.key
									}, {
										default: withCtx(() => [createBaseVNode("div", _hoisted_2, [createBaseVNode("div", _hoisted_3, toDisplayString(option.value), 1), withDirectives(createBaseVNode("div", _hoisted_4, null, 512), [[_directive_n8n_html, option.description]])])]),
										_: 2
									}, 1032, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(ElRow), { "data-test-id": "error-workflow" }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.errorWorkflow")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [withDirectives(createBaseVNode("div", null, null, 512), [[_directive_n8n_html, helpTexts.value.errorWorkflow]])]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.errorWorkflow,
								"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => workflowSettings.value.errorWorkflow = $event),
								placeholder: unref(i18n).baseText("workflowSettings.errorWorkflow.placeholder"),
								filterable: "",
								remote: "",
								"remote-method": unref(debouncedLoadWorkflows),
								"remote-show-suffix": "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-error-workflow"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(workflows.value, (item) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: item.id,
										label: item.name,
										value: item.id,
										disabled: item.active === false
									}, {
										default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [createBaseVNode("span", null, toDisplayString(item.name), 1), item.active === false ? (openBlock(), createBlock(unref(N8nTooltip_default), {
											key: 0,
											content: unref(i18n).baseText("resourceLocator.workflow.inactive.tooltip"),
											placement: "top"
										}, {
											default: withCtx(() => [createVNode(unref(N8nIcon_default), {
												icon: "triangle-alert",
												size: "small",
												class: normalizeClass(_ctx.$style.inactiveIcon)
											}, null, 8, ["class"])]),
											_: 1
										}, 8, ["content"])) : createCommentVNode("", true)], 2)]),
										_: 2
									}, 1032, [
										"label",
										"value",
										"disabled"
									]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"remote-method",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					unref(isCredentialResolverEnabled) ? (openBlock(), createBlock(unref(ElRow), {
						key: 1,
						"data-test-id": "credential-resolver"
					}, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.credentialResolver")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.credentialResolver) }, null, 8, _hoisted_5)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["credential-resolver-container"]) }, [createVNode(unref(N8nSelect_default), {
								ref_key: "credentialResolverSelectRef",
								ref: credentialResolverSelectRef,
								modelValue: selectedResolverId.value,
								"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => selectedResolverId.value = $event),
								placeholder: unref(i18n).baseText("workflowSettings.credentialResolver.placeholder"),
								filterable: "",
								clearable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update || !unref(canListCredentialResolvers),
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-credential-resolver"
							}, createSlots({
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(credentialResolvers), (resolver) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: resolver.id,
										label: resolver.name,
										value: resolver.id
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 2
							}, [unref(canCreateCredentialResolver) ? {
								name: "footer",
								fn: withCtx(() => [createBaseVNode("button", {
									type: "button",
									class: normalizeClass(_ctx.$style["create-new-button"]),
									disabled: readOnlyEnv.value || !workflowPermissions.value.update,
									"data-test-id": "workflow-settings-credential-resolver-create-new",
									onClick: handleCreateNewResolver
								}, [createVNode(unref(N8nIcon_default), {
									size: "xsmall",
									icon: "plus"
								}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("workflowSettings.credentialResolver.createNew")), 1)], 10, _hoisted_6)]),
								key: "0"
							} : void 0]), 1032, [
								"modelValue",
								"placeholder",
								"disabled"
							]), isSelectedResolverEditable.value && unref(canUpdateCredentialResolver) ? (openBlock(), createBlock(unref(N8nIconButton_default), {
								key: 0,
								variant: "ghost",
								icon: "pen",
								size: "small",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								title: unref(i18n).baseText("workflowSettings.credentialResolver.edit"),
								"data-test-id": "workflow-settings-credential-resolver-edit",
								onClick: handleEditResolver
							}, null, 8, ["disabled", "title"])) : createCommentVNode("", true)], 2)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					isSharingEnabled.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(ElRow), { "data-test-id": "workflow-caller-policy" }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.callerPolicy")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.workflowCallerPolicy) }, null, 8, _hoisted_7)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.callerPolicy,
								"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => workflowSettings.value.callerPolicy = $event),
								disabled: readOnlyEnv.value || !workflowPermissions.value.update || unref(nodeTypesStore).isNodeTypeUnavailable(unref("n8n-nodes-base.executeWorkflow")),
								placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
								filterable: "",
								"limit-popper-width": true,
								"data-test-id": "workflow-caller-policy-select"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(workflowCallerPolicyOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.key,
										label: option.value,
										value: option.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"disabled",
								"placeholder"
							])]),
							_: 1
						})]),
						_: 1
					}), workflowSettings.value.callerPolicy === "workflowsFromAList" ? (openBlock(), createBlock(unref(ElRow), { key: 0 }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [
								createBaseVNode("span", {
									class: normalizeClass(_ctx.$style["caller-ids-connector"]),
									"aria-hidden": "true"
								}, "└─", 2),
								createBaseVNode("span", { class: normalizeClass(_ctx.$style["caller-ids-label"]) }, toDisplayString(unref(i18n).baseText("workflowSettings.callerIds")), 3),
								createVNode(unref(N8nTooltip_default), { placement: "top" }, {
									content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.workflowCallerIds) }, null, 8, _hoisted_8)]),
									default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
									_: 1
								})
							]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								modelValue: workflowSettings.value.callerIds,
								"onUpdate:modelValue": [_cache[5] || (_cache[5] = ($event) => workflowSettings.value.callerIds = $event), onCallerIdsInput],
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								placeholder: unref(i18n).baseText("workflowSettings.callerIds.placeholder"),
								type: "text",
								"data-test-id": "workflow-caller-policy-workflow-ids"
							}, null, 8, [
								"modelValue",
								"disabled",
								"placeholder"
							])]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.timezone")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.timezone) }, null, 8, _hoisted_9)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.timezone,
								"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => workflowSettings.value.timezone = $event),
								placeholder: unref(i18n).baseText("workflowSettings.timezone.placeholder"),
								filterable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-timezone"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(timezones.value, (timezone) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: timezone.key,
										label: timezone.value,
										value: timezone.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.saveDataErrorExecution")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.saveDataErrorExecution) }, null, 8, _hoisted_10)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.saveDataErrorExecution,
								"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => workflowSettings.value.saveDataErrorExecution = $event),
								placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
								filterable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-save-failed-executions"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(saveDataErrorExecutionOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.key,
										label: option.value,
										value: option.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.saveDataSuccessExecution")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.saveDataSuccessExecution) }, null, 8, _hoisted_11)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.saveDataSuccessExecution,
								"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => workflowSettings.value.saveDataSuccessExecution = $event),
								placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
								filterable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-save-success-executions"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(saveDataSuccessExecutionOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.key,
										label: option.value,
										value: option.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.saveManualExecutions")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.saveManualExecutions) }, null, 8, _hoisted_12)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.saveManualExecutions,
								"onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => workflowSettings.value.saveManualExecutions = $event),
								placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
								filterable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-save-manual-executions"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(saveManualOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: `${option.key}`,
										label: option.value,
										value: option.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.saveExecutionProgress")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.saveExecutionProgress) }, null, 8, _hoisted_13)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), {
							span: 14,
							class: "ignore-key-press-canvas"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.saveExecutionProgress,
								"onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => workflowSettings.value.saveExecutionProgress = $event),
								placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
								filterable: "",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"limit-popper-width": true,
								"data-test-id": "workflow-settings-save-execution-progress"
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(saveExecutionProgressOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: `${option.key}`,
										label: option.value,
										value: option.key
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						})]),
						_: 1
					}),
					isRedactionSettingVisible.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
						createVNode(unref(ElRow), { "data-test-id": "workflow-settings-redaction-policy" }, {
							default: withCtx(() => [createVNode(unref(ElCol), {
								span: 10,
								class: normalizeClass([_ctx.$style["setting-name"], { [_ctx.$style["setting-name--disabled"]]: !isDataRedactionLicensed.value || isProductionRedactionLocked.value }])
							}, {
								default: withCtx(() => [
									createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactProductionData")) + " ", 1),
									isProductionRedactionLocked.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
										key: 0,
										icon: "lock",
										size: "xsmall",
										style: { "opacity": "1" },
										"data-test-id": productionRedactionLockReason.value === "floor" ? "workflow-settings-redaction-floor-lock" : void 0
									}, null, 8, ["data-test-id"])) : createCommentVNode("", true),
									!isDataRedactionLicensed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 1,
										class: normalizeClass([_ctx.$style["upgrade-badge"], "ml-4xs"]),
										onClick: goToDataRedactionUpgrade
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									}, 8, ["class"])) : createCommentVNode("", true),
									createVNode(unref(N8nTooltip_default), { placement: "top" }, {
										content: withCtx(() => [createBaseVNode("div", null, [createTextVNode(toDisplayString(helpTexts.value.redactProductionData) + " ", 1), createVNode(unref(N8nLink_default), {
											to: unref(EXECUTION_DATA_REDACTION_DOCS_URL),
											size: "small",
											"new-window": "",
											"data-test-id": "redact-production-data-docs-link"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
											_: 1
										}, 8, ["to"])])]),
										default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
										_: 1
									})
								]),
								_: 1
							}, 8, ["class"]), createVNode(unref(ElCol), {
								span: 14,
								class: normalizeClass(["ignore-key-press-canvas", { [_ctx.$style["setting-name--disabled"]]: isProductionRedactionLocked.value }])
							}, {
								default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
									disabled: !isProductionRedactionLocked.value,
									enterable: true,
									placement: "top"
								}, {
									content: withCtx(() => [productionRedactionLockReason.value === "floor" ? (openBlock(), createElementBlock("span", _hoisted_14, toDisplayString(unref(i18n).baseText("workflowSettings.redactionFloorNotice")), 1)) : (openBlock(), createElementBlock("span", _hoisted_15, [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactionPermissionNotice")) + " ", 1), createBaseVNode("span", {
										class: normalizeClass(_ctx.$style["permission-notice-link"]),
										onClick: _cache[11] || (_cache[11] = ($event) => redactionMembersModalOpen.value = true)
									}, toDisplayString(unref(i18n).baseText("workflowSettings.redactionPermissionNotice.viewUsers")), 3)]))]),
									default: withCtx(() => [createVNode(unref(N8nSelect_default), {
										modelValue: redactProductionData.value,
										"onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => redactProductionData.value = $event),
										disabled: !isDataRedactionLicensed.value || readOnlyEnv.value || isProductionRedactionLocked.value || workflowHasDynamicCredentials.value,
										placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
										filterable: "",
										"limit-popper-width": true,
										"data-test-id": "workflow-settings-redact-production-select"
									}, {
										default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(redactionToggleOptions.value, (option) => {
											return openBlock(), createBlock(unref(N8nOption_default), {
												key: option.key,
												label: option.value,
												value: option.key
											}, null, 8, ["label", "value"]);
										}), 128))]),
										_: 1
									}, 8, [
										"modelValue",
										"disabled",
										"placeholder"
									])]),
									_: 1
								}, 8, ["disabled"])]),
								_: 1
							}, 8, ["class"])]),
							_: 1
						}),
						workflowHasDynamicCredentials.value ? (openBlock(), createBlock(unref(ElRow), {
							key: 0,
							class: normalizeClass(_ctx.$style["dynamic-credentials-hint"])
						}, {
							default: withCtx(() => [createVNode(unref(ElCol), { span: 10 }), createVNode(unref(ElCol), { span: 14 }, {
								default: withCtx(() => [createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light",
									class: normalizeClass(_ctx.$style.dataRedactionHint)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactProductionData.dynamicCredentialsHint")), 1)]),
									_: 1
								}, 8, ["class"])]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						createVNode(unref(ElRow), null, {
							default: withCtx(() => [createVNode(unref(ElCol), {
								span: 10,
								class: normalizeClass([_ctx.$style["setting-name"], { [_ctx.$style["setting-name--disabled"]]: !isDataRedactionLicensed.value || isManualRedactionLocked.value || isManualRedactionDisabledByProduction.value }])
							}, {
								default: withCtx(() => [
									createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactManualData")) + " ", 1),
									isManualRedactionLocked.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
										key: 0,
										icon: "lock",
										size: "xsmall",
										style: { "opacity": "1" },
										"data-test-id": manualRedactionLockReason.value === "floor" ? "workflow-settings-redaction-floor-lock" : void 0
									}, null, 8, ["data-test-id"])) : createCommentVNode("", true),
									!isDataRedactionLicensed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 1,
										class: normalizeClass([_ctx.$style["upgrade-badge"], "ml-4xs"]),
										onClick: goToDataRedactionUpgrade
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									}, 8, ["class"])) : createCommentVNode("", true),
									createVNode(unref(N8nTooltip_default), { placement: "top" }, {
										content: withCtx(() => [createBaseVNode("div", null, [createTextVNode(toDisplayString(helpTexts.value.redactManualData) + " ", 1), createVNode(unref(N8nLink_default), {
											to: unref(EXECUTION_DATA_REDACTION_DOCS_URL),
											size: "small",
											"new-window": "",
											"data-test-id": "redact-manual-data-docs-link"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
											_: 1
										}, 8, ["to"])])]),
										default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
										_: 1
									})
								]),
								_: 1
							}, 8, ["class"]), createVNode(unref(ElCol), {
								span: 14,
								class: normalizeClass(["ignore-key-press-canvas", { [_ctx.$style["setting-name--disabled"]]: isManualRedactionLocked.value || isManualRedactionDisabledByProduction.value }])
							}, {
								default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
									disabled: !isManualRedactionLocked.value && !isManualRedactionDisabledByProduction.value,
									enterable: true,
									placement: "top"
								}, {
									content: withCtx(() => [manualRedactionLockReason.value === "floor" ? (openBlock(), createElementBlock("span", _hoisted_16, toDisplayString(unref(i18n).baseText("workflowSettings.redactionFloorNotice")), 1)) : isManualRedactionLocked.value ? (openBlock(), createElementBlock("span", _hoisted_17, [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactionPermissionNotice")) + " ", 1), createBaseVNode("span", {
										class: normalizeClass(_ctx.$style["permission-notice-link"]),
										onClick: _cache[13] || (_cache[13] = ($event) => redactionMembersModalOpen.value = true)
									}, toDisplayString(unref(i18n).baseText("workflowSettings.redactionPermissionNotice.viewUsers")), 3)])) : isManualRedactionDisabledByProduction.value ? (openBlock(), createElementBlock("span", _hoisted_18, toDisplayString(unref(i18n).baseText("workflowSettings.redactManualData.requiresProductionHint")), 1)) : createCommentVNode("", true)]),
									default: withCtx(() => [createVNode(unref(N8nSelect_default), {
										modelValue: redactManualData.value,
										"onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => redactManualData.value = $event),
										disabled: !isDataRedactionLicensed.value || readOnlyEnv.value || isManualRedactionLocked.value || isManualRedactionDisabledByProduction.value,
										placeholder: unref(i18n).baseText("workflowSettings.selectOption"),
										filterable: "",
										"limit-popper-width": true,
										"data-test-id": "workflow-settings-redact-manual-select"
									}, {
										default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(redactionToggleOptions.value, (option) => {
											return openBlock(), createBlock(unref(N8nOption_default), {
												key: option.key,
												label: option.value,
												value: option.key
											}, null, 8, ["label", "value"]);
										}), 128))]),
										_: 1
									}, 8, [
										"modelValue",
										"disabled",
										"placeholder"
									])]),
									_: 1
								}, 8, ["disabled"])]),
								_: 1
							}, 8, ["class"])]),
							_: 1
						}),
						isCallerRedactionSettingVisible.value ? (openBlock(), createBlock(unref(ElRow), {
							key: 1,
							"data-test-id": "workflow-settings-redact-caller-executions-row"
						}, {
							default: withCtx(() => [createVNode(unref(ElCol), {
								span: 10,
								class: normalizeClass([_ctx.$style["setting-name"], { [_ctx.$style["setting-name--disabled"]]: !isDataRedactionLicensed.value || isCallerRedactionLocked.value }])
							}, {
								default: withCtx(() => [
									createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactCallerExecutions")) + " ", 1),
									isCallerRedactionLocked.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
										key: 0,
										icon: "lock",
										size: "xsmall",
										style: { "opacity": "1" }
									})) : createCommentVNode("", true),
									createVNode(unref(N8nTooltip_default), { placement: "top" }, {
										content: withCtx(() => [createBaseVNode("div", null, [createTextVNode(toDisplayString(helpTexts.value.redactCallerExecutions) + " ", 1), createVNode(unref(N8nLink_default), {
											to: unref(EXECUTION_DATA_REDACTION_DOCS_URL),
											size: "small",
											"new-window": "",
											"data-test-id": "redact-caller-executions-docs-link"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
											_: 1
										}, 8, ["to"])])]),
										default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
										_: 1
									})
								]),
								_: 1
							}, 8, ["class"]), createVNode(unref(ElCol), { span: 14 }, {
								default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
									disabled: !isCallerRedactionLocked.value,
									enterable: true,
									placement: "top"
								}, {
									content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.redactionPermissionNotice")) + " ", 1), createBaseVNode("span", {
										class: normalizeClass(_ctx.$style["permission-notice-link"]),
										onClick: _cache[15] || (_cache[15] = ($event) => redactionMembersModalOpen.value = true)
									}, toDisplayString(unref(i18n).baseText("workflowSettings.redactionPermissionNotice.viewUsers")), 3)]),
									default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
										class: normalizeClass(_ctx.$style["setting-switch"]),
										size: "large",
										disabled: !isDataRedactionLicensed.value || readOnlyEnv.value || isCallerRedactionLocked.value,
										"aria-label": unref(i18n).baseText("workflowSettings.redactCallerExecutions"),
										"model-value": workflowSettings.value.redactCallerExecutions !== false,
										"data-test-id": "workflow-settings-redact-caller-executions",
										"onUpdate:modelValue": toggleRedactCallerExecutions
									}, null, 8, [
										"class",
										"disabled",
										"aria-label",
										"model-value"
									])]),
									_: 1
								}, 8, ["disabled"])]),
								_: 1
							})]),
							_: 1
						})) : createCommentVNode("", true)
					], 64)) : createCommentVNode("", true),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.timeoutWorkflow")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.executionTimeoutToggle) }, null, 8, _hoisted_19)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), { span: 14 }, {
							default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nSwitch_default), {
								class: normalizeClass(_ctx.$style["setting-switch"]),
								size: "large",
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"aria-label": unref(i18n).baseText("workflowSettings.timeoutWorkflow"),
								"model-value": (workflowSettings.value.executionTimeout ?? -1) > -1,
								"data-test-id": "workflow-settings-timeout-workflow",
								"onUpdate:modelValue": toggleTimeout
							}, null, 8, [
								"class",
								"disabled",
								"aria-label",
								"model-value"
							])])]),
							_: 1
						})]),
						_: 1
					}),
					(workflowSettings.value.executionTimeout ?? -1) > -1 ? (openBlock(), createElementBlock("div", _hoisted_20, [createVNode(unref(ElRow), { class: normalizeClass(_ctx.$style["timeout-row"]) }, {
						default: withCtx(() => [
							createVNode(unref(ElCol), {
								span: 10,
								class: normalizeClass(_ctx.$style["setting-name"])
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.timeoutAfter")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
									content: withCtx(() => [createBaseVNode("div", { textContent: toDisplayString(helpTexts.value.executionTimeout) }, null, 8, _hoisted_21)]),
									default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
									_: 1
								})]),
								_: 1
							}, 8, ["class"]),
							createVNode(unref(ElCol), { span: 4 }, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									disabled: readOnlyEnv.value || !workflowPermissions.value.update,
									"model-value": timeoutHMS.value.hours,
									min: 0,
									"onUpdate:modelValue": _cache[16] || (_cache[16] = (value) => setTheTimeout("hours", value))
								}, {
									append: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.hours")), 1)]),
									_: 1
								}, 8, ["disabled", "model-value"])]),
								_: 1
							}),
							createVNode(unref(ElCol), {
								span: 4,
								class: normalizeClass(_ctx.$style["timeout-input"])
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									disabled: readOnlyEnv.value || !workflowPermissions.value.update,
									"model-value": timeoutHMS.value.minutes,
									min: 0,
									max: 60,
									"onUpdate:modelValue": _cache[17] || (_cache[17] = (value) => setTheTimeout("minutes", value))
								}, {
									append: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.minutes")), 1)]),
									_: 1
								}, 8, ["disabled", "model-value"])]),
								_: 1
							}, 8, ["class"]),
							createVNode(unref(ElCol), {
								span: 4,
								class: normalizeClass(_ctx.$style["timeout-input"])
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									disabled: readOnlyEnv.value || !workflowPermissions.value.update,
									"model-value": timeoutHMS.value.seconds,
									min: 0,
									max: 60,
									"onUpdate:modelValue": _cache[18] || (_cache[18] = (value) => setTheTimeout("seconds", value))
								}, {
									append: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.seconds")), 1)]),
									_: 1
								}, 8, ["disabled", "model-value"])]),
								_: 1
							}, 8, ["class"])
						]),
						_: 1
					}, 8, ["class"])])) : createCommentVNode("", true),
					isMCPEnabled.value ? (openBlock(), createBlock(unref(ElRow), {
						key: 5,
						"data-test-id": "workflow-settings-available-in-mcp"
					}, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createBaseVNode("label", _hoisted_22, [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.availableInMCP")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createTextVNode(toDisplayString(mcpToggleTooltip.value), 1)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})])]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), { span: 14 }, {
							default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nTooltip_default), {
								placement: "top",
								disabled: !mcpToggleDisabled.value
							}, {
								content: withCtx(() => [createTextVNode(toDisplayString(mcpToggleTooltip.value), 1)]),
								default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
									id: "availableInMCP",
									class: normalizeClass(_ctx.$style["setting-switch"]),
									size: "large",
									disabled: mcpToggleDisabled.value,
									"model-value": workflowSettings.value.availableInMCP ?? false,
									"data-test-id": "workflow-settings-available-in-mcp",
									"onUpdate:modelValue": toggleAvailableInMCP
								}, null, 8, [
									"class",
									"disabled",
									"model-value"
								])]),
								_: 1
							}, 8, ["disabled"])])]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 10,
							class: normalizeClass(_ctx.$style["setting-name"])
						}, {
							default: withCtx(() => [createBaseVNode("label", _hoisted_23, [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution")) + " ", 1), createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.tooltip")), 1)]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "circle-help" })]),
								_: 1
							})])]),
							_: 1
						}, 8, ["class"]), createVNode(unref(ElCol), { span: 14 }, {
							default: withCtx(() => [createBaseVNode("div", _hoisted_24, [createVNode(unref(N8nSelect_default), {
								modelValue: workflowSettings.value.timeSavedMode,
								"onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => workflowSettings.value.timeSavedMode = $event),
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"data-test-id": "workflow-settings-time-saved-mode",
								size: "medium",
								filterable: "",
								"limit-popper-width": true
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(timeSavedModeOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										label: option.label,
										value: option.value
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue", "disabled"])])]),
							_: 1
						})]),
						_: 1
					}),
					workflowSettings.value.timeSavedMode === "fixed" ? (openBlock(), createBlock(unref(ElRow), { key: 6 }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 14,
							offset: 10
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-input"]) }, [createVNode(unref(N8nInputNumber_default), {
								id: "timeSavedPerExecution",
								modelValue: workflowSettings.value.timeSavedPerExecution,
								"onUpdate:modelValue": [_cache[20] || (_cache[20] = ($event) => workflowSettings.value.timeSavedPerExecution = $event), updateTimeSavedPerExecution],
								"controls-position": "right",
								size: "medium",
								controls: true,
								class: normalizeClass(_ctx.$style.timeSavedPerExecution),
								disabled: readOnlyEnv.value || !workflowPermissions.value.update,
								"data-test-id": "workflow-settings-time-saved-per-execution",
								min: 0,
								precision: 0
							}, null, 8, [
								"modelValue",
								"class",
								"disabled"
							]), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.hint")), 1)], 2)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					workflowSettings.value.timeSavedMode === "fixed" && hasSavedTimeNodes.value ? (openBlock(), createBlock(unref(ElRow), { key: 7 }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 14,
							offset: 10
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-content"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-warning"]) }, [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("workflowSettings.timeSavedPerExecution.fixedTabWarning", { interpolate: { link: `<a href='#' class='${_ctx.$style["time-saved-link"]}' data-action='openSavedTimeNodeCreator'>${unref(i18n).baseText("workflowSettings.timeSavedPerExecution.fixedTabWarning.link")}</a>` } })]])], 2)], 2)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					workflowSettings.value.timeSavedMode === "dynamic" && hasSavedTimeNodes.value ? (openBlock(), createBlock(unref(ElRow), { key: 8 }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 14,
							offset: 10
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-content"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-nodes-active"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["nodes-active-wrapper"]) }, [createVNode(unref(N8nIcon_default), {
								icon: "clock",
								class: normalizeClass(_ctx.$style["nodes-active-icon"])
							}, null, 8, ["class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style["nodes-active-content"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["nodes-active-title"]) }, toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.nodesDetected", { interpolate: { count: savedTimeNodes.value.length } })), 3), createBaseVNode("div", { class: normalizeClass(_ctx.$style["nodes-active-hint"]) }, toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.nodesDetected.hint")), 3)], 2)], 2), createBaseVNode("a", {
								href: "#",
								class: normalizeClass(_ctx.$style["add-more-link"]),
								"data-action": "openSavedTimeNodeCreator"
							}, toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.nodesDetected.addMore")), 3)], 2)], 2)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					workflowSettings.value.timeSavedMode === "dynamic" && !hasSavedTimeNodes.value ? (openBlock(), createBlock(unref(ElRow), { key: 9 }, {
						default: withCtx(() => [createVNode(unref(ElCol), {
							span: 14,
							offset: 10
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-content"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["time-saved-no-nodes"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style["no-nodes-title"]) }, toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.noNodesDetected")), 3), createBaseVNode("div", { class: normalizeClass(_ctx.$style["no-nodes-hint"]) }, toDisplayString(unref(i18n).baseText("workflowSettings.timeSavedPerExecution.noNodesDetected.hint")), 3)], 2)], 2)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					unref(settingsStore).isOtelCustomSpanAttributesEnabled ? (openBlock(), createBlock(WorkflowCustomTelemetryTags_default, {
						key: 10,
						modelValue: workflowSettings.value.customTelemetryTags,
						"onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => workflowSettings.value.customTelemetryTags = $event),
						"is-read-only": isWorkflowSettingsReadOnly.value,
						"save-tags": saveCustomTelemetryTags,
						onValidityChange: _cache[22] || (_cache[22] = ($event) => hasCustomTelemetryTagErrors.value = $event)
					}, null, 8, ["modelValue", "is-read-only"])) : createCommentVNode("", true)
				], 2)), [[_directive_loading, isLoading.value]])]),
				footer: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["action-buttons"]),
					"data-test-id": "workflow-settings-save-button"
				}, [createVNode(unref(N8nButton_default), {
					disabled: readOnlyEnv.value || !workflowPermissions.value.update || hasCustomTelemetryTagErrors.value,
					label: unref(i18n).baseText("workflowSettings.save"),
					size: "large",
					float: "right",
					onClick: saveSettings
				}, null, 8, ["disabled", "label"])], 2), unref(workflowDocumentStore)?.homeProject?.id ? (openBlock(), createBlock(RedactionMembersModal_default, {
					key: 0,
					open: redactionMembersModalOpen.value,
					"project-id": unref(workflowDocumentStore)?.homeProject?.id,
					"onUpdate:open": _cache[23] || (_cache[23] = ($event) => redactionMembersModalOpen.value = $event)
				}, null, 8, ["open", "project-id"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"name",
				"title",
				"event-bus"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	"workflow-settings": "_workflow-settings_tgmqc_1",
	"setting-switch": "_setting-switch_tgmqc_12",
	dataRedactionHint: "_dataRedactionHint_tgmqc_16",
	"setting-name": "_setting-name_tgmqc_21",
	"engine-type-pending-badge": "_engine-type-pending-badge_tgmqc_38",
	"setting-name--disabled": "_setting-name--disabled_tgmqc_45",
	"caller-ids-connector": "_caller-ids-connector_tgmqc_49",
	"caller-ids-label": "_caller-ids-label_tgmqc_54",
	"permission-notice-link": "_permission-notice-link_tgmqc_58",
	"upgrade-badge": "_upgrade-badge_tgmqc_64",
	"timeout-input": "_timeout-input_tgmqc_68",
	"timeout-row": "_timeout-row_tgmqc_85",
	"dynamic-credentials-hint": "_dynamic-credentials-hint_tgmqc_93",
	"time-saved": "_time-saved_tgmqc_100",
	"time-saved-input": "_time-saved-input_tgmqc_111",
	timeSavedPerExecution: "_timeSavedPerExecution_tgmqc_117",
	"time-saved-dropdown": "_time-saved-dropdown_tgmqc_122",
	"time-saved-tabs": "_time-saved-tabs_tgmqc_126",
	"time-saved-content": "_time-saved-content_tgmqc_132",
	"time-saved-warning": "_time-saved-warning_tgmqc_139",
	"time-saved-link": "_time-saved-link_tgmqc_144",
	"time-saved-no-nodes": "_time-saved-no-nodes_tgmqc_152",
	"no-nodes-title": "_no-nodes-title_tgmqc_158",
	"no-nodes-hint": "_no-nodes-hint_tgmqc_163",
	"time-saved-nodes-active": "_time-saved-nodes-active_tgmqc_169",
	"nodes-active-wrapper": "_nodes-active-wrapper_tgmqc_175",
	"nodes-active-icon": "_nodes-active-icon_tgmqc_181",
	"nodes-active-content": "_nodes-active-content_tgmqc_186",
	"nodes-active-title": "_nodes-active-title_tgmqc_193",
	"nodes-active-hint": "_nodes-active-hint_tgmqc_198",
	"add-more-link": "_add-more-link_tgmqc_203",
	"list-option": "_list-option_tgmqc_212",
	"option-headline": "_option-headline_tgmqc_217",
	"option-description": "_option-description_tgmqc_222",
	optionContent: "_optionContent_tgmqc_230",
	c: "_c_tgmqc_49",
	"credential-resolver-container": "_credential-resolver-container_tgmqc_246",
	"create-new-button": "_create-new-button_tgmqc_251"
} }]]);
//#endregion
export { WorkflowSettings_default as default };
