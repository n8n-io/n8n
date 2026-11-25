import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, pd as useDebounceFn, xf as useModel, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { As as PREFERENCES_DEFAULT_PAGE_SIZE, Cs as preferenceScope, Ds as toPreferenceSortOption, Es as toPreferencePermissions, Hj as SettingsPageHeader_default, It as useInstanceAiHandoff, KA as Dialog_default, Kd as useDocumentTitle, Ms as PREFERENCE_TEXT_MAX_LENGTH, NM as N8nCard_default, NS as PREFERENCES_EMPTY_STATE_EXPERIMENT, PA as useMessage, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Ss as preferenceAudience, Ts as preferenceWriteRejectionReason, Tt as ensurePersonalProjectId, UA as DialogFooter_default, Uj as SettingsLayout_default, WA as DialogBody_default, YM as N8nActionToggle_default, _C as useUsersStore, _N as N8nText_default, _s as canWriteProjectScope, cN as Input_default, dC as useToast, dM as N8nSwitch_default, dx as MODAL_CONFIRM, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, fC as VIEWS, fN as N8nTooltip_default, gM as N8nInputLabel_default, hC as useTelemetry, hs as canWriteInstanceScope, jN as useI18n, js as PREFERENCES_PAGE_SIZES, ks as CONTEXT_DEFAULT_SORT_BY, mM as N8nOption_default, ms as canManageContextPreferences, nN as N8nBadge_default, od as useInstanceAiReady, oj as N8nUserInfo_default, pM as N8nSelect_default, uM as N8nFormInput_default, vm as useProjectsStore, vy as usePostHog, w_ as DEFAULT_PROJECT_ICON, ws as preferenceUserName, wy as TELEMETRY_EVENT, xM as N8nEmptyState_default, xN as N8nIcon_default, xs as keepSortOnClear, yC as useSettingsStore, yN as N8nButton_default, ys as isContextPreferencesEnabled, yu as TimeAgo_default, yy as getDebounceTime, zj as EnterpriseReadinessBadge_default } from "./app-D5flEmb-.js";
import { t as useElementOverflow } from "./useElementOverflow-Bq13ByqI.js";
import { t as useContextStore } from "./context.store-NJvocoDO.js";
//#region src/experiments/preferencesEmptyState/components/PreferencesEmptyStateAssistant.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PreferencesEmptyStateAssistant_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferencesEmptyStateAssistant",
	emits: ["write-own"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const instanceAiHandoff = useInstanceAiHandoff();
		const isStartingThread = ref(false);
		const steps = [
			i18n.baseText("experiments.preferencesEmptyState.assistant.steps.review"),
			i18n.baseText("experiments.preferencesEmptyState.assistant.steps.suggest"),
			i18n.baseText("experiments.preferencesEmptyState.assistant.steps.apply")
		];
		async function suggestPreferences() {
			if (isStartingThread.value) return;
			isStartingThread.value = true;
			try {
				const projectId = await ensurePersonalProjectId();
				if (!projectId) return;
				await instanceAiHandoff.openThreadWithDraft(projectId, {
					text: i18n.baseText("experiments.preferencesEmptyState.assistant.message"),
					prefillType: "preferences_suggestion"
				}, {
					source: "preferences_empty_state",
					origin: "internal"
				});
			} finally {
				isStartingThread.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.emptyState),
				"data-test-id": "preferences-empty-state-assistant"
			}, [
				createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "medium",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.assistant.title")), 1)]),
					_: 1
				}),
				createBaseVNode("ol", { class: normalizeClass(_ctx.$style.steps) }, [(openBlock(), createElementBlock(Fragment, null, renderList(steps, (step, index) => {
					return createBaseVNode("li", {
						key: step,
						class: normalizeClass(_ctx.$style.step),
						"data-test-id": "preferences-empty-state-assistant-step"
					}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.stepNumber) }, toDisplayString(index + 1), 3), createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(step), 1)]),
						_: 2
					}, 1024)], 2);
				}), 64))], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
					loading: isStartingThread.value,
					"data-test-id": "preferences-empty-state-suggest",
					onClick: suggestPreferences
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "sparkles" })]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.assistant.suggest")), 1)]),
					_: 1
				}, 8, ["loading"]), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					"data-test-id": "preferences-empty-state-write-own",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("write-own"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.writeOwn")), 1)]),
					_: 1
				})], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	emptyState: "_emptyState_n8lgm_1",
	steps: "_steps_n8lgm_9",
	step: "_step_n8lgm_9",
	stepNumber: "_stepNumber_n8lgm_24",
	actions: "_actions_n8lgm_38"
} }]]);
//#endregion
//#region src/experiments/preferencesEmptyState/preferenceExamples.ts
var PREFERENCE_EXAMPLE_CARDS = [
	{
		id: "workflows",
		icon: "workflow",
		categoryKey: "experiments.preferencesEmptyState.examples.workflows.category",
		contentKey: "experiments.preferencesEmptyState.examples.workflows.content"
	},
	{
		id: "agents",
		icon: "bot",
		categoryKey: "experiments.preferencesEmptyState.examples.agents.category",
		contentKey: "experiments.preferencesEmptyState.examples.agents.content"
	},
	{
		id: "credentials",
		icon: "key-round",
		categoryKey: "experiments.preferencesEmptyState.examples.credentials.category",
		contentKey: "experiments.preferencesEmptyState.examples.credentials.content"
	},
	{
		id: "answers",
		icon: "message-square",
		categoryKey: "experiments.preferencesEmptyState.examples.answers.category",
		contentKey: "experiments.preferencesEmptyState.examples.answers.content"
	}
];
//#endregion
//#region src/experiments/preferencesEmptyState/components/PreferencesEmptyStateExamples.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PreferencesEmptyStateExamples_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferencesEmptyStateExamples",
	emits: ["use-example", "write-own"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		function useExample(card) {
			emit("use-example", {
				id: card.id,
				content: i18n.baseText(card.contentKey)
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.emptyState),
				"data-test-id": "preferences-empty-state-examples"
			}, [
				createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "medium",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.examples.title")), 1)]),
					_: 1
				}),
				createVNode(unref(N8nText_default), {
					color: "text-light",
					class: normalizeClass(_ctx.$style.description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.examples.description")), 1)]),
					_: 1
				}, 8, ["class"]),
				createBaseVNode("ul", { class: normalizeClass(_ctx.$style.grid) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(PREFERENCE_EXAMPLE_CARDS), (card) => {
					return openBlock(), createElementBlock("li", { key: card.id }, [createVNode(unref(N8nCard_default), {
						class: normalizeClass(_ctx.$style.card),
						"data-test-id": `preferences-example-${card.id}`
					}, {
						header: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.category) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.categoryIcon) }, [createVNode(unref(N8nIcon_default), {
							icon: card.icon,
							size: "small"
						}, null, 8, ["icon"])], 2), createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(card.categoryKey)), 1)]),
							_: 2
						}, 1024)], 2)]),
						footer: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light",
							class: normalizeClass(_ctx.$style.scope)
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "user",
								size: "small"
							}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.examples.scope")), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							"data-test-id": "preferences-example-use-button",
							onClick: ($event) => useExample(card)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.examples.use")), 1)]),
							_: 1
						}, 8, ["onClick"])]),
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							tag: "p",
							color: "text-dark",
							class: normalizeClass(_ctx.$style.content)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(card.contentKey)), 1)]),
							_: 2
						}, 1032, ["class"])]),
						_: 2
					}, 1032, ["class", "data-test-id"])]);
				}), 128))], 2),
				createVNode(unref(N8nButton_default), {
					variant: "solid",
					"data-test-id": "preferences-empty-state-write-own",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("write-own"))
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "plus" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("experiments.preferencesEmptyState.writeOwn")), 1)]),
					_: 1
				})
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	emptyState: "_emptyState_ui6zm_1",
	description: "_description_ui6zm_10",
	grid: "_grid_ui6zm_14",
	card: "_card_ui6zm_26",
	category: "_category_ui6zm_31",
	categoryIcon: "_categoryIcon_ui6zm_37",
	content: "_content_ui6zm_48",
	scope: "_scope_ui6zm_53"
} }]]);
//#endregion
//#region src/experiments/preferencesEmptyState/usePreferencesEmptyStateExperiment.ts
init_runtime_core_esm_bundler();
var PREFERENCES_EMPTY_STATE_VARIANTS = [
	PREFERENCES_EMPTY_STATE_EXPERIMENT.control,
	PREFERENCES_EMPTY_STATE_EXPERIMENT.examples,
	PREFERENCES_EMPTY_STATE_EXPERIMENT.assistant
];
function isPreferencesEmptyStateVariant(value) {
	return PREFERENCES_EMPTY_STATE_VARIANTS.some((variant) => variant === value);
}
function usePreferencesEmptyStateExperiment() {
	const posthogStore = usePostHog();
	const instanceAiReady = useInstanceAiReady();
	const variant = computed(() => {
		if (!instanceAiReady.value) return void 0;
		const assigned = posthogStore.getVariant(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
		return isPreferencesEmptyStateVariant(assigned) ? assigned : void 0;
	});
	function trackExposure() {
		if (!variant.value) return;
		posthogStore.trackExposure(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
	}
	return {
		variant,
		trackExposure
	};
}
//#endregion
//#region src/features/settings/context/components/PreferenceModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
/** Owned by the preferences page: `open`, the row to edit or null, and `saved` to reload. */
var USER_SCOPE_VALUE = "user";
var INSTANCE_SCOPE_VALUE = "instance";
var USER_SCOPE_PREFIX = "user:";
var PROJECT_SCOPE_PREFIX = "project:";
var PreferenceModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferenceModal",
	props: {
		open: { type: Boolean },
		preference: {},
		example: {}
	},
	emits: ["update:open", "saved"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const mode = computed(() => props.preference ? "edit" : "new");
		const preference = computed(() => props.preference);
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { showError } = useToast();
		const projectsStore = useProjectsStore();
		const usersStore = useUsersStore();
		const contextStore = useContextStore();
		const loading = ref(false);
		/** A save reports back only while its opening is current, so it never closes a newer dialog. */
		let openToken = 0;
		const projectScopeValue = (id) => `${PROJECT_SCOPE_PREFIX}${id}`;
		const userScopeValue = (id) => `${USER_SCOPE_PREFIX}${id}`;
		const USER_ICON = {
			type: "icon",
			value: "user"
		};
		const INSTANCE_ICON = {
			type: "icon",
			value: "globe"
		};
		const currentUserId = computed(() => usersStore.currentUser?.id);
		function initialScopeValue() {
			const editing = preference.value;
			if (!editing) return USER_SCOPE_VALUE;
			const scope = preferenceScope(editing);
			if (scope === "instance") return INSTANCE_SCOPE_VALUE;
			if (scope === "project" && editing.projectId) return projectScopeValue(editing.projectId);
			if (editing.userId && editing.userId !== currentUserId.value) return userScopeValue(editing.userId);
			return USER_SCOPE_VALUE;
		}
		const initialScope = ref(initialScopeValue());
		const form = reactive({
			content: preference.value?.content ?? "",
			scope: initialScope.value
		});
		function resetForm() {
			initialScope.value = initialScopeValue();
			form.content = preference.value?.content ?? props.example?.content ?? "";
			form.scope = initialScope.value;
			contentValid.value = false;
		}
		const contentValid = ref(false);
		const contentValidationRules = [{ name: "REQUIRED" }, {
			name: "MAX_LENGTH",
			config: { maximum: PREFERENCE_TEXT_MAX_LENGTH }
		}];
		const trimmedContent = computed(() => form.content.trim());
		function currentTargetOption(editing) {
			const audience = preferenceAudience(editing, currentUserId.value);
			if (audience.kind === "user") return {
				value: initialScope.value,
				label: i18n.baseText("settings.context.preferences.scope.otherUser", { interpolate: { name: preferenceUserName(audience.user) } }),
				icon: USER_ICON,
				usable: true
			};
			if (audience.kind === "personalProject") return {
				value: initialScope.value,
				label: i18n.baseText("settings.context.preferences.scope.otherPersonalProject", { interpolate: { name: audience.ownerName } }),
				icon: USER_ICON,
				usable: true
			};
			return {
				value: initialScope.value,
				label: editing.project?.name ?? editing.projectId ?? "",
				icon: editing.project?.icon ?? DEFAULT_PROJECT_ICON,
				usable: true
			};
		}
		const scopeOptions = computed(() => {
			const options = [{
				value: USER_SCOPE_VALUE,
				label: i18n.baseText("settings.context.preferences.scope.user"),
				icon: USER_ICON,
				usable: true
			}];
			const personal = projectsStore.myProjects.find((project) => project.type === "personal");
			if (personal) options.push({
				value: projectScopeValue(personal.id),
				label: i18n.baseText("settings.context.preferences.scope.personalProject"),
				icon: USER_ICON,
				usable: canWriteProjectScope(personal.id)
			});
			options.push({
				value: INSTANCE_SCOPE_VALUE,
				label: i18n.baseText("settings.context.preferences.scope.instance"),
				icon: INSTANCE_ICON,
				usable: canWriteInstanceScope()
			});
			options.push(...projectsStore.myProjects.filter((project) => project.type === "team").map((project) => ({
				value: projectScopeValue(project.id),
				label: project.name ?? project.id,
				icon: project.icon ?? DEFAULT_PROJECT_ICON,
				usable: canWriteProjectScope(project.id)
			})));
			const editing = preference.value;
			if (editing && !options.some((option) => option.value === initialScope.value)) options.unshift(currentTargetOption(editing));
			const canLeave = !editing || toPreferencePermissions(editing).delete;
			return options.filter((option) => option.value === initialScope.value || canLeave && option.usable);
		});
		const selectedIcon = computed(() => scopeOptions.value.find((option) => option.value === form.scope)?.icon ?? DEFAULT_PROJECT_ICON);
		const modalTitle = computed(() => mode.value === "new" ? i18n.baseText("settings.context.preferences.modal.title.create") : i18n.baseText("settings.context.preferences.modal.title.edit"));
		const isValid = computed(() => contentValid.value && trimmedContent.value.length > 0);
		function parseScope() {
			if (form.scope === USER_SCOPE_VALUE) return {
				scope: "user",
				projectId: null,
				userId: mode.value === "edit" ? currentUserId.value ?? null : null
			};
			if (form.scope === INSTANCE_SCOPE_VALUE) return {
				scope: "instance",
				projectId: null,
				userId: null
			};
			if (form.scope.startsWith(USER_SCOPE_PREFIX)) return {
				scope: "user",
				projectId: null,
				userId: form.scope.slice(5)
			};
			return {
				scope: "project",
				projectId: form.scope.slice(8),
				userId: null
			};
		}
		function closeModal() {
			emit("update:open", false);
		}
		async function handleSubmit() {
			if (!isValid.value || loading.value) return;
			const token = openToken;
			const { scope, projectId, userId } = parseScope();
			const content = trimmedContent.value;
			const payload = {
				content,
				scope,
				projectId,
				...userId ? { userId } : {}
			};
			try {
				loading.value = true;
				if (mode.value === "new") {
					await contextStore.createPreference(payload);
					telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_CREATED_PREFERENCE, {
						scope_type: scope,
						text_length: content.length,
						...projectId ? { project_id: projectId } : {},
						...props.example ? { example_id: props.example.id } : {}
					});
				} else if (preference.value) {
					await contextStore.updatePreference(preference.value.id, payload);
					telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
						scope_type: scope,
						text_length: content.length,
						scope_changed: form.scope !== initialScope.value,
						...projectId ? { project_id: projectId } : {},
						surface: "ui"
					});
				}
				if (token === openToken) emit("saved");
			} catch (error) {
				telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED, {
					surface: "ui",
					reason: preferenceWriteRejectionReason(error),
					scope_type: scope,
					text_length: content.length
				});
				showError(error, i18n.baseText("settings.context.preferences.error.save"));
			} finally {
				loading.value = false;
			}
		}
		watch(() => props.open, (open) => {
			if (!open) return;
			openToken += 1;
			resetForm();
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_OPENED_PREFERENCE_MODAL, {
				mode: mode.value,
				...preference.value ? { scope_type: preferenceScope(preference.value) } : {},
				...props.example ? { example_id: props.example.id } : {}
			});
			projectsStore.getMyProjects();
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				header: modalTitle.value,
				description: __props.example ? unref(i18n).baseText("experiments.preferencesEmptyState.examples.modalDescription") : void 0,
				size: "xlarge",
				"disable-outside-pointer-events": true,
				"data-test-id": "preference-modal",
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.form) }, {
					default: withCtx(() => [
						createVNode(unref(N8nFormInput_default), {
							modelValue: form.content,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.content = $event),
							name: "content",
							type: "textarea",
							"focus-initially": "",
							required: "",
							label: unref(i18n).baseText("settings.context.preferences.modal.text.label"),
							placeholder: unref(i18n).baseText("settings.context.preferences.modal.text.placeholder"),
							autosize: {
								minRows: 6,
								maxRows: 16
							},
							maxlength: unref(PREFERENCE_TEXT_MAX_LENGTH),
							"validate-on-blur": false,
							"validation-rules": contentValidationRules,
							"data-test-id": "preference-modal-text-input",
							onValidate: _cache[1] || (_cache[1] = (value) => contentValid.value = value)
						}, null, 8, [
							"modelValue",
							"label",
							"placeholder",
							"maxlength"
						]),
						createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.counter),
							size: "small",
							color: "text-light",
							"data-test-id": "preference-modal-counter"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(form.content.length) + " / " + toDisplayString(unref(PREFERENCE_TEXT_MAX_LENGTH)), 1)]),
							_: 1
						}, 8, ["class"]),
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("settings.context.preferences.modal.scope.label"),
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: form.scope,
								"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.scope = $event),
								size: "large",
								filterable: "",
								teleported: false,
								"data-test-id": "preference-modal-scope-select"
							}, {
								prefix: withCtx(() => [selectedIcon.value.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									class: normalizeClass(_ctx.$style.emoji)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(selectedIcon.value.value), 1)]),
									_: 1
								}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
									key: 1,
									icon: selectedIcon.value.value
								}, null, 8, ["icon"]))]),
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(scopeOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										value: option.value,
										label: option.label
									}, {
										default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [option.icon.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 0,
											class: normalizeClass(_ctx.$style.emoji)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(option.icon.value), 1)]),
											_: 2
										}, 1032, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
											key: 1,
											icon: option.icon.value
										}, null, 8, ["icon"])), createBaseVNode("span", null, toDisplayString(option.label), 1)], 2)]),
										_: 2
									}, 1032, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue"])]),
							_: 1
						}, 8, ["label"])
					]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("settings.context.preferences.modal.cancel"),
						"data-test-id": "preference-modal-cancel-button",
						onClick: closeModal
					}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
						loading: loading.value,
						disabled: !isValid.value,
						label: unref(i18n).baseText("settings.context.preferences.modal.save"),
						"data-test-id": "preference-modal-save-button",
						onClick: handleSubmit
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"open",
				"header",
				"description"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_lhm6l_1",
	counter: "_counter_lhm6l_7",
	optionContent: "_optionContent_lhm6l_12",
	emoji: "_emoji_lhm6l_18"
} }]]);
//#endregion
//#region src/features/settings/context/components/PreferenceContentCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PreferenceContentCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferenceContentCell",
	props: { content: {} },
	setup(__props) {
		const props = __props;
		const textEl = ref(null);
		const { isOverflowing: isClamped } = useElementOverflow(textEl, "y", [() => props.content]);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				"show-after": 500,
				disabled: !unref(isClamped),
				placement: "top",
				"content-class": _ctx.$style.tooltip
			}, {
				content: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.full) }, toDisplayString(__props.content), 3)]),
				default: withCtx(() => [createBaseVNode("span", {
					ref_key: "textEl",
					ref: textEl,
					class: normalizeClass(_ctx.$style.text),
					"data-test-id": "preference-content"
				}, toDisplayString(__props.content), 3)]),
				_: 1
			}, 8, ["disabled", "content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	text: "_text_15vfq_1",
	tooltip: "_tooltip_15vfq_11",
	full: "_full_15vfq_15"
} }]]);
//#endregion
//#region src/features/settings/context/components/PreferenceScopeBadge.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var PreferenceScopeBadge_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferenceScopeBadge",
	props: { preference: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const audience = computed(() => preferenceAudience(props.preference, usersStore.currentUser?.id));
		const icon = computed(() => {
			switch (audience.value.kind) {
				case "project": return props.preference.project?.icon ?? DEFAULT_PROJECT_ICON;
				case "user":
				case "personalProject": return {
					type: "icon",
					value: "user"
				};
				case "instance": return {
					type: "icon",
					value: "globe"
				};
			}
		});
		const label = computed(() => {
			const scope = audience.value;
			switch (scope.kind) {
				case "instance": return i18n.baseText("settings.context.preferences.scope.instance");
				case "user": return scope.own ? i18n.baseText("settings.context.preferences.scope.user") : i18n.baseText("settings.context.preferences.scope.otherUser", { interpolate: { name: preferenceUserName(scope.user) } });
				case "personalProject": return scope.own ? i18n.baseText("settings.context.preferences.scope.personalProject") : i18n.baseText("settings.context.preferences.scope.otherPersonalProject", { interpolate: { name: scope.ownerName } });
				case "project": return scope.name ?? i18n.baseText("settings.context.preferences.scope.project");
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nBadge_default), {
				variant: "outline",
				class: normalizeClass(_ctx.$style.badge),
				"data-test-id": "preference-scope-badge"
			}, {
				leading: withCtx(() => [icon.value.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					class: normalizeClass([_ctx.$style.icon, _ctx.$style.emoji])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(icon.value.value), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.icon),
					icon: icon.value.value,
					size: "small"
				}, null, 8, ["class", "icon"]))]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(label.value), 1)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	badge: "_badge_y54mi_1",
	emoji: "_emoji_y54mi_4",
	icon: "_icon_y54mi_9"
} }]]);
//#endregion
//#region src/features/settings/context/components/PreferencesTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { "data-test-id": "preferences-table" };
var PreferencesTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferencesTable",
	props: /*@__PURE__*/ mergeModels({
		preferences: {},
		itemsLength: {},
		loading: { type: Boolean },
		showEmpty: { type: Boolean }
	}, {
		"tableOptions": { default: () => ({}) },
		"tableOptionsModifiers": {},
		"selection": { default: () => [] },
		"selectionModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"edit",
		"delete",
		"update:options"
	], ["update:tableOptions", "update:selection"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const tableOptions = useModel(__props, "tableOptions");
		const selection = useModel(__props, "selection");
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const $style = useCssModule();
		function permissions(preference) {
			return toPreferencePermissions(preference);
		}
		/** Rows the viewer cannot delete stay unselectable, so bulk delete never offers a no-op. */
		function isSelectable(preference) {
			return permissions(preference).delete;
		}
		const readOnlyHint = computed(() => i18n.baseText("settings.context.preferences.readOnly.tooltip"));
		function actionsFor(preference) {
			const { update, delete: canDelete } = permissions(preference);
			return [{
				value: "edit",
				label: i18n.baseText("settings.context.preferences.actions.edit"),
				disabled: !update,
				tooltip: update ? void 0 : readOnlyHint.value
			}, {
				value: "delete",
				label: i18n.baseText("settings.context.preferences.actions.delete"),
				disabled: !canDelete,
				tooltip: canDelete ? void 0 : readOnlyHint.value,
				destructive: true
			}];
		}
		function onAction(preference, action) {
			if (action === "edit") emit("edit", preference);
			else emit("delete", preference);
		}
		/** The selection checkbox lives in the first cell, so a click there selects and does not open. */
		function isSelectCellClick(event) {
			return event.target instanceof Element && event.target.closest("td")?.cellIndex === 0;
		}
		function onRowClick(event, payload) {
			if (isSelectCellClick(event) || !permissions(payload.item).update) return;
			emit("edit", payload.item);
		}
		function rowProps(preference) {
			return { class: { [$style.row]: permissions(preference).update } };
		}
		const headers = computed(() => [
			{
				title: i18n.baseText("settings.context.preferences.columns.preference"),
				key: "content",
				width: 510,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.context.preferences.columns.scope"),
				key: "scope",
				value: (row) => preferenceScope(row),
				width: 220,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.context.preferences.columns.createdBy"),
				key: "createdBy",
				width: 220,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.context.preferences.columns.updatedAt"),
				key: "updatedAt",
				width: 130,
				resize: false
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 64,
				disableSort: true,
				resize: false,
				value: () => void 0
			}
		]);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nDataTableServer_default), {
				page: tableOptions.value.page,
				"onUpdate:page": _cache[1] || (_cache[1] = ($event) => tableOptions.value.page = $event),
				"items-per-page": tableOptions.value.itemsPerPage,
				"onUpdate:itemsPerPage": _cache[2] || (_cache[2] = ($event) => tableOptions.value.itemsPerPage = $event),
				"sort-by": tableOptions.value.sortBy,
				selection: selection.value,
				"onUpdate:selection": _cache[3] || (_cache[3] = ($event) => selection.value = $event),
				headers: headers.value,
				items: props.preferences,
				"items-length": props.itemsLength,
				loading: props.loading,
				"page-sizes": unref(PREFERENCES_PAGE_SIZES),
				"row-props": rowProps,
				"show-select": "",
				"item-selectable": isSelectable,
				"onUpdate:options": _cache[4] || (_cache[4] = ($event) => emit("update:options", $event)),
				"onClick:row": onRowClick
			}, createSlots({
				[`item.content`]: withCtx(({ item }) => [createVNode(PreferenceContentCell_default, { content: item.content }, null, 8, ["content"])]),
				[`item.scope`]: withCtx(({ item }) => [createVNode(PreferenceScopeBadge_default, { preference: item }, null, 8, ["preference"])]),
				[`item.createdBy`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(unref($style).creator),
					"data-test-id": "preference-created-by"
				}, [item.createdBy ? (openBlock(), createBlock(unref(N8nUserInfo_default), {
					key: 0,
					"first-name": item.createdBy.firstName,
					"last-name": item.createdBy.lastName,
					email: item.createdBy.email,
					"is-current-user": item.createdBy.id === unref(usersStore).currentUserId,
					"hide-avatar": ""
				}, null, 8, [
					"first-name",
					"last-name",
					"email",
					"is-current-user"
				])) : createCommentVNode("", true), !item.createdBy || item.source !== "ui" ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light",
					"data-test-id": "preference-source"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.context.preferences.source.${item.source}`)), 1)]),
					_: 2
				}, 1024)) : createCommentVNode("", true)], 2)]),
				[`item.updatedAt`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base",
					"data-test-id": "preference-updated-at"
				}, {
					default: withCtx(() => [createVNode(TimeAgo_default, { date: item.updatedAt }, null, 8, ["date"])]),
					_: 2
				}, 1024)]),
				[`item.actions`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(unref($style).actions),
					onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, [createVNode(unref(N8nActionToggle_default), {
					actions: actionsFor(item),
					"data-test-id": "preference-actions",
					onAction: (action) => onAction(item, action)
				}, null, 8, ["actions", "onAction"])], 2)]),
				_: 2
			}, [props.showEmpty ? {
				name: "cover",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "empty")]),
				key: "0"
			} : void 0]), 1032, [
				"page",
				"items-per-page",
				"sort-by",
				"selection",
				"headers",
				"items",
				"items-length",
				"loading",
				"page-sizes"
			])]);
		};
	}
}), [["__cssModules", { "$style": {
	creator: "_creator_13085_1",
	actions: "_actions_13085_9",
	row: "_row_13085_14"
} }]]);
//#endregion
//#region src/features/settings/context/views/SettingsPreferencesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SettingsPreferencesView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsPreferencesView",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		const documentTitle = useDocumentTitle();
		const message = useMessage();
		const telemetry = useTelemetry();
		const contextStore = useContextStore();
		const settingsStore = useSettingsStore();
		const preferencesEmptyStateExperiment = usePreferencesEmptyStateExperiment();
		const emptyStateVariant = preferencesEmptyStateExperiment.variant;
		const { showError, showMessage } = useToast();
		const tableOptions = ref({
			page: 0,
			itemsPerPage: PREFERENCES_DEFAULT_PAGE_SIZE,
			sortBy: CONTEXT_DEFAULT_SORT_BY
		});
		const selection = ref([]);
		const search = ref("");
		const appliedSearch = ref("");
		const loadFailed = ref(false);
		let latestLoad = 0;
		const canManagePreferences = canManageContextPreferences();
		const preferencesEnabled = computed(() => isContextPreferencesEnabled());
		const preferencesSwitchOn = computed(() => settingsStore.settings.aiPreferences?.enabled === true);
		const preferencesManagedByEnv = computed(() => settingsStore.settings.aiPreferences?.managedByEnv === true);
		const isSavingSwitch = ref(false);
		const dialogTarget = ref(null);
		const openedExample = ref();
		const isFiltered = computed(() => search.value.trim() !== "" || appliedSearch.value !== "");
		const showEmptyState = computed(() => !contextStore.loading && !loadFailed.value && !isFiltered.value && contextStore.count === 0);
		const showAssistantEmptyState = computed(() => showEmptyState.value && emptyStateVariant.value === PREFERENCES_EMPTY_STATE_EXPERIMENT.assistant);
		const showExamplesEmptyState = computed(() => showEmptyState.value && emptyStateVariant.value === PREFERENCES_EMPTY_STATE_EXPERIMENT.examples);
		const selectedCount = computed(() => selection.value.length);
		/** Resolves to `true` only when this load succeeded and no newer load replaced it. */
		async function load() {
			const run = ++latestLoad;
			const { page = 0, itemsPerPage = PREFERENCES_DEFAULT_PAGE_SIZE } = tableOptions.value;
			const sortBy = toPreferenceSortOption(tableOptions.value.sortBy);
			const term = search.value.trim();
			const filter = term ? { search: term } : {};
			try {
				await contextStore.fetchPreferences({
					skip: page * itemsPerPage,
					take: itemsPerPage,
					sortBy,
					...filter
				});
				if (run !== latestLoad) return false;
				loadFailed.value = false;
				appliedSearch.value = term;
				const lastPage = Math.max(0, Math.ceil(contextStore.count / itemsPerPage) - 1);
				if (page > lastPage) {
					tableOptions.value = {
						...tableOptions.value,
						page: lastPage
					};
					await contextStore.fetchPreferences({
						skip: lastPage * itemsPerPage,
						take: itemsPerPage,
						sortBy,
						...filter
					});
				}
				return run === latestLoad;
			} catch (error) {
				if (run !== latestLoad) return false;
				loadFailed.value = true;
				showError(error, i18n.baseText("settings.context.preferences.error.load"));
				return false;
			}
		}
		/**
		* A new search starts at the first page with an empty selection, so a bulk delete never
		* reaches rows that the search hides.
		*/
		async function onSearch() {
			selection.value = [];
			tableOptions.value = {
				...tableOptions.value,
				page: 0
			};
			await load();
		}
		const onSearchDebounced = useDebounceFn(onSearch, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		async function onOptionsUpdate(options) {
			tableOptions.value = {
				...options,
				sortBy: keepSortOnClear(tableOptions.value.sortBy, options.sortBy)
			};
			await load();
		}
		function openCreateModal() {
			openedExample.value = void 0;
			dialogTarget.value = "new";
		}
		function openExampleModal(example) {
			openedExample.value = example;
			dialogTarget.value = "new";
		}
		function openEditModal(preference) {
			dialogTarget.value = preference;
		}
		async function onSaved() {
			dialogTarget.value = null;
			await load();
		}
		async function confirmDelete(count) {
			return await message.confirm(i18n.baseText("settings.context.preferences.delete.confirm.message", {
				interpolate: { count },
				adjustToNumber: count
			}), i18n.baseText("settings.context.preferences.delete.confirm.title", {
				interpolate: { count },
				adjustToNumber: count
			}), {
				type: "warning",
				confirmButtonText: i18n.baseText("settings.context.preferences.delete.confirm.button"),
				cancelButtonText: i18n.baseText("settings.context.preferences.modal.cancel")
			}) === MODAL_CONFIRM;
		}
		function trackDelete(source, scopeTypes) {
			const present = scopeTypes.filter((scope) => scope !== void 0);
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
				count: scopeTypes.length,
				source,
				scope_types: [...new Set(present)]
			});
		}
		async function onDelete(preference) {
			if (!await confirmDelete(1)) return;
			try {
				await contextStore.deletePreference(preference.id);
				trackDelete("row", [preferenceScope(preference)]);
				selection.value = selection.value.filter((id) => id !== preference.id);
				await load();
				showMessage({
					title: i18n.baseText("settings.context.preferences.delete.success"),
					type: "success"
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.context.preferences.error.delete"));
			}
		}
		async function onDeleteSelected() {
			const ids = [...selection.value];
			if (ids.length === 0 || !await confirmDelete(ids.length)) return;
			const scopeById = new Map(contextStore.preferences.map((row) => [row.id, preferenceScope(row)]));
			const { deleted, failed } = await contextStore.deletePreferences(ids);
			const gone = new Set(deleted);
			selection.value = selection.value.filter((id) => !gone.has(id));
			if (deleted.length > 0) await load();
			if (deleted.length > 0) trackDelete("bulk", deleted.map((id) => scopeById.get(id)));
			if (failed.length > 0) {
				showError(failed[0].error, i18n.baseText("settings.context.preferences.error.delete"));
				return;
			}
			showMessage({
				title: i18n.baseText("settings.context.preferences.delete.success"),
				type: "success"
			});
		}
		async function onPreferencesEnabledChange(enabled) {
			isSavingSwitch.value = true;
			try {
				await contextStore.setPreferencesEnabled(enabled);
				if (preferencesEnabled.value) await loadVisit();
			} catch (error) {
				showError(error, i18n.baseText("settings.context.preferences.enable.error"));
			} finally {
				isSavingSwitch.value = false;
			}
		}
		async function goBack() {
			await router.push({ name: VIEWS.SETTINGS_CONTEXT });
		}
		async function loadVisit() {
			if (!await load()) return;
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_PREFERENCES, {
				count: contextStore.count,
				scope_types: [...new Set(contextStore.preferences.map((row) => preferenceScope(row)))]
			});
			if (contextStore.count === 0) preferencesEmptyStateExperiment.trackExposure();
		}
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.context.preferences.title"));
			if (preferencesEnabled.value) await loadVisit();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				class: normalizeClass(_ctx.$style.layout),
				"full-width": "",
				"show-back": "",
				"back-label": unref(i18n).baseText("settings.context.preferences.back"),
				"data-test-id": "settings-preferences-view",
				onBack: goBack
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.context.preferences.title"),
						description: unref(i18n).baseText("settings.context.preferences.description"),
						"show-docs-link": false
					}, {
						titleTrailing: withCtx(() => [unref(settingsStore).isEnterprisePlan ? (openBlock(), createBlock(unref(EnterpriseReadinessBadge_default), {
							key: 0,
							size: "xsmall",
							"data-test-id": "preferences-enterprise-readiness-badge"
						})) : createCommentVNode("", true), unref(canManagePreferences) ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass(_ctx.$style.switch)
						}, [createVNode(unref(N8nTooltip_default), {
							disabled: !preferencesManagedByEnv.value,
							content: unref(i18n).baseText("settings.context.preferences.enable.managedByEnv")
						}, {
							default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
								size: "small",
								"model-value": preferencesSwitchOn.value,
								disabled: isSavingSwitch.value || preferencesManagedByEnv.value,
								"aria-label": unref(i18n).baseText("settings.context.preferences.title"),
								"data-test-id": "preferences-enable-toggle",
								"onUpdate:modelValue": onPreferencesEnabledChange
							}, null, 8, [
								"model-value",
								"disabled",
								"aria-label"
							])]),
							_: 1
						}, 8, ["disabled", "content"])], 2)) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["title", "description"]),
					!preferencesEnabled.value && preferencesSwitchOn.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-light",
						"data-test-id": "preferences-needs-consumer"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.preferences.enable.needsConsumer")), 1)]),
						_: 1
					})) : !preferencesEnabled.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 1,
						icon: {
							type: "icon",
							value: "brain"
						},
						heading: unref(i18n).baseText("settings.context.preferences.off.title"),
						description: unref(i18n).baseText("settings.context.preferences.off.description"),
						"data-test-id": "preferences-off-state"
					}, null, 8, ["heading", "description"])) : showAssistantEmptyState.value ? (openBlock(), createBlock(PreferencesEmptyStateAssistant_default, {
						key: 2,
						onWriteOwn: openCreateModal
					})) : showExamplesEmptyState.value ? (openBlock(), createBlock(PreferencesEmptyStateExamples_default, {
						key: 3,
						onUseExample: openExampleModal,
						onWriteOwn: openCreateModal
					})) : (openBlock(), createElementBlock(Fragment, { key: 4 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolbar) }, [
						createVNode(unref(Input_default), {
							modelValue: search.value,
							"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => search.value = $event), unref(onSearchDebounced)],
							class: normalizeClass(_ctx.$style.search),
							placeholder: unref(i18n).baseText("settings.context.preferences.search.placeholder"),
							clearable: "",
							"data-test-id": "preferences-search"
						}, {
							prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
							_: 1
						}, 8, [
							"modelValue",
							"class",
							"placeholder",
							"onUpdate:modelValue"
						]),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.spacer) }, null, 2),
						selectedCount.value > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							color: "text-light",
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.preferences.selected", {
								interpolate: { count: selectedCount.value },
								adjustToNumber: selectedCount.value
							})), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						selectedCount.value > 0 ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							variant: "outline",
							label: unref(i18n).baseText("settings.context.preferences.actions.deleteSelected"),
							"data-test-id": "preferences-delete-selected-button",
							onClick: onDeleteSelected
						}, null, 8, ["label"])) : createCommentVNode("", true),
						createVNode(unref(N8nButton_default), {
							label: unref(i18n).baseText("settings.context.preferences.actions.create"),
							"data-test-id": "preferences-create-button",
							onClick: openCreateModal
						}, null, 8, ["label"])
					], 2), createVNode(PreferencesTable_default, {
						"table-options": tableOptions.value,
						"onUpdate:tableOptions": _cache[1] || (_cache[1] = ($event) => tableOptions.value = $event),
						selection: selection.value,
						"onUpdate:selection": _cache[2] || (_cache[2] = ($event) => selection.value = $event),
						preferences: unref(contextStore).preferences,
						"items-length": unref(contextStore).count,
						loading: unref(contextStore).loading,
						"show-empty": showEmptyState.value,
						onEdit: openEditModal,
						onDelete,
						"onUpdate:options": onOptionsUpdate
					}, {
						empty: withCtx(() => [createBaseVNode("div", {
							class: normalizeClass(_ctx.$style.empty),
							"data-test-id": "preferences-empty-state"
						}, [
							createVNode(unref(N8nHeading_default), {
								tag: "h2",
								size: "medium",
								bold: ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.preferences.empty.title")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nText_default), { color: "text-light" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.preferences.empty.description")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nButton_default), {
								label: unref(i18n).baseText("settings.context.preferences.actions.create"),
								"data-test-id": "preferences-empty-create-button",
								onClick: openCreateModal
							}, null, 8, ["label"])
						], 2)]),
						_: 1
					}, 8, [
						"table-options",
						"selection",
						"preferences",
						"items-length",
						"loading",
						"show-empty"
					])], 64)),
					createVNode(PreferenceModal_default, {
						open: dialogTarget.value !== null,
						preference: dialogTarget.value === "new" ? null : dialogTarget.value,
						example: dialogTarget.value === "new" ? openedExample.value : void 0,
						"onUpdate:open": _cache[3] || (_cache[3] = (open) => dialogTarget.value = open ? dialogTarget.value : null),
						onSaved
					}, null, 8, [
						"open",
						"preference",
						"example"
					])
				]),
				_: 1
			}, 8, ["class", "back-label"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_fixjf_3",
	"switch": "_switch_fixjf_15",
	toolbar: "_toolbar_fixjf_20",
	spacer: "_spacer_fixjf_27",
	search: "_search_fixjf_31",
	empty: "_empty_fixjf_35"
} }]]);
//#endregion
export { SettingsPreferencesView_default as default };
