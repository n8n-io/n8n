import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $D as StrictTimeZoneSchema, Jg as useUIStore, OA as MarkdownEditor_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bC as useRootStore, cN as Input_default, eo as createAgentTask, fN as N8nTooltip_default, io as deleteAgentTask, jN as useI18n, mM as N8nOption_default, pD as AGENT_TASK_OBJECTIVE_MAX_LENGTH, pM as N8nSelect_default, uM as N8nFormInput_default, us as updateAgentTask, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
import { a as describeSchedule, c as getNextScheduleOccurrence, i as buildCron, l as parseCron, o as formatScheduleDateTime, r as DEFAULT_SCHEDULE_PARTS, s as formatTimeOfDay, t as AgentTestButton_default, u as weekdayLabel } from "./AgentTestButton-HEwBVmUv.js";
//#region src/features/agents/components/AgentTaskModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["aria-label"];
var AgentTaskModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTaskModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const task = computed(() => props.data.task ?? null);
		const isEditing = computed(() => Boolean(task.value));
		const scheduleTouched = ref(isEditing.value);
		const showRepublishHint = computed(() => isEditing.value && props.data.isPublished);
		const enabled = props.data.taskState?.enabled ?? true;
		const deleting = ref(false);
		const name = ref("");
		const objective = ref("");
		const frequency = ref(DEFAULT_SCHEDULE_PARTS.frequency);
		const minute = ref(DEFAULT_SCHEDULE_PARTS.minute);
		const hour = ref(DEFAULT_SCHEDULE_PARTS.hour);
		const dayOfWeek = ref(DEFAULT_SCHEDULE_PARTS.dayOfWeek);
		const dayOfMonth = ref(DEFAULT_SCHEDULE_PARTS.dayOfMonth);
		const customCron = ref("");
		const timezone = ref(browserTimezone());
		const timezoneOptions = ref([]);
		const followsInstanceTimezone = ref(false);
		const saving = ref(false);
		const errorMessage = ref("");
		const saveAttempted = ref(false);
		const objectiveTouched = ref(false);
		const cronValid = ref(true);
		/**
		* Zone a new task is authored in — the clock the user is actually reading. A host
		* that cannot determine its zone reports `Etc/Unknown`, which `Intl` itself then
		* refuses, so check against the same schema the API validates with and fall back
		* to the instance timezone rather than sending a value that cannot be saved.
		*/
		function browserTimezone() {
			const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			return StrictTimeZoneSchema.safeParse(browserZone).success ? browserZone : rootStore.timezone;
		}
		const cronExpression = computed(() => {
			const freq = frequency.value;
			if (freq === "custom") return customCron.value.trim();
			return buildCron({
				frequency: freq,
				minute: minute.value,
				hour: hour.value,
				dayOfWeek: dayOfWeek.value,
				dayOfMonth: dayOfMonth.value
			});
		});
		function applyTask() {
			const current = task.value;
			name.value = current?.name ?? i18n.baseText("agents.builder.tasks.defaultName");
			objective.value = current?.objective ?? "";
			followsInstanceTimezone.value = current !== null && !current.timezone;
			timezone.value = current ? current.timezone ?? rootStore.timezone : browserTimezone();
			const parts = current ? parseCron(current.cronExpression) : { ...DEFAULT_SCHEDULE_PARTS };
			if (parts) {
				frequency.value = parts.frequency;
				minute.value = parts.minute;
				hour.value = parts.hour;
				dayOfWeek.value = parts.dayOfWeek;
				dayOfMonth.value = parts.dayOfMonth;
				customCron.value = "";
			} else {
				frequency.value = "custom";
				customCron.value = current?.cronExpression ?? "";
			}
		}
		applyTask();
		const initialObjectiveInvalid = isEditing.value && !objective.value.trim();
		const initialCronInvalid = isEditing.value && !getNextScheduleOccurrence(cronExpression.value, timezone.value);
		const cronValidator = { validate: (value) => getNextScheduleOccurrence(typeof value === "string" ? value : "", timezone.value) ? false : { message: i18n.baseText("agents.builder.tasks.validation.cronInvalid") } };
		watch(frequency, (value) => {
			if (value !== "custom") cronValid.value = true;
		});
		const frequencyOptions = computed(() => [
			{
				value: "hourly",
				label: i18n.baseText("agents.builder.tasks.schedule.frequency.hourly")
			},
			{
				value: "daily",
				label: i18n.baseText("agents.builder.tasks.schedule.frequency.daily")
			},
			{
				value: "weekly",
				label: i18n.baseText("agents.builder.tasks.schedule.frequency.weekly")
			},
			{
				value: "monthly",
				label: i18n.baseText("agents.builder.tasks.schedule.frequency.monthly")
			},
			{
				value: "custom",
				label: i18n.baseText("agents.builder.tasks.schedule.frequency.custom")
			}
		]);
		function onFrequencyChange(value) {
			const match = frequencyOptions.value.find((option) => option.value === value);
			if (match) {
				frequency.value = match.value;
				scheduleTouched.value = true;
			}
		}
		const dayOfWeekOptions = computed(() => Array.from({ length: 7 }, (_, index) => ({
			value: index,
			label: weekdayLabel(index)
		})));
		const dayOfMonthOptions = computed(() => Array.from({ length: 31 }, (_, index) => ({
			value: index + 1,
			label: String(index + 1)
		})));
		const showTime = computed(() => [
			"daily",
			"weekly",
			"monthly"
		].includes(frequency.value));
		const selectedTime = computed({
			get: () => hour.value * 60 + minute.value,
			set: (value) => {
				hour.value = Math.floor(value / 60);
				minute.value = value % 60;
				scheduleTouched.value = true;
			}
		});
		const timeOptions = computed(() => {
			const steps = Array.from({ length: 48 }, (_, index) => index * 30);
			return (steps.includes(selectedTime.value) ? steps : [...steps, selectedTime.value].sort((a, b) => a - b)).map((totalMinutes) => ({
				value: totalMinutes,
				label: formatTimeOfDay(Math.floor(totalMinutes / 60), totalMinutes % 60)
			}));
		});
		function onMinuteInput(value) {
			const parsed = Number(value);
			minute.value = Number.isFinite(parsed) ? Math.min(59, Math.max(0, Math.trunc(parsed))) : 0;
			scheduleTouched.value = true;
		}
		function onDayOfWeekChange(value) {
			dayOfWeek.value = Number(value);
			scheduleTouched.value = true;
		}
		function onDayOfMonthChange(value) {
			dayOfMonth.value = Number(value);
			scheduleTouched.value = true;
		}
		/**
		* Same timezone list the workflow settings offer. Kept renderable while it
		* loads (and if it fails) by always including the selected zone, since a
		* filterable select shows the raw value for an option it doesn't know.
		*/
		const timezoneSelectOptions = computed(() => {
			const options = timezoneOptions.value;
			if (options.some((option) => option.value === timezone.value)) return options;
			return [{
				value: timezone.value,
				label: timezone.value
			}, ...options];
		});
		onMounted(async () => {
			try {
				const timezones = await settingsStore.getTimezones();
				timezoneOptions.value = Object.entries(timezones).map(([value, label]) => ({
					value,
					label: typeof label === "string" ? label : value
				}));
			} catch {}
		});
		const nextOccurrenceText = computed(() => {
			if (!scheduleTouched.value) return "";
			const next = getNextScheduleOccurrence(cronExpression.value, timezone.value);
			if (!next) return "";
			return formatScheduleDateTime(next, timezone.value);
		});
		const scheduleDescription = computed(() => {
			if (frequency.value !== "custom" || !nextOccurrenceText.value) return "";
			return describeSchedule(cronExpression.value) ?? "";
		});
		const executionSummary = computed(() => {
			if (!enabled && isEditing.value) return i18n.baseText("agents.builder.capabilities.deactivated");
			if (!nextOccurrenceText.value) return "";
			return i18n.baseText("agents.builder.tasks.schedule.nextOccurrence", { interpolate: { occurrence: nextOccurrenceText.value } });
		});
		const scheduleSummary = computed(() => {
			if (!scheduleDescription.value) return executionSummary.value;
			return i18n.baseText("agents.builder.tasks.schedule.summary", { interpolate: {
				description: scheduleDescription.value,
				execution: executionSummary.value
			} });
		});
		const objectiveError = computed(() => {
			if (!objective.value.trim()) return i18n.baseText("agents.builder.tasks.validation.objectiveRequired");
			if (objective.value.trim().length > 1e4) return i18n.baseText("agents.builder.tasks.validation.objectiveMaxLength", { interpolate: { max: String(AGENT_TASK_OBJECTIVE_MAX_LENGTH) } });
			return "";
		});
		const visibleObjectiveError = computed(() => saveAttempted.value || initialObjectiveInvalid || objectiveTouched.value ? objectiveError.value : "");
		const nameError = computed(() => {
			if (!name.value.trim()) return i18n.baseText("agents.builder.tasks.validation.nameRequired");
			if (name.value.trim().length > 128) return i18n.baseText("agents.builder.tasks.validation.nameMaxLength", { interpolate: { max: String(128) } });
			return "";
		});
		const visibleNameError = computed(() => saveAttempted.value ? nameError.value : "");
		const canSave = computed(() => !nameError.value && !objectiveError.value && cronValid.value && !saving.value);
		function onObjectiveInput(value) {
			objective.value = value;
			objectiveTouched.value = true;
		}
		function onCronInput(value) {
			customCron.value = typeof value === "string" ? value : "";
			scheduleTouched.value = true;
		}
		function onTimezoneChange(value) {
			timezone.value = String(value);
			followsInstanceTimezone.value = false;
			scheduleTouched.value = true;
		}
		function closeModal() {
			uiStore.closeModal(props.modalName);
		}
		function onPreview() {
			objectiveTouched.value = true;
			if (objectiveError.value || !props.data.onPreview || props.data.getPreviewDisabledReason?.()) return;
			closeModal();
			props.data.onPreview(objective.value.trim());
		}
		async function onDelete() {
			const current = task.value;
			if (!current || deleting.value) return;
			deleting.value = true;
			errorMessage.value = "";
			try {
				await deleteAgentTask(rootStore.restApiContext, props.data.projectId, props.data.agentId, current.id);
				props.data.onSaved();
				closeModal();
			} catch (error) {
				errorMessage.value = error instanceof Error && error.message ? error.message : i18n.baseText("agents.builder.tasks.removeError");
			} finally {
				deleting.value = false;
			}
		}
		async function onSave() {
			saveAttempted.value = true;
			if (!canSave.value) return;
			saving.value = true;
			errorMessage.value = "";
			const base = {
				name: name.value.trim(),
				objective: objective.value.trim(),
				cronExpression: cronExpression.value,
				timezone: followsInstanceTimezone.value ? null : timezone.value
			};
			try {
				if (task.value) await updateAgentTask(rootStore.restApiContext, props.data.projectId, props.data.agentId, task.value.id, base);
				else {
					/** Save the agent only on submit, so closing does not create an empty agent. */
					await props.data.ensureAgentPersisted?.();
					/** New tasks start running once the agent is published. */
					await createAgentTask(rootStore.restApiContext, props.data.projectId, props.data.agentId, {
						...base,
						enabled: true
					});
				}
				props.data.onSaved();
				closeModal();
			} catch (error) {
				errorMessage.value = error instanceof Error && error.message ? error.message : i18n.baseText("agents.builder.tasks.saveError");
			} finally {
				saving.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: modalOpen.value,
				title: name.value,
				"title-placeholder": unref(i18n).baseText("agents.builder.tasks.name.placeholder"),
				"title-max-length": unref(128),
				"title-error": visibleNameError.value,
				busy: saving.value || deleting.value,
				"editable-title": "",
				"data-testid": "agent-task-modal",
				"onUpdate:open": _cache[2] || (_cache[2] = ($event) => !$event && closeModal()),
				"onUpdate:title": _cache[3] || (_cache[3] = ($event) => name.value = $event)
			}, createSlots({
				footerBeforeCancel: withCtx(() => [createVNode(AgentTestButton_default, {
					"disabled-reason": props.data.getPreviewDisabledReason?.(),
					"is-runnable": props.data.isRunnable === true,
					"validation-issues": props.data.validationIssues ?? [],
					variant: "ghost",
					"test-id": "agent-task-preview",
					onOpenPreview: onPreview
				}, null, 8, [
					"disabled-reason",
					"is-runnable",
					"validation-issues"
				])]),
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "solid",
					disabled: saving.value,
					loading: saving.value,
					"data-testid": "agent-task-save",
					onClick: onSave
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
						createVNode(unref(N8nText_default), {
							size: "small",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.objective.label")) + " ", 1), createVNode(unref(N8nText_default), {
								color: "primary",
								bold: "",
								size: "small"
							}, {
								default: withCtx(() => [..._cache[4] || (_cache[4] = [createTextVNode("*", -1)])]),
								_: 1
							})]),
							_: 1
						}),
						createVNode(unref(MarkdownEditor_default), {
							class: normalizeClass(_ctx.$style.objectiveEditor),
							"model-value": objective.value,
							placeholder: unref(i18n).baseText("agents.builder.tasks.objective.placeholder"),
							"show-toolbar": "floating",
							"max-height": "100%",
							"data-testid": "agent-task-objective-input",
							"onUpdate:modelValue": onObjectiveInput
						}, null, 8, [
							"class",
							"model-value",
							"placeholder"
						]),
						visibleObjectiveError.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.error),
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(visibleObjectiveError.value), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
						createVNode(unref(N8nText_default), {
							size: "small",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.schedule.label")) + " ", 1), createVNode(unref(N8nText_default), {
								color: "primary",
								bold: "",
								size: "small"
							}, {
								default: withCtx(() => [..._cache[5] || (_cache[5] = [createTextVNode("*", -1)])]),
								_: 1
							})]),
							_: 1
						}),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.scheduleRow) }, [
							createVNode(unref(N8nSelect_default), {
								"model-value": frequency.value,
								class: normalizeClass(_ctx.$style.frequencySelect),
								"data-testid": "agent-task-frequency",
								"onUpdate:modelValue": onFrequencyChange
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(frequencyOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										value: option.value,
										label: option.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["model-value", "class"]),
							frequency.value === "weekly" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.schedule.on")), 1)]),
								_: 1
							}), createVNode(unref(N8nSelect_default), {
								"model-value": dayOfWeek.value,
								class: normalizeClass(_ctx.$style.daySelect),
								"data-testid": "agent-task-day-of-week",
								"onUpdate:modelValue": onDayOfWeekChange
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(dayOfWeekOptions.value, (day) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: day.value,
										value: day.value,
										label: day.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["model-value", "class"])], 64)) : createCommentVNode("", true),
							frequency.value === "monthly" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.schedule.onDay")), 1)]),
								_: 1
							}), createVNode(unref(N8nSelect_default), {
								"model-value": dayOfMonth.value,
								class: normalizeClass(_ctx.$style.daySelect),
								"data-testid": "agent-task-day-of-month",
								"onUpdate:modelValue": onDayOfMonthChange
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(dayOfMonthOptions.value, (day) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: day.value,
										value: day.value,
										label: day.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["model-value", "class"])], 64)) : createCommentVNode("", true),
							showTime.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.schedule.at")), 1)]),
								_: 1
							}), createVNode(unref(N8nSelect_default), {
								"model-value": selectedTime.value,
								class: normalizeClass(_ctx.$style.timeSelect),
								"data-testid": "agent-task-time",
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedTime.value = Number($event))
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(timeOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										value: option.value,
										label: option.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["model-value", "class"])], 64)) : createCommentVNode("", true),
							frequency.value === "hourly" ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.schedule.minuteLabel")), 1)]),
								_: 1
							}), createVNode(unref(Input_default), {
								type: "number",
								"model-value": String(minute.value),
								class: normalizeClass(_ctx.$style.minuteInput),
								"data-testid": "agent-task-minute",
								"onUpdate:modelValue": onMinuteInput
							}, null, 8, ["model-value", "class"])], 64)) : createCommentVNode("", true),
							frequency.value === "custom" ? (openBlock(), createBlock(unref(N8nFormInput_default), {
								key: 4,
								"model-value": customCron.value,
								label: "",
								name: "task-cron",
								required: "",
								placeholder: unref(i18n).baseText("agents.builder.tasks.schedule.cron.placeholder"),
								validators: { VALID_CRON: cronValidator },
								"validation-rules": [{ name: "VALID_CRON" }],
								"show-validation-warnings": saveAttempted.value || unref(initialCronInvalid),
								class: normalizeClass(_ctx.$style.cronInput),
								"data-testid": "agent-task-schedule-cron",
								"onUpdate:modelValue": onCronInput,
								onValidate: _cache[1] || (_cache[1] = ($event) => cronValid.value = $event)
							}, null, 8, [
								"model-value",
								"placeholder",
								"validators",
								"show-validation-warnings",
								"class"
							])) : createCommentVNode("", true),
							createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.schedule.in")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nSelect_default), {
								"model-value": timezone.value,
								class: normalizeClass(_ctx.$style.timezoneSelect),
								placeholder: unref(i18n).baseText("agents.builder.tasks.schedule.timezone.placeholder"),
								filterable: "",
								"limit-popper-width": true,
								"data-testid": "agent-task-timezone",
								"onUpdate:modelValue": onTimezoneChange
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(timezoneSelectOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										value: option.value,
										label: option.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, [
								"model-value",
								"class",
								"placeholder"
							])
						], 2),
						scheduleSummary.value ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.scheduleSummary)
						}, [createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.help),
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(scheduleSummary.value), 1)]),
							_: 1
						}, 8, ["class"]), showRepublishHint.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							content: unref(i18n).baseText("agents.builder.tasks.republishHint"),
							placement: "top"
						}, {
							default: withCtx(() => [createBaseVNode("span", {
								class: normalizeClass(_ctx.$style.infoIcon),
								"aria-label": unref(i18n).baseText("agents.builder.tasks.republishHint"),
								tabindex: "0"
							}, [createVNode(unref(N8nIcon_default), {
								icon: "info",
								size: "small"
							})], 10, _hoisted_1)]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
					], 2),
					errorMessage.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.error),
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(errorMessage.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				], 2)]),
				_: 2
			}, [isEditing.value ? {
				name: "footerLeft",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					loading: deleting.value,
					"data-testid": "agent-task-delete",
					onClick: onDelete
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "trash-2",
						size: 16
					})]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.tasks.delete")), 1)]),
					_: 1
				}, 8, ["loading"])]),
				key: "0"
			} : void 0]), 1032, [
				"open",
				"title",
				"title-placeholder",
				"title-max-length",
				"title-error",
				"busy"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_5s8up_2",
	field: "_field_5s8up_8",
	objectiveEditor: "_objectiveEditor_5s8up_14",
	scheduleRow: "_scheduleRow_5s8up_18",
	frequencySelect: "_frequencySelect_5s8up_25",
	daySelect: "_daySelect_5s8up_29",
	minuteInput: "_minuteInput_5s8up_33",
	cronInput: "_cronInput_5s8up_37",
	timeSelect: "_timeSelect_5s8up_42",
	timezoneSelect: "_timezoneSelect_5s8up_46",
	scheduleSummary: "_scheduleSummary_5s8up_50",
	infoIcon: "_infoIcon_5s8up_56",
	help: "_help_5s8up_62",
	error: "_error_5s8up_66"
} }]]);
//#endregion
export { AgentTaskModal_default as default };
