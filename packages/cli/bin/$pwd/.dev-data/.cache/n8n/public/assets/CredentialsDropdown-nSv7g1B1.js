import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, fN as N8nTooltip_default, jN as useI18n, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/credentials/components/CredentialPicker/CredentialsDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["disabled"];
var CredentialsDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialsDropdown",
	props: {
		credentialOptions: {},
		selectedCredentialId: {},
		permissions: {},
		placeholder: {},
		loading: { type: Boolean },
		disabled: { type: Boolean },
		teleported: { type: Boolean },
		size: {},
		managedOption: {}
	},
	emits: ["credentialSelected", "newCredential"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const selectRefs = ref(null);
		const filter = ref("");
		function matches(needle, haystack) {
			return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
		}
		const filteredOptions = computed(() => {
			if (!filter.value) return props.credentialOptions;
			return props.credentialOptions.filter((option) => matches(filter.value, option.name) || option.homeProject?.name && matches(filter.value, option.homeProject.name));
		});
		const showManagedOption = computed(() => props.managedOption && (!filter.value || matches(filter.value, props.managedOption.label)));
		const isManagedSelected = computed(() => !!props.managedOption && props.selectedCredentialId === props.managedOption.value);
		const selectedPrefixIcon = computed(() => {
			if (isManagedSelected.value) return "wallet";
			if (props.selectedCredentialId) return "key-round";
		});
		const onFilter = (newFilter = "") => {
			filter.value = newFilter;
		};
		const onVisibleChange = (visible) => {
			if (!visible) filter.value = "";
		};
		const closeSelect = () => {
			selectRefs.value?.innerSelect?.handleClose();
			selectRefs.value?.blur();
		};
		const onCredentialSelected = (credentialId) => {
			closeSelect();
			emit("credentialSelected", credentialId);
		};
		const onCreateNewCredential = async () => {
			closeSelect();
			await nextTick();
			emit("newCredential");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.selectContainer) }, [createVNode(unref(N8nSelect_default), {
				ref_key: "selectRefs",
				ref: selectRefs,
				size: props.size ?? "small",
				filterable: "",
				"filter-method": onFilter,
				"model-value": props.selectedCredentialId,
				placeholder: props.placeholder,
				loading: props.loading,
				disabled: props.disabled,
				teleported: props.teleported ?? false,
				"fit-input-width": "",
				class: normalizeClass({
					[_ctx.$style.selectWithIcon]: !!selectedPrefixIcon.value,
					[_ctx.$style.selectWithBalance]: isManagedSelected.value && __props.managedOption?.pill
				}),
				"popper-class": _ctx.$style.selectPopper,
				"onUpdate:modelValue": onCredentialSelected,
				onVisibleChange
			}, createSlots({
				empty: withCtx(() => []),
				footer: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					disabled: props.permissions.create,
					content: unref(i18n).baseText("nodeCredentials.createNew.permissionDenied"),
					placement: "top"
				}, {
					default: withCtx(() => [createBaseVNode("button", {
						type: "button",
						"data-test-id": "node-credentials-select-item-new",
						class: normalizeClass([_ctx.$style.newCredential]),
						disabled: !props.permissions.create,
						onClick: _cache[0] || (_cache[0] = ($event) => onCreateNewCredential())
					}, [createVNode(unref(N8nIcon_default), {
						size: "large",
						icon: "plus",
						class: normalizeClass(_ctx.$style.optionIcon)
					}, null, 8, ["class"]), createTextVNode(" " + toDisplayString(unref(i18n).baseText("nodeCredentials.createNew")), 1)], 10, _hoisted_1)]),
					_: 1
				}, 8, ["disabled", "content"])]),
				default: withCtx(() => [showManagedOption.value && __props.managedOption ? (openBlock(), createBlock(unref(N8nOption_default), {
					key: __props.managedOption.value,
					"data-test-id": `node-credentials-select-item-${__props.managedOption.value}`,
					label: __props.managedOption.label,
					value: __props.managedOption.value,
					onClick: closeSelect
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialOption) }, [
						createVNode(unref(N8nIcon_default), {
							icon: "wallet",
							size: "large",
							class: normalizeClass(_ctx.$style.optionIcon)
						}, null, 8, ["class"]),
						createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.optionName) }, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.managedOption.label), 1)]),
							_: 1
						}, 8, ["class"]),
						__props.managedOption.pill ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							size: "xxsmall",
							variant: __props.managedOption.pill.type === "danger" || __props.managedOption.pill.type === "info" ? __props.managedOption.pill.type : "success"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.managedOption.pill.text), 1)]),
							_: 1
						}, 8, ["variant"])) : createCommentVNode("", true),
						isManagedSelected.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 1,
							icon: "check",
							size: "large",
							class: normalizeClass(_ctx.$style.checkIcon)
						}, null, 8, ["class"])) : createCommentVNode("", true)
					], 2)]),
					_: 1
				}, 8, [
					"data-test-id",
					"label",
					"value"
				])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(filteredOptions.value, (item) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: item.id,
						"data-test-id": `node-credentials-select-item-${item.id}`,
						label: item.name,
						value: item.id,
						onClick: closeSelect
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialOption) }, [
							createVNode(unref(N8nIcon_default), {
								icon: "key-round",
								size: "large",
								class: normalizeClass(_ctx.$style.optionIcon)
							}, null, 8, ["class"]),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionText) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionPrimary) }, [createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.optionName) }, {
								default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
								_: 2
							}, 1032, ["class"]), item.typeDisplayName ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								color: "text-light",
								class: normalizeClass(_ctx.$style.optionType)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(item.typeDisplayName), 1)]),
								_: 2
							}, 1032, ["class"])) : createCommentVNode("", true)], 2), item.homeProject?.name ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								color: "text-light",
								class: normalizeClass(_ctx.$style.optionOwner)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(item.homeProject.name), 1)]),
								_: 2
							}, 1032, ["class"])) : createCommentVNode("", true)], 2),
							props.selectedCredentialId === item.id ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "check",
								size: "large",
								class: normalizeClass(_ctx.$style.checkIcon)
							}, null, 8, ["class"])) : createCommentVNode("", true)
						], 2)]),
						_: 2
					}, 1032, [
						"data-test-id",
						"label",
						"value"
					]);
				}), 128))]),
				_: 2
			}, [selectedPrefixIcon.value ? {
				name: "prefix",
				fn: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: selectedPrefixIcon.value,
					size: "large",
					class: normalizeClass(_ctx.$style.optionIcon)
				}, null, 8, ["icon", "class"])]),
				key: "0"
			} : void 0]), 1032, [
				"size",
				"model-value",
				"placeholder",
				"loading",
				"disabled",
				"teleported",
				"class",
				"popper-class"
			]), isManagedSelected.value && __props.managedOption?.pill && !filter.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				"data-test-id": "credential-balance-indicator",
				class: normalizeClass(_ctx.$style.balanceIndicator)
			}, [createBaseVNode("span", {
				class: normalizeClass(_ctx.$style.balanceLabelSizer),
				"aria-hidden": "true"
			}, toDisplayString(__props.managedOption.label), 3), createVNode(unref(N8nBadge_default), {
				size: "xxsmall",
				variant: __props.managedOption.pill.type === "danger" || __props.managedOption.pill.type === "info" ? __props.managedOption.pill.type : "success"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.managedOption.pill.text), 1)]),
				_: 1
			}, 8, ["variant"])], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	selectContainer: "_selectContainer_6vxzp_1",
	balanceIndicator: "_balanceIndicator_6vxzp_16",
	selectWithIcon: "_selectWithIcon_6vxzp_28",
	selectWithBalance: "_selectWithBalance_6vxzp_32",
	selectPopper: "_selectPopper_6vxzp_36",
	newCredential: "_newCredential_6vxzp_59",
	credentialOption: "_credentialOption_6vxzp_69",
	optionText: "_optionText_6vxzp_77",
	optionPrimary: "_optionPrimary_6vxzp_84",
	optionIcon: "_optionIcon_6vxzp_91",
	optionName: "_optionName_6vxzp_98",
	optionType: "_optionType_6vxzp_107",
	optionOwner: "_optionOwner_6vxzp_112",
	checkIcon: "_checkIcon_6vxzp_119",
	balanceLabelSizer: "_balanceLabelSizer_6vxzp_137"
} }]]);
//#endregion
export { CredentialsDropdown_default as t };
