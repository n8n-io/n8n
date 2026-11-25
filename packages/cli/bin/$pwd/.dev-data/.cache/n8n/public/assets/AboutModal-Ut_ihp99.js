import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, DC as getThirdPartyLicenses, Fs as useInstanceRegistryStore, Ij as SettingsRowGroup_default, Jg as useUIStore, KA as Dialog_default, Ps as useDebugInfo, Vr as useClipboard, WA as DialogBody_default, _N as N8nText_default, bC as useRootStore, dC as useToast, jN as useI18n, qb as ABOUT_MODAL_KEY, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/app/components/AboutModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SOURCE_CODE_HOST = "github.com/n8n-io/n8n";
//#endregion
//#region src/app/components/AboutModal.vue
var AboutModal_default = /* @__PURE__ */ defineComponent({
	__name: "AboutModal",
	setup(__props) {
		const SOURCE_CODE_URL = `https://${SOURCE_CODE_HOST}`;
		const LICENSE_URL = `${SOURCE_CODE_URL}/blob/master/LICENSE.md`;
		const toast = useToast();
		const i18n = useI18n();
		const debugInfo = useDebugInfo();
		const clipboard = useClipboard();
		const rootStore = useRootStore();
		const uiStore = useUIStore();
		const instanceRegistryStore = useInstanceRegistryStore();
		onMounted(async () => {
			await instanceRegistryStore.fetchClusterInfo();
		});
		const onOpenChange = (open) => {
			if (!open) uiStore.closeModal(ABOUT_MODAL_KEY);
		};
		const copyInstanceId = async () => {
			await clipboard.copy(rootStore.instanceId);
			toast.showMessage({
				title: i18n.baseText("about.instanceID.copied"),
				type: "success"
			});
		};
		const downloadThirdPartyLicenses = async () => {
			try {
				const thirdPartyLicenses = await getThirdPartyLicenses(rootStore.restApiContext);
				const blob = new File([thirdPartyLicenses], "THIRD_PARTY_LICENSES.md", { type: "text/markdown" });
				window.open(URL.createObjectURL(blob));
			} catch (error) {
				toast.showToast({
					title: i18n.baseText("about.thirdPartyLicenses.downloadError"),
					message: error.message,
					type: "error"
				});
			}
		};
		const copyDebugInfoToClipboard = async () => {
			toast.showToast({
				title: i18n.baseText("about.debug.toast.title"),
				message: i18n.baseText("about.debug.toast.message"),
				type: "info",
				duration: 5e3
			});
			await clipboard.copy(debugInfo.generateDebugInfo());
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: true,
				size: "large",
				header: unref(i18n).baseText("about.aboutN8n"),
				"aria-description": unref(i18n).baseText("about.ariaDescription"),
				"data-test-id": "about-modal",
				"onUpdate:open": onOpenChange
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
						default: withCtx(() => [
							createVNode(unref(SettingsRow_default), { title: unref(i18n).baseText("about.n8nVersion") }, {
								action: withCtx(() => [createVNode(unref(N8nText_default), {
									size: "medium",
									color: "text-dark",
									"data-test-id": "about-modal-version"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(rootStore).versionCli), 1)]),
									_: 1
								})]),
								_: 1
							}, 8, ["title"]),
							createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("about.instanceID"),
								description: unref(rootStore).instanceId,
								"max-description-lines": 1
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									icon: "copy",
									label: unref(i18n).baseText("generic.copy"),
									"data-test-id": "about-modal-copy-instance-id",
									onClick: copyInstanceId
								}, null, 8, ["label"])]),
								_: 1
							}, 8, ["title", "description"]),
							createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("about.sourceCode"),
								description: SOURCE_CODE_HOST
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									href: SOURCE_CODE_URL,
									target: "_blank"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.open")) + " ", 1), createVNode(unref(N8nIcon_default), {
										icon: "external-link",
										size: "small"
									})]),
									_: 1
								})]),
								_: 1
							}, 8, ["title"]),
							createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("about.license"),
								description: unref(i18n).baseText("about.n8nLicense")
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									href: LICENSE_URL,
									target: "_blank"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.open")) + " ", 1), createVNode(unref(N8nIcon_default), {
										icon: "external-link",
										size: "small"
									})]),
									_: 1
								})]),
								_: 1
							}, 8, ["title", "description"]),
							createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("about.thirdPartyLicenses"),
								description: unref(i18n).baseText("about.thirdPartyLicenses.description")
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									"data-test-id": "about-modal-third-party-licenses",
									onClick: downloadThirdPartyLicenses
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.open")) + " ", 1), createVNode(unref(N8nIcon_default), {
										icon: "external-link",
										size: "small"
									})]),
									_: 1
								})]),
								_: 1
							}, 8, ["title", "description"]),
							createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("about.debug.title"),
								description: unref(i18n).baseText("about.debug.description")
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									icon: "copy",
									label: unref(i18n).baseText("generic.copy"),
									"data-test-id": "about-modal-copy-debug-info",
									onClick: copyDebugInfoToClipboard
								}, null, 8, ["label"])]),
								_: 1
							}, 8, ["title", "description"])
						]),
						_: 1
					})]),
					_: 1
				})]),
				_: 1
			}, 8, ["header", "aria-description"]);
		};
	}
});
//#endregion
export { AboutModal_default as default };
