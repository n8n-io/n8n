import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, KA as Dialog_default, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _C as useUsersStore, _N as N8nText_default, bm as useSourceControlStore, cm as useEnvironmentsStore, dC as useToast, gM as N8nInputLabel_default, jN as useI18n, mM as N8nOption_default, nD as getResourcePermissions, pM as N8nSelect_default, uM as N8nFormInput_default, vm as useProjectsStore, xN as N8nIcon_default, yN as N8nButton_default, y_ as VARIABLE_MODAL_KEY } from "./app-D5flEmb-.js";
//#region src/features/settings/environments.ee/components/VariableModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 4 };
var VALUE_MAX_LENGTH = 1e3;
var VariableModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "VariableModal",
	props: {
		notice: {},
		mode: { default: "new" },
		variable: { default: void 0 },
		projectId: { default: void 0 },
		initialValues: {},
		fixedKey: { type: Boolean },
		destination: {},
		onCreate: {},
		allowOnProtectedInstance: { type: Boolean },
		appendToBody: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const { showError } = useToast();
		const uiStore = useUIStore();
		const environmentsStore = useEnvironmentsStore();
		const projectsStore = useProjectsStore();
		const usersStore = useUsersStore();
		const sourceControlStore = useSourceControlStore();
		const modalOpen = computed(() => uiStore.modalsById[VARIABLE_MODAL_KEY]?.open === true);
		const loading = ref(false);
		const keyInputRef = ref(null);
		const keyValidationRules = [
			{ name: "REQUIRED" },
			{
				name: "MAX_LENGTH",
				config: { maximum: 50 }
			},
			{
				name: "MATCH_REGEX",
				config: {
					regex: /^[A-Za-z0-9_]+$/,
					message: i18n.baseText("variables.editing.key.error.regex")
				}
			}
		];
		const valueValidationRules = [{
			name: "MAX_LENGTH",
			config: { maximum: VALUE_MAX_LENGTH }
		}];
		function getInitialProjectId() {
			if (props.destination?.kind === "resolved") return props.destination.project.id;
			if (props.destination?.kind === "pending") return props.destination.id;
			if (props.variable) return props.variable.project?.id;
			if (props.projectId !== void 0) return props.projectId;
			return projectsStore.currentProjectId;
		}
		const form = reactive({
			key: props.variable?.key ?? props.initialValues?.key ?? "",
			value: props.variable?.value ?? props.initialValues?.value ?? "",
			projectId: getInitialProjectId()
		});
		const formValidation = reactive({
			key: false,
			value: false
		});
		const keyExistsInSameScope = computed(() => !!form.key && environmentsStore.getVariablesInScope(form.projectId).some((variable) => variable.key === form.key && (props.mode !== "edit" || variable.id !== props.variable?.id)));
		const globalVariableExistsWarning = computed(() => !!form.projectId && !keyExistsInSameScope.value && environmentsStore.getVariablesInScope(null).some((variable) => variable.key === form.key));
		const isValid = computed(() => Object.values(formValidation).every((value) => value) && !keyExistsInSameScope.value);
		const modalTitle = computed(() => props.mode === "new" ? i18n.baseText("variables.modal.title.create") : i18n.baseText("variables.modal.title.edit"));
		const projectOptions = computed(() => {
			const readOnly = sourceControlStore.preferences.branchReadOnly;
			const options = [{
				value: "",
				label: i18n.baseText("variables.modal.scope.global"),
				icon: {
					type: "icon",
					value: "database"
				},
				disabled: readOnly || !getResourcePermissions(usersStore.currentUser?.globalScopes).variable?.create
			}];
			if (projectsStore.personalProject) options.push({
				value: projectsStore.personalProject.id,
				label: i18n.baseText("projects.menu.personal"),
				icon: {
					type: "icon",
					value: "user"
				},
				disabled: readOnly || !getResourcePermissions(projectsStore.personalProject.scopes).projectVariable?.create
			});
			options.push(...projectsStore.myProjects.filter((project) => project.type === "team").map((project) => {
				const icon = project.icon || {
					type: "icon",
					value: "layer-group"
				};
				return {
					value: project.id,
					label: project.name ?? project.id,
					icon,
					disabled: readOnly || !getResourcePermissions(project.scopes).projectVariable?.create
				};
			}));
			return options;
		});
		const selectedProjectIcon = computed(() => {
			return projectOptions.value.find((option) => option.value === form.projectId)?.icon ?? {
				type: "icon",
				value: "database"
			};
		});
		const showScopeField = computed(() => {
			return !props.destination && props.mode === "new" && props.projectId === void 0 && !projectsStore.currentProjectId;
		});
		const destinationName = computed(() => props.destination?.kind === "resolved" ? props.destination.project.name : props.destination?.name);
		const isProtectedInstance = computed(() => sourceControlStore.preferences.branchReadOnly);
		const isKeyLocked = computed(() => props.mode === "edit" && isProtectedInstance.value);
		const canCreate = computed(() => {
			if (props.mode === "new" && isProtectedInstance.value && !props.allowOnProtectedInstance) return false;
			if (!props.onCreate) return true;
			const destination = props.destination;
			if (!destination) return !!getResourcePermissions(usersStore.currentUser?.globalScopes).variable.create;
			const project = destination.kind === "resolved" ? destination.project : projectsStore.myProjects.find((item) => item.id === destination.id);
			if (project) return !!getResourcePermissions(project.scopes).projectVariable.create;
			return destination.kind === "pending" && destination.permissions.create;
		});
		async function closeDialog() {
			if (loading.value) return;
			uiStore.closeModal(VARIABLE_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		async function handleSubmit() {
			if (loading.value || !isValid.value || !canCreate.value) return;
			try {
				loading.value = true;
				const variablePayload = {
					key: form.key,
					value: form.value
				};
				if (typeof form.projectId !== "undefined") variablePayload.projectId = form.projectId;
				if (props.mode === "new") await (props.onCreate ?? environmentsStore.createVariable)(variablePayload);
				else if (props.variable) await environmentsStore.updateVariable({
					id: props.variable.id,
					...variablePayload
				});
				uiStore.closeModal(VARIABLE_MODAL_KEY);
			} catch (error) {
				showError(error, i18n.baseText("variables.errors.save"));
			} finally {
				loading.value = false;
			}
		}
		onMounted(async () => {
			projectsStore.getMyProjects();
			await nextTick();
			const input = keyInputRef.value?.inputRef;
			if (input) requestAnimationFrame(() => {
				input.focus();
			});
			if (props.mode === "new") keyValidationRules.push({
				name: "MATCH_REGEX",
				config: {
					regex: /^[A-Za-z_]/,
					message: i18n.baseText("variables.editing.key.error.regex-no-start-with-number")
				}
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "xlarge",
				header: modalTitle.value,
				"show-close-button": !loading.value,
				stacked: __props.appendToBody === true,
				"data-test-id": `${unref(VARIABLE_MODAL_KEY)}-modal`,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.form),
						onKeyup: withKeys(handleSubmit, ["enter"])
					}, [
						__props.notice ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "info"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.notice()), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						destinationName.value ? (openBlock(), createBlock(unref(N8nText_default), { key: 1 }, {
							default: withCtx(() => [createTextVNode(toDisplayString(destinationName.value), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						createVNode(unref(N8nFormInput_default), {
							ref_key: "keyInputRef",
							ref: keyInputRef,
							modelValue: form.key,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.key = $event),
							disabled: __props.fixedKey || isKeyLocked.value || loading.value,
							label: unref(i18n).baseText("variables.modal.key.label"),
							name: "key",
							"focus-initially": "",
							"data-test-id": "variable-modal-key-input",
							placeholder: unref(i18n).baseText("variables.editing.key.placeholder"),
							required: "",
							"validate-on-blur": true,
							"validation-rules": keyValidationRules,
							onValidate: _cache[1] || (_cache[1] = (value) => formValidation.key = value)
						}, null, 8, [
							"modelValue",
							"disabled",
							"label",
							"placeholder"
						]),
						keyExistsInSameScope.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 2,
							theme: "danger",
							"data-test-id": "variable-modal-key-exists-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.modal.error.keyExistsInProject")), 1)]),
							_: 1
						})) : globalVariableExistsWarning.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 3,
							theme: "warning",
							"data-test-id": "variable-modal-global-exists-warning"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.modal.warning.globalKeyExists")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						createVNode(unref(N8nFormInput_default), {
							modelValue: form.value,
							"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.value = $event),
							disabled: loading.value,
							name: "value",
							label: unref(i18n).baseText("variables.modal.value.label"),
							"data-test-id": "variable-modal-value-input",
							placeholder: unref(i18n).baseText("variables.editing.value.placeholder"),
							type: "textarea",
							autosize: {
								minRows: 3,
								maxRows: 6
							},
							maxlength: VALUE_MAX_LENGTH,
							"validate-on-blur": true,
							"validation-rules": valueValidationRules,
							onValidate: _cache[3] || (_cache[3] = (value) => formValidation.value = value)
						}, null, 8, [
							"modelValue",
							"disabled",
							"label",
							"placeholder"
						]),
						showScopeField.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("variables.modal.scope.label"),
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: form.projectId,
								"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.projectId = $event),
								size: "large",
								filterable: "",
								teleported: false,
								"data-test-id": "variable-modal-scope-select"
							}, {
								prefix: withCtx(() => [selectedProjectIcon.value?.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									class: normalizeClass(_ctx.$style.menuItemEmoji)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(selectedProjectIcon.value.value), 1)]),
									_: 1
								}, 8, ["class"])) : selectedProjectIcon.value?.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
									key: 1,
									icon: selectedProjectIcon.value.value
								}, null, 8, ["icon"])) : createCommentVNode("", true)]),
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(projectOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value || "global",
										value: option.value,
										label: option.label,
										disabled: option.disabled,
										class: normalizeClass({ [_ctx.$style.globalOption]: option.value === "" })
									}, {
										default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [option.icon?.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 0,
											class: normalizeClass(_ctx.$style.menuItemEmoji)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(option.icon.value), 1)]),
											_: 2
										}, 1032, ["class"])) : option.icon?.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
											key: 1,
											icon: option.icon.value
										}, null, 8, ["icon"])) : createCommentVNode("", true), createBaseVNode("span", null, toDisplayString(option.label), 1)], 2)]),
										_: 2
									}, 1032, [
										"value",
										"label",
										"disabled",
										"class"
									]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue"])]),
							_: 1
						}, 8, ["label"])])) : createCommentVNode("", true)
					], 34)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("variables.modal.button.cancel"),
						"data-test-id": "variable-modal-cancel-button",
						disabled: loading.value,
						onClick: closeDialog
					}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
						loading: loading.value,
						disabled: !isValid.value || !canCreate.value || loading.value,
						label: unref(i18n).baseText("variables.modal.button.save"),
						"data-test-id": "variable-modal-save-button",
						onClick: handleSubmit
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])], 2)]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"open",
				"header",
				"show-close-button",
				"stacked",
				"data-test-id"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_uy89n_1",
	footer: "_footer_uy89n_7",
	optionContent: "_optionContent_uy89n_15",
	iconEmoji: "_iconEmoji_uy89n_21",
	globalOption: "_globalOption_uy89n_26"
} }]]);
//#endregion
export { VariableModal_default as default };
