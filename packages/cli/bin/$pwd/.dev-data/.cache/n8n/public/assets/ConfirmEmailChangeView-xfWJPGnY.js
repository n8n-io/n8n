import { $d as init_runtime_core_esm_bundler, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { $j as N8nLogo_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _C as useUsersStore, _N as N8nText_default, dC as useToast, fC as VIEWS, jN as useI18n, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/core/auth/views/ConfirmEmailChangeView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ConfirmEmailChangeView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ConfirmEmailChangeView",
	setup(__props) {
		const usersStore = useUsersStore();
		const { settings: { releaseChannel } } = useSettingsStore();
		const locale = useI18n();
		const toast = useToast();
		const router = useRouter();
		const loading = ref(false);
		const ready = ref(false);
		const newEmail = ref("");
		const getToken = () => {
			const { token } = router.currentRoute.value.query;
			return typeof token === "string" && token.length > 0 ? token : null;
		};
		const onConfirm = async () => {
			const token = getToken();
			if (!token) return;
			try {
				loading.value = true;
				await usersStore.confirmEmailChange({ token });
				toast.showMessage({
					type: "success",
					title: locale.baseText("auth.confirmEmailChange.success.title"),
					message: locale.baseText("auth.confirmEmailChange.success.message")
				});
				await usersStore.logout();
				await router.push({ name: VIEWS.SIGNIN });
			} catch (error) {
				toast.showError(error, locale.baseText("auth.confirmEmailChange.error"));
			}
			loading.value = false;
		};
		onMounted(async () => {
			const token = getToken();
			if (!token) {
				toast.showError(new Error(locale.baseText("auth.confirmEmailChange.missingTokenError")), locale.baseText("auth.confirmEmailChange.error"));
				router.replace({ name: VIEWS.SIGNIN });
				return;
			}
			try {
				const resolved = await usersStore.resolveEmailChangeToken({ token });
				newEmail.value = resolved.email;
				ready.value = true;
			} catch (error) {
				toast.showError(error, locale.baseText("auth.confirmEmailChange.tokenValidationError"));
				router.replace({ name: VIEWS.SIGNIN });
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(unref(N8nLogo_default), {
				size: "large",
				"release-channel": unref(releaseChannel)
			}, null, 8, ["release-channel"]), ready.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "confirm-email-change"
			}, [
				createVNode(unref(N8nHeading_default), { size: "xlarge" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("auth.confirmEmailChange.title")), 1)]),
					_: 1
				}),
				createVNode(unref(N8nText_default), { color: "text-base" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("auth.confirmEmailChange.message", { interpolate: { newEmail: newEmail.value } })), 1)]),
					_: 1
				}),
				createVNode(unref(N8nButton_default), {
					label: unref(locale).baseText("auth.confirmEmailChange.button"),
					loading: loading.value,
					size: "large",
					"data-test-id": "confirm-email-change-button",
					onClick: onConfirm
				}, null, 8, ["label", "loading"])
			], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_11atm_1",
	card: "_card_11atm_8"
} }]]);
//#endregion
export { ConfirmEmailChangeView_default as default };
