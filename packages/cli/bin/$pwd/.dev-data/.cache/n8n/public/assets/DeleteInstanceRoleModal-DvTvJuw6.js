import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, nf as mergeModels, su as ElDialog, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Cm as useRBACStore, PA as useMessage, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Zf as useRolesStore, _C as useUsersStore, _N as N8nText_default, dC as useToast, hC as useTelemetry, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, qy as APP_MODALS_ELEMENT_ID, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/roles/composables/useRoleDeleteGuard.ts
/**
* Central place for the rules that make a custom role non-deletable, mirroring the
* backend guards so the UI can disable the action and explain why up front.
* Only instance (global) roles are gated; project roles are unaffected.
*/
function useRoleDeleteGuard() {
	const rbacStore = useRBACStore();
	const usersStore = useUsersStore();
	const i18n = useI18n();
	/** Returns a message explaining why the role can't be deleted, or undefined when it can. */
	function deleteBlockedReason(role, roleType) {
		if (roleType !== "global") return void 0;
		if (role.slug === usersStore.currentUser?.role) return i18n.baseText("roles.action.delete.ownRole");
		if ((role.usedByUsers ?? 0) > 0 && !rbacStore.hasScope("user:changeRole")) return i18n.baseText("roles.action.delete.hasAssignedUsers");
	}
	return { deleteBlockedReason };
}
//#endregion
//#region src/features/roles/composables/useRoleDeletion.ts
init_reactivity_esm_bundler();
/**
* Encapsulates the full role-deletion UX so every entry point (roles list, role detail)
* behaves identically: guard → for instance roles with assigned users open the
* reassign-then-delete modal, otherwise confirm and delete.
*/
function useRoleDeletion() {
	const rolesStore = useRolesStore();
	const { deleteBlockedReason } = useRoleDeleteGuard();
	const { showError, showMessage } = useToast();
	const message = useMessage();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const router = useRouter();
	/** When set, an instance role with assigned users is awaiting reassignment in the modal. */
	const reassignState = ref(null);
	/**
	* Fetch the current number of users assigned to a role. Returns `null` (and surfaces
	* an error toast) if the lookup fails, so callers can abort rather than act on a
	* stale, page-load snapshot.
	*/
	async function resolveAssignedUserCount(slug) {
		try {
			return (await rolesStore.fetchRoleBySlug({ slug })).usedByUsers ?? 0;
		} catch (error) {
			showError(error, i18n.baseText("roles.action.delete.error"));
			return null;
		}
	}
	async function performRoleDeletion(options) {
		const { role, roleType, reassignRoleSlug, redirectTo } = options;
		try {
			await rolesStore.deleteRole(role.slug, reassignRoleSlug);
			const index = rolesStore.roles[roleType].findIndex((r) => r.slug === role.slug);
			if (index !== -1) rolesStore.roles[roleType].splice(index, 1);
			if (reassignRoleSlug) rolesStore.fetchRoles();
			showMessage({
				title: i18n.baseText("roles.action.delete.success"),
				type: "success"
			});
			telemetry.track("User successfully deleted role", {
				role_id: role.slug,
				role_name: role.displayName,
				role_type: roleType === "global" ? "instance" : "project",
				permissions: role.scopes
			});
			if (redirectTo) router.push(redirectTo);
		} catch (error) {
			showError(error, i18n.baseText("roles.action.delete.error"));
		}
	}
	/**
	* Entry point for deleting a role. Instance roles with assigned users open the
	* reassign modal (resolved later via {@link confirmReassignDelete}); everything else
	* goes through a confirmation dialog and is deleted immediately.
	*/
	async function requestDelete(role, options) {
		const { roleType, redirectTo, onBeforeDelete } = options;
		if (onBeforeDelete) {
			if (!await onBeforeDelete(role)) return;
		}
		if (roleType === "global") {
			const userCount = await resolveAssignedUserCount(role.slug);
			if (userCount === null) return;
			if (userCount > 0) {
				if (deleteBlockedReason({
					...role,
					usedByUsers: userCount
				}, roleType)) return;
				reassignState.value = {
					role,
					userCount,
					roleType,
					redirectTo
				};
				return;
			}
		}
		if (await message.confirm(i18n.baseText("roles.action.delete.text", { interpolate: { roleName: role.displayName } }), i18n.baseText("roles.action.delete.title", { interpolate: { roleName: role.displayName } }), {
			type: "warning",
			confirmButtonText: i18n.baseText("roles.action.delete"),
			cancelButtonText: i18n.baseText("roles.action.cancel")
		}) !== "confirm") return;
		await performRoleDeletion({
			role,
			roleType,
			redirectTo
		});
	}
	/** Complete a pending reassign-then-delete with the chosen replacement role. */
	function confirmReassignDelete(reassignRoleSlug) {
		const state = reassignState.value;
		if (!state) return;
		reassignState.value = null;
		performRoleDeletion({
			role: state.role,
			roleType: state.roleType,
			reassignRoleSlug,
			redirectTo: state.redirectTo
		});
	}
	function cancelReassign() {
		reassignState.value = null;
	}
	return {
		reassignState,
		requestDelete,
		confirmReassignDelete,
		cancelReassign
	};
}
//#endregion
//#region src/features/roles/instance/components/DeleteInstanceRoleModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DeleteInstanceRoleModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DeleteInstanceRoleModal",
	props: /*@__PURE__*/ mergeModels({
		role: {},
		userCount: {},
		availableRoles: {}
	}, {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["confirm"], ["update:modelValue"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const visible = useModel(__props, "modelValue");
		const i18n = useI18n();
		const selectedRoleSlug = ref(void 0);
		watch(visible, (isOpen) => {
			if (isOpen) selectedRoleSlug.value = void 0;
		});
		const selectedRole = computed(() => props.availableRoles.find((r) => r.slug === selectedRoleSlug.value));
		const userCountText = computed(() => i18n.baseText("roles.instance.action.delete.reassign.userCount", {
			adjustToNumber: props.userCount,
			interpolate: { count: props.userCount }
		}));
		const confirmLabel = computed(() => selectedRole.value ? i18n.baseText("roles.instance.action.delete.reassign.confirmWithRole", { interpolate: { roleName: selectedRole.value.displayName } }) : i18n.baseText("roles.instance.action.delete.reassign.confirm"));
		function onCancel() {
			visible.value = false;
		}
		function onConfirm() {
			if (!selectedRoleSlug.value) return;
			emit("confirm", selectedRoleSlug.value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElDialog), {
				modelValue: visible.value,
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => visible.value = $event),
				width: "540",
				"show-close": true,
				"append-to": `#${unref(APP_MODALS_ELEMENT_ID)}`,
				"data-test-id": "delete-instance-role-modal"
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "xlarge",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.action.delete.reassign.title", { interpolate: { roleName: __props.role?.displayName ?? "" } })), 1)]),
					_: 1
				})]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"data-test-id": "cancel-delete-role",
					onClick: onCancel
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.action.cancel")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "destructive",
					disabled: !selectedRoleSlug.value,
					"data-test-id": "confirm-delete-reassign-role",
					onClick: onConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(confirmLabel.value), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
					tag: "p",
					size: "medium",
					color: "text-base"
				}, {
					default: withCtx(() => [createBaseVNode("strong", null, toDisplayString(userCountText.value), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("roles.instance.action.delete.reassign.description")), 1)]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nText_default), {
					tag: "label",
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.action.delete.reassign.label")), 1)]),
					_: 1
				}), createVNode(unref(N8nSelect_default), {
					modelValue: selectedRoleSlug.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedRoleSlug.value = $event),
					placeholder: unref(i18n).baseText("roles.instance.action.delete.reassign.placeholder"),
					size: "large",
					"data-test-id": "reassign-role-select"
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.availableRoles, (option) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: option.slug,
							label: option.displayName,
							value: option.slug
						}, null, 8, ["label", "value"]);
					}), 128))]),
					_: 1
				}, 8, ["modelValue", "placeholder"])], 2)], 2)]),
				_: 1
			}, 8, ["modelValue", "append-to"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_2m4j5_1",
	field: "_field_2m4j5_7",
	footer: "_footer_2m4j5_13"
} }]]);
//#endregion
export { useRoleDeletion as n, useRoleDeleteGuard as r, DeleteInstanceRoleModal_default as t };
