import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, mf as renderList } from "./vendor-Hx42-oQF.js";
import { Hc as CredentialIcon_default, SN as _plugin_vue_export_helper_default, fC as VIEWS, hu as NodeIcon_default, nD as getResourcePermissions, uf as useNodeTypesStore } from "./app-D5flEmb-.js";
//#region src/features/collaboration/projects/components/ProjectMoveResourceModalCredentialsList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 1 };
var ProjectMoveResourceModalCredentialsList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectMoveResourceModalCredentialsList",
	props: {
		credentials: { default: () => [] },
		currentProjectId: { default: "" }
	},
	setup(__props) {
		const props = __props;
		const isCredentialReadable = (credential) => "scopes" in credential ? getResourcePermissions(credential.scopes).credential.read : false;
		const getCredentialRouterLocation = (credential) => {
			const isSharedWithCurrentProject = credential.sharedWithProjects?.find((p) => p.id === props.currentProjectId);
			const params = { credentialId: credential.id };
			if (isSharedWithCurrentProject ?? credential.homeProject?.id) params.projectId = isSharedWithCurrentProject ? props.currentProjectId : credential.homeProject?.id;
			return {
				name: isSharedWithCurrentProject ? VIEWS.PROJECTS_CREDENTIALS : VIEWS.CREDENTIALS,
				params
			};
		};
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("ul", { class: normalizeClass(_ctx.$style.credentialsList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.credentials, (credential) => {
				return openBlock(), createElementBlock("li", { key: credential.id }, [isCredentialReadable(credential) ? (openBlock(), createBlock(_component_RouterLink, {
					key: 0,
					target: "_blank",
					to: getCredentialRouterLocation(credential)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(credential.name), 1)]),
					_: 2
				}, 1032, ["to"])) : (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(credential.name), 1))]);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": { credentialsList: "_credentialsList_1w1du_1" } }]]);
//#endregion
//#region src/app/components/PolicyViolationTypeIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/app/components/PolicyViolationTypeIcon.vue
var PolicyViolationTypeIcon_default = /* @__PURE__ */ defineComponent({
	__name: "PolicyViolationTypeIcon",
	props: { violation: {} },
	setup(__props) {
		const nodeTypesStore = useNodeTypesStore();
		const nodeType = computed(() => __props.violation.subjectType === "nodeType" && __props.violation.subject ? nodeTypesStore.getNodeType(__props.violation.subject) : null);
		return (_ctx, _cache) => {
			return nodeType.value ? (openBlock(), createBlock(NodeIcon_default, {
				key: 0,
				"node-type": nodeType.value,
				size: 20
			}, null, 8, ["node-type"])) : __props.violation.subjectType === unref("credentialType") && __props.violation.subject ? (openBlock(), createBlock(CredentialIcon_default, {
				key: 1,
				"credential-type-name": __props.violation.subject,
				size: 20
			}, null, 8, ["credential-type-name"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { ProjectMoveResourceModalCredentialsList_default as n, PolicyViolationTypeIcon_default as t };
