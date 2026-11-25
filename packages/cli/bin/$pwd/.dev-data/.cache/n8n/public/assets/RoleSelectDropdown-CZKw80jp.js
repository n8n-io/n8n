import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, nf as mergeModels, rf as mergeProps, su as ElDialog, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { EM as Select_default, Py as CUSTOM_ROLES_DOCS_URL, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, _N as N8nText_default, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, nN as N8nBadge_default, qy as APP_MODALS_ELEMENT_ID, xN as N8nIcon_default, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { i as UI_VISIBLE_SCOPES, r as TOTAL_PROJECT_PERMISSIONS } from "./projectRoleScopes-Cnu0XOUp.js";
//#region src/features/roles/components/CustomRolesUpgradeModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CustomRolesUpgradeModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CustomRolesUpgradeModal",
	props: {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	},
	emits: ["update:modelValue"],
	setup(__props) {
		const visible = useModel(__props, "modelValue");
		const i18n = useI18n();
		const { goToUpgrade } = usePageRedirectionHelper();
		const onViewPlans = async () => {
			await goToUpgrade("custom-roles-selector", "upgrade-custom-roles");
			visible.value = false;
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElDialog), {
				modelValue: visible.value,
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => visible.value = $event),
				title: unref(i18n).baseText("projects.settings.role.upgrade.title"),
				width: "400",
				"append-to": `#${unref(APP_MODALS_ELEMENT_ID)}`
			}, {
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					onClick: _cache[0] || (_cache[0] = ($event) => visible.value = false)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "solid",
					onClick: onViewPlans
				}, {
					append: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.externalIcon) }, "↗", 2)]),
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.role.upgrade.custom.viewPlans")) + " ", 1)]),
					_: 1
				})], 2)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
					tag: "p",
					size: "medium"
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "projects.settings.role.upgrade.custom.body",
						tag: "span"
					}, {
						documentation: withCtx(() => [createVNode(unref(N8nLink_default), {
							href: unref(CUSTOM_ROLES_DOCS_URL),
							"new-window": true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.documentation")), 1)]),
							_: 1
						}, 8, ["href"])]),
						_: 1
					})]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, [
				"modelValue",
				"title",
				"append-to"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1csoe_1",
	footer: "_footer_1csoe_5",
	externalIcon: "_externalIcon_1csoe_11"
} }]]);
//#endregion
//#region src/features/roles/components/RoleHoverPopover.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var RoleHoverPopover_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "RoleHoverPopover",
	props: {
		role: {},
		permissionCount: { default: void 0 },
		totalPermissions: { default: void 0 },
		editRouteName: { default: VIEWS.PROJECT_ROLE_SETTINGS },
		viewRouteName: { default: VIEWS.PROJECT_ROLE_VIEW },
		fromView: { default: VIEWS.PROJECT_SETTINGS }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const settingsStore = useSettingsStore();
		const upgradeModalVisible = ref(false);
		const canManageRoles = computed(() => hasPermission(["rbac"], { rbac: { scope: "role:manage" } }));
		const canEditRole = computed(() => canManageRoles.value && !props.role.systemRole);
		const resolvedPermissionCount = computed(() => props.permissionCount ?? props.role.scopes?.filter((scope) => UI_VISIBLE_SCOPES.has(scope)).length ?? 0);
		const resolvedTotalPermissions = computed(() => props.totalPermissions ?? TOTAL_PROJECT_PERMISSIONS);
		const buttonText = computed(() => canEditRole.value ? i18n.baseText("projects.settings.role.popover.viewAndEdit") : i18n.baseText("projects.settings.role.popover.viewDetails"));
		const onButtonClick = () => {
			if (!settingsStore.isCustomRolesFeatureEnabled) {
				upgradeModalVisible.value = true;
				return;
			}
			router.push({
				name: canEditRole.value ? props.editRouteName : props.viewRouteName,
				params: { roleSlug: props.role.slug },
				query: { from: props.fromView }
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(N8nTooltip_default), {
				placement: "right",
				"show-after": 300,
				enterable: true,
				offset: 1,
				"content-class": "role-hover-popover"
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.popoverContent) }, [
					createVNode(unref(N8nText_default), {
						tag: "div",
						bold: true,
						size: "large",
						class: normalizeClass(_ctx.$style.roleName)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.role.displayName), 1)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(N8nText_default), {
						tag: "div",
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.permissionCount)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.role.selector.permissionCount", { interpolate: {
							count: String(resolvedPermissionCount.value),
							total: String(resolvedTotalPermissions.value)
						} })), 1)]),
						_: 1
					}, 8, ["class"]),
					__props.role.description ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						tag: "div",
						size: "small",
						class: normalizeClass(_ctx.$style.description)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.role.description), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						class: normalizeClass(_ctx.$style.actionButton),
						disabled: !canManageRoles.value,
						onClick: onButtonClick
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(buttonText.value) + " ", 1), createVNode(unref(N8nIcon_default), {
							icon: "arrow-up-right",
							size: "large",
							class: normalizeClass(_ctx.$style.externalIcon)
						}, null, 8, ["class"])]),
						_: 1
					}, 8, ["class", "disabled"])
				], 2)]),
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}), createVNode(CustomRolesUpgradeModal_default, {
				modelValue: upgradeModalVisible.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => upgradeModalVisible.value = $event)
			}, null, 8, ["modelValue"])], 64);
		};
	}
});
var RoleHoverPopover_default = /*#__PURE__*/ _plugin_vue_export_helper_default(RoleHoverPopover_vue_vue_type_script_setup_true_lang_default, [["__cssModules", { "$style": {
	popoverContent: "_popoverContent_b21ji_1",
	roleName: "_roleName_b21ji_6",
	permissionCount: "_permissionCount_b21ji_10",
	description: "_description_b21ji_14",
	actionButton: "_actionButton_b21ji_18",
	externalIcon: "_externalIcon_b21ji_24"
} }]]);
//#endregion
//#region src/features/roles/components/RoleContactAdminModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RoleContactAdminModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RoleContactAdminModal",
	props: /*@__PURE__*/ mergeModels({ customRolesExist: {
		type: Boolean,
		default: false
	} }, {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const props = __props;
		const visible = useModel(__props, "modelValue");
		const i18n = useI18n();
		const titleKey = computed(() => props.customRolesExist ? "projects.settings.role.contactAdmin.titleWithRoles" : "projects.settings.role.contactAdmin.title");
		const bodyKey = computed(() => props.customRolesExist ? "projects.settings.role.contactAdmin.bodyWithRoles" : "projects.settings.role.contactAdmin.body");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElDialog), {
				modelValue: visible.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
				width: "400",
				"show-close": true,
				"append-to": `#${unref(APP_MODALS_ELEMENT_ID)}`
			}, {
				header: withCtx(() => [createVNode(unref(N8nText_default), {
					tag: "span",
					size: "large",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(titleKey.value)), 1)]),
					_: 1
				})]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
					tag: "p",
					size: "medium"
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: bodyKey.value,
						tag: "span"
					}, {
						documentation: withCtx(() => [createVNode(unref(N8nLink_default), {
							href: unref(CUSTOM_ROLES_DOCS_URL),
							"new-window": true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.documentation")), 1)]),
							_: 1
						}, 8, ["href"])]),
						_: 1
					}, 8, ["keypath"])]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["modelValue", "append-to"]);
		};
	}
}), [["__cssModules", { "$style": { content: "_content_1jyh4_1" } }]]);
//#endregion
//#region src/features/roles/components/RoleSelectDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var RoleSelectDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RoleSelectDropdown",
	props: {
		systemRoles: {},
		customRoles: {},
		currentRole: {},
		hasCustomRolesLicense: { type: Boolean },
		canManageRoles: { type: Boolean },
		addCustomRoleRouteName: {},
		loading: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		testId: { default: "role-dropdown" },
		variant: { default: "flush" },
		placeholder: { default: void 0 },
		terminalOption: { default: void 0 },
		permissionCountFn: {
			type: Function,
			default: void 0
		},
		totalPermissions: { default: void 0 },
		editRouteName: { default: void 0 },
		viewRouteName: { default: void 0 },
		fromView: { default: void 0 }
	},
	emits: ["update:role", "system-role-upgrade-needed"],
	setup(__props, { emit: __emit }) {
		const isRoleSelectOption = (item) => "role" in item && item.role !== void 0;
		const toRoleSelectOption = (role) => ({
			value: role.slug,
			label: role.displayName,
			role,
			requiresUpgrade: !role.licensed
		});
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const telemetry = useTelemetry();
		const dropdownOpen = ref(false);
		const contactAdminModalVisible = ref(false);
		const upgradeModalVisible = ref(false);
		watch(dropdownOpen, (open) => {
			if (!open) setTimeout(() => {
				if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
			}, 0);
		});
		const closeDropdown = () => {
			dropdownOpen.value = false;
		};
		const selectedRole = computed(() => [...props.systemRoles, ...props.customRoles].find((role) => role.slug === props.currentRole));
		const selectedLabel = computed(() => {
			if (selectedRole.value) return selectedRole.value.displayName;
			if (props.terminalOption && props.currentRole === props.terminalOption.value) return props.terminalOption.label;
		});
		const roleItems = computed(() => {
			const items = [];
			if (props.systemRoles.length > 0) items.push({
				type: "group",
				label: i18n.baseText("projects.settings.role.selector.section.system"),
				items: props.systemRoles.map(toRoleSelectOption)
			});
			if (props.customRoles.length > 0 || !props.hasCustomRolesLicense) items.push({
				type: "group",
				label: i18n.baseText("projects.settings.role.selector.section.custom"),
				items: props.customRoles.map(toRoleSelectOption)
			});
			if (props.terminalOption) {
				if (items.length > 0) items.push({ type: "separator" });
				items.push({
					value: props.terminalOption.value,
					label: props.terminalOption.label
				});
			}
			return items;
		});
		const onRoleSelect = (value) => {
			if (!value || typeof value !== "string") return;
			const role = [...props.systemRoles, ...props.customRoles].find((r) => r.slug === value);
			if (role && !role.licensed) {
				closeDropdown();
				if (role.systemRole) emit("system-role-upgrade-needed");
				else upgradeModalVisible.value = true;
				return;
			}
			emit("update:role", value);
		};
		const onAddCustomRoleClick = () => {
			telemetry.track("User clicked add custom role from role selector");
			closeDropdown();
			if (!props.hasCustomRolesLicense) upgradeModalVisible.value = true;
			else if (!props.canManageRoles) contactAdminModalVisible.value = true;
			else router.push({ name: props.addCustomRoleRouteName });
		};
		const isUnavailableRoleItem = (item) => "requiresUpgrade" in item && item.requiresUpgrade === true;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createVNode(unref(Select_default), {
					open: dropdownOpen.value,
					"onUpdate:open": _cache[1] || (_cache[1] = ($event) => dropdownOpen.value = $event),
					items: roleItems.value,
					"model-value": __props.currentRole,
					size: "small",
					variant: __props.variant,
					placeholder: __props.placeholder,
					disabled: __props.loading || __props.disabled,
					"data-test-id": __props.testId,
					"onUpdate:modelValue": onRoleSelect
				}, {
					default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
						content: selectedLabel.value,
						disabled: !selectedLabel.value || dropdownOpen.value,
						placement: "top",
						"as-child": ""
					}, {
						default: withCtx(() => [createBaseVNode("span", null, [createTextVNode(toDisplayString(selectedLabel.value ?? __props.placeholder) + " ", 1), __props.loading ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "spinner",
							spin: "",
							size: "small"
						})) : createCommentVNode("", true)])]),
						_: 1
					}, 8, ["content", "disabled"])]),
					"item-label": withCtx(({ item }) => [isRoleSelectOption(item) ? (openBlock(), createBlock(RoleHoverPopover_default, {
						key: 0,
						role: item.role,
						"permission-count": __props.permissionCountFn ? __props.permissionCountFn(item.role) : void 0,
						"total-permissions": __props.totalPermissions,
						"edit-route-name": __props.editRouteName,
						"view-route-name": __props.viewRouteName,
						"from-view": __props.fromView
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							tag: "span",
							size: "medium",
							color: isUnavailableRoleItem(item) ? "text-light" : "text-dark",
							class: normalizeClass(_ctx.$style.itemLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
							_: 2
						}, 1032, ["color", "class"])]),
						_: 2
					}, 1032, [
						"role",
						"permission-count",
						"total-permissions",
						"edit-route-name",
						"view-route-name",
						"from-view"
					])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(item.label), 1)], 64))]),
					"item-trailing": withCtx(({ item, ui }) => [isUnavailableRoleItem(item) ? (openBlock(), createBlock(unref(N8nBadge_default), mergeProps({
						key: 0,
						variant: "warning"
					}, ui, { class: _ctx.$style.upgradeBadge }), {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
						_: 1
					}, 16, ["class"])) : createCommentVNode("", true)]),
					label: withCtx(({ item }) => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sectionLabelContent) }, [createTextVNode(toDisplayString(item.label) + " ", 1), item.label === unref(i18n).baseText("projects.settings.role.selector.section.custom") && !__props.hasCustomRolesLicense ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 0,
						variant: "outline",
						class: normalizeClass(_ctx.$style.sectionUpgradeBadge),
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => {
							closeDropdown();
							upgradeModalVisible.value = true;
						}, ["stop"]))
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "lock",
							size: "xsmall"
						}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)], 2)]),
					footer: withCtx(() => [createBaseVNode("button", {
						type: "button",
						class: normalizeClass(_ctx.$style.addCustomRoleButton),
						onClick: withModifiers(onAddCustomRoleClick, ["stop"])
					}, [createVNode(unref(N8nIcon_default), {
						icon: "plus",
						size: "small"
					}), createVNode(unref(N8nText_default), {
						tag: "span",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.role.selector.addCustomRole")), 1)]),
						_: 1
					})], 2)]),
					_: 1
				}, 8, [
					"open",
					"items",
					"model-value",
					"variant",
					"placeholder",
					"disabled",
					"data-test-id"
				]),
				createVNode(RoleContactAdminModal_default, {
					modelValue: contactAdminModalVisible.value,
					"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => contactAdminModalVisible.value = $event),
					"custom-roles-exist": __props.customRoles.length > 0
				}, null, 8, ["modelValue", "custom-roles-exist"]),
				createVNode(CustomRolesUpgradeModal_default, {
					modelValue: upgradeModalVisible.value,
					"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => upgradeModalVisible.value = $event)
				}, null, 8, ["modelValue"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_wwvvw_1",
	itemLabel: "_itemLabel_wwvvw_7",
	upgradeBadge: "_upgradeBadge_wwvvw_15",
	sectionLabelContent: "_sectionLabelContent_wwvvw_19",
	sectionUpgradeBadge: "_sectionUpgradeBadge_wwvvw_25",
	addCustomRoleButton: "_addCustomRoleButton_wwvvw_32"
} }]]);
//#endregion
export { CustomRolesUpgradeModal_default as n, RoleSelectDropdown_default as t };
