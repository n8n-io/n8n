import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Zd as h, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList } from "./vendor-Hx42-oQF.js";
import { $b as CREDENTIAL_RESOLVER_EDIT_MODAL_KEY, Jg as useUIStore, PA as useMessage, SN as _plugin_vue_export_helper_default, _N as N8nText_default, _w as getCredentialResolverWorkflows, bC as useRootStore, dC as useToast, fC as VIEWS, gw as getCredentialResolverTypes, hM as N8nLink_default, jN as useI18n, mw as deleteCredentialResolver, vw as getCredentialResolvers } from "./app-D5flEmb-.js";
//#region src/features/resolvers/components/ResolverDeleteConfirmMessage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var MAX_DISPLAYED_WORKFLOWS = 5;
var ResolverDeleteConfirmMessage_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResolverDeleteConfirmMessage",
	props: {
		resolverName: {},
		affectedWorkflows: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const displayed = computed(() => props.affectedWorkflows.slice(0, MAX_DISPLAYED_WORKFLOWS));
		const remaining = computed(() => props.affectedWorkflows.length - displayed.value.length);
		const messageKey = computed(() => props.affectedWorkflows.length > 0 ? "credentialResolverEdit.confirmMessage.deleteResolver.messageWithWorkflows" : "credentialResolverEdit.confirmMessage.deleteResolver.message");
		const messageParts = computed(() => {
			const [before, after] = i18n.baseText(messageKey.value, { interpolate: { savedResolverName: "{{RESOLVER_NAME}}" } }).split("{{RESOLVER_NAME}}");
			return {
				before,
				after
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [
						createTextVNode(toDisplayString(messageParts.value.before), 1),
						createVNode(unref(N8nText_default), {
							bold: "",
							tag: "span"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(props.resolverName), 1)]),
							_: 1
						}),
						createTextVNode(toDisplayString(messageParts.value.after), 1)
					]),
					_: 1
				}),
				__props.affectedWorkflows.length > 0 ? (openBlock(), createElementBlock("ul", {
					key: 0,
					class: normalizeClass(_ctx.$style.workflowList)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(displayed.value, (workflow) => {
					return openBlock(), createElementBlock("li", {
						key: workflow.id,
						class: normalizeClass(_ctx.$style.workflowItem)
					}, [createVNode(unref(N8nLink_default), {
						href: unref(router).resolve({
							name: unref(VIEWS).WORKFLOW,
							params: { workflowId: workflow.id }
						}).href,
						"new-window": ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(workflow.name), 1)]),
						_: 2
					}, 1032, ["href"])], 2);
				}), 128))], 2)) : createCommentVNode("", true),
				remaining.value > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialResolverEdit.confirmMessage.deleteResolver.andMore", { interpolate: { count: String(remaining.value) } })), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_190rv_1",
	workflowList: "_workflowList_190rv_7",
	workflowItem: "_workflowItem_190rv_13"
} }]]);
//#endregion
//#region src/features/resolvers/composables/useCredentialResolvers.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useCredentialResolvers() {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const message = useMessage();
	const toast = useToast();
	const i18n = useI18n();
	const resolvers = ref([]);
	const resolverTypes = ref([]);
	const isLoading = ref(false);
	const isDeleting = ref(false);
	const fetchResolvers = async (options = {}) => {
		try {
			isLoading.value = true;
			resolvers.value = await getCredentialResolvers(rootStore.restApiContext, options);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText("workflowSettings.showError.fetchSettings.title"));
			return false;
		} finally {
			isLoading.value = false;
		}
	};
	const fetchResolverTypes = async () => {
		try {
			resolverTypes.value = await getCredentialResolverTypes(rootStore.restApiContext);
		} catch (error) {
			toast.showError(error, i18n.baseText("credentialResolverEdit.error.loadTypes"));
		}
	};
	const confirmAndDeleteResolver = async (resolver) => {
		let affectedWorkflows = [];
		try {
			affectedWorkflows = await getCredentialResolverWorkflows(rootStore.restApiContext, resolver.id);
		} catch {}
		const confirmMessage = h(ResolverDeleteConfirmMessage_default, {
			resolverName: resolver.name,
			affectedWorkflows
		});
		if (await message.confirm(confirmMessage, i18n.baseText("credentialResolverEdit.confirmMessage.deleteResolver.headline"), {
			confirmButtonText: i18n.baseText("credentialResolverEdit.confirmMessage.deleteResolver.confirmButtonText"),
			customClass: "el-message-box--destructive",
			showClose: true
		}) !== "confirm") return false;
		try {
			isDeleting.value = true;
			await deleteCredentialResolver(rootStore.restApiContext, resolver.id);
			toast.showMessage({
				title: i18n.baseText("credentialResolverEdit.deleteSuccess.title"),
				type: "success"
			});
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText("credentialResolverEdit.error.delete"));
			return false;
		} finally {
			isDeleting.value = false;
		}
	};
	const refreshResolvers = async () => await fetchResolvers();
	const openCreateModal = (callbacks) => {
		uiStore.openModalWithData({
			name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
			data: { onSave: callbacks?.onSave ?? refreshResolvers }
		});
	};
	const openEditModal = (resolverId, callbacks) => {
		uiStore.openModalWithData({
			name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
			data: {
				resolverId,
				onSave: callbacks?.onSave ?? refreshResolvers,
				onDelete: callbacks?.onDelete ?? refreshResolvers
			}
		});
	};
	return {
		resolvers,
		resolverTypes,
		isLoading,
		isDeleting,
		fetchResolvers,
		fetchResolverTypes,
		deleteResolver: confirmAndDeleteResolver,
		openCreateModal,
		openEditModal
	};
}
//#endregion
export { useCredentialResolvers as t };
