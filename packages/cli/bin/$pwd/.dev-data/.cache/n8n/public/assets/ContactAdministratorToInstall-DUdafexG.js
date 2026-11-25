import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Od as useCssModule, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _C as useUsersStore, _N as N8nText_default, jN as useI18n, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/settings/communityNodes/components/ContactAdministratorToInstall.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { style: { "padding-bottom": "8px" } };
var ContactAdministratorToInstall_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ContactAdministratorToInstall",
	props: { box: { type: Boolean } },
	setup(__props) {
		const props = __props;
		const $style = useCssModule();
		const usersStore = useUsersStore();
		const i18n = useI18n();
		const ownerEmailList = computed(() => usersStore.allUsers.filter((user) => user.role?.includes("owner")).map((user) => user.email));
		const classes = computed(() => ({
			[$style.contactOwnerHint]: true,
			[$style.border]: props.box
		}));
		onMounted(async () => {
			await usersStore.fetchUsers({ filter: { isOwner: true } });
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(classes.value) }, [props.box ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				color: "text-light",
				icon: "info",
				size: "large"
			})) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
				color: "text-base",
				size: "medium"
			}, {
				default: withCtx(() => [createBaseVNode("div", _hoisted_1, toDisplayString(unref(i18n).baseText("communityNodeInfo.contact.admin")), 1), ownerEmailList.value.length ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(ownerEmailList.value.join(", ")), 1)]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	contactOwnerHint: "_contactOwnerHint_1j0j2_1",
	border: "_border_1j0j2_9"
} }]]);
//#endregion
export { ContactAdministratorToInstall_default as t };
