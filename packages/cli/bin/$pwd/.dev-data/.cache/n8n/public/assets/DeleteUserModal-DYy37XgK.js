import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, KA as Dialog_default, MA as RadioGroupItem_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _C as useUsersStore, _N as N8nText_default, _m as useRemoteProjectSearch, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, jA as RadioGroup_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
//#region src/features/settings/users/components/DeleteUserModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = {
	key: 0,
	class: "pt-2xs"
};
var _hoisted_3 = {
	key: 0,
	class: "pt-2xs",
	"data-test-id": "delete-data-input"
};
var DeleteUserModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "DeleteUserModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const loading = ref(false);
		const operation = ref("");
		const deleteConfirmText = ref("");
		const selectedProject = ref(null);
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const userToDelete = computed(() => {
			if (!props.data?.userId) return null;
			return usersStore.usersList.state.items.find((user) => user.id === props.data.userId);
		});
		const isPending = computed(() => !userToDelete.value?.firstName);
		const title = computed(() => {
			const user = userToDelete.value?.firstName && userToDelete.value.lastName ? `${userToDelete.value.firstName} ${userToDelete.value.lastName}` : userToDelete.value?.email ?? "";
			return i18n.baseText("settings.users.deleteUser", { interpolate: { user } });
		});
		const enabled = computed(() => {
			if (isPending.value) return true;
			if (operation.value === "delete" && deleteConfirmText.value === i18n.baseText("settings.users.deleteConfirmationText")) return true;
			return !!(operation.value === "transfer" && selectedProject.value);
		});
		const searchFn = useRemoteProjectSearch();
		const filterFn = (project) => project.name !== `${userToDelete.value?.firstName} ${userToDelete.value?.lastName} <${userToDelete.value?.email}>`;
		const { showMessage, showError } = useToast();
		async function onSubmit() {
			if (loading.value || !enabled.value) return;
			try {
				loading.value = true;
				const params = { id: props.data.userId };
				if (operation.value === "transfer" && selectedProject.value) params.transferId = selectedProject.value.id;
				await usersStore.deleteUser(params);
				let message = "";
				if (params.transferId && selectedProject.value) message = i18n.baseText("settings.users.transferredToUser", { interpolate: { projectName: selectedProject.value.name ?? "" } });
				showMessage({
					type: "success",
					title: i18n.baseText("settings.users.userDeleted"),
					message
				});
				await props.data.afterDelete?.();
				closeDialog();
			} catch (error) {
				showError(error, i18n.baseText("settings.users.userDeletedError"));
			} finally {
				loading.value = false;
			}
		}
		async function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				header: title.value,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("form", {
						id: "delete-user-form",
						"data-test-id": "delete-user-modal",
						onSubmit: withModifiers(onSubmit, ["prevent"])
					}, [isPending.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nText_default), { color: "text-base" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.confirmUserDeletion")), 1)]),
						_: 1
					})])) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.content)
					}, [createBaseVNode("div", null, [createVNode(unref(N8nText_default), { color: "text-base" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.confirmDataHandlingAfterDeletion")), 1)]),
						_: 1
					})]), createVNode(unref(RadioGroup_default), {
						modelValue: operation.value,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => operation.value = $event)
					}, {
						default: withCtx(() => [createVNode(unref(RadioGroupItem_default), { value: "transfer" }, {
							label: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.transferWorkflowsAndCredentials")), 1)]),
								_: 1
							})]),
							content: withCtx(() => [operation.value === "transfer" ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.transferWorkflowsAndCredentials.user")), 1)]),
								_: 1
							}), createVNode(ProjectSharing_default, {
								modelValue: selectedProject.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedProject.value = $event),
								class: "pt-2xs",
								"search-fn": unref(searchFn),
								"filter-fn": filterFn,
								placeholder: unref(i18n).baseText("settings.users.transferWorkflowsAndCredentials.placeholder")
							}, null, 8, [
								"modelValue",
								"search-fn",
								"placeholder"
							])])) : createCommentVNode("", true)]),
							_: 1
						}), createVNode(unref(RadioGroupItem_default), { value: "delete" }, {
							label: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.deleteWorkflowsAndCredentials")), 1)]),
								_: 1
							})]),
							content: withCtx(() => [operation.value === "delete" ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("settings.users.deleteConfirmationMessage") }, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									modelValue: deleteConfirmText.value,
									"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => deleteConfirmText.value = $event),
									placeholder: unref(i18n).baseText("settings.users.deleteConfirmationText")
								}, null, 8, ["modelValue", "placeholder"])]),
								_: 1
							}, 8, ["label"])])) : createCommentVNode("", true)]),
							_: 1
						})]),
						_: 1
					}, 8, ["modelValue"])], 2))], 32)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						type: "submit",
						form: "delete-user-form",
						variant: "destructive",
						loading: loading.value,
						disabled: !enabled.value,
						label: unref(i18n).baseText("settings.users.delete"),
						"data-test-id": "confirm-delete-user-button"
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_n5mc9_1",
	innerContent: "_innerContent_n5mc9_5"
} }]]);
//#endregion
export { DeleteUserModal_default as default };
