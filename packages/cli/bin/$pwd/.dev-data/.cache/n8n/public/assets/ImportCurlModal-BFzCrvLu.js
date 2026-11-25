const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/useImportCurlCommand-BViuDjZX.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-Hx42-oQF.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css"])))=>i.map(i=>d[i]);
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { DN as __vitePreload, Jg as useUIStore, KA as Dialog_default, Kj as N8nNotice_default, Kp as injectNDVStore, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, hC as useTelemetry, jN as useI18n, ox as IMPORT_CURL_MODAL_KEY, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ndv/parameters/components/ImportCurlModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ImportCurlModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ImportCurlModal",
	setup(__props) {
		const telemetry = useTelemetry();
		const toast = useToast();
		const i18n = useI18n();
		const uiStore = useUIStore();
		const ndvStore = injectNDVStore();
		const curlCommand = ref("");
		const modalOpen = computed(() => uiStore.modalsById[IMPORT_CURL_MODAL_KEY]?.open === true);
		const inputRef = ref(null);
		onMounted(() => {
			const curlCommands = uiStore.modalsById[IMPORT_CURL_MODAL_KEY].data?.curlCommands;
			const nodeId = ndvStore.value.activeNode?.id ?? "";
			const command = curlCommands?.[nodeId];
			curlCommand.value = command ?? "";
		});
		function onInput(value) {
			curlCommand.value = value;
		}
		function onFocus() {
			inputRef.value?.select();
		}
		function closeDialog() {
			uiStore.closeModal(IMPORT_CURL_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		function onImportSuccess() {
			sendTelemetry();
			closeDialog();
		}
		function onImportFailure(data) {
			sendTelemetry({
				success: false,
				...data
			});
		}
		function onAfterImport() {
			const nodeId = ndvStore.value.activeNode?.id;
			const curlCommands = uiStore.modalsById[IMPORT_CURL_MODAL_KEY].data?.curlCommands;
			uiStore.setModalData({
				name: IMPORT_CURL_MODAL_KEY,
				data: { curlCommands: {
					...curlCommands,
					[nodeId]: curlCommand.value
				} }
			});
		}
		function sendTelemetry(data = {
			success: true,
			invalidProtocol: false,
			protocol: ""
		}) {
			telemetry.track("User imported curl command", {
				success: data.success,
				invalidProtocol: data.invalidProtocol,
				protocol: data.protocol
			});
		}
		async function onImport() {
			try {
				const { useImportCurlCommand } = await __vitePreload(async () => {
					const { useImportCurlCommand } = await import("./useImportCurlCommand-BViuDjZX.js");
					return { useImportCurlCommand };
				}, __vite__mapDeps([0,1,2,3,4,5]));
				const { importCurlCommand } = useImportCurlCommand({
					onImportSuccess,
					onImportFailure,
					onAfterImport
				});
				importCurlCommand(curlCommand);
			} catch {
				toast.showToast({
					title: i18n.baseText("importCurlParameter.showError.failedToLoad.title"),
					message: i18n.baseText("importCurlParameter.showError.failedToLoad.message"),
					type: "error",
					duration: 0
				});
				onImportFailure({ invalidProtocol: false });
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "large",
				header: unref(i18n).baseText("importCurlModal.title"),
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("importCurlModal.input.label"),
						color: "text-dark"
					}, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							ref_key: "inputRef",
							ref: inputRef,
							"model-value": curlCommand.value,
							type: "textarea",
							rows: 5,
							"data-test-id": "import-curl-modal-input",
							placeholder: unref(i18n).baseText("importCurlModal.input.placeholder"),
							"onUpdate:modelValue": onInput,
							onFocus
						}, null, 8, ["model-value", "placeholder"])]),
						_: 1
					}, 8, ["label"])]),
					_: 1
				}), createVNode(unref(DialogFooter_default), { class: normalizeClass(_ctx.$style.footer) }, {
					default: withCtx(() => [createVNode(unref(N8nNotice_default), {
						class: normalizeClass(_ctx.$style.notice),
						content: unref(i18n).baseText("ImportCurlModal.notice.content")
					}, null, 8, ["class", "content"]), createVNode(unref(N8nButton_default), {
						label: unref(i18n).baseText("importCurlModal.button.label"),
						"data-test-id": "import-curl-modal-button",
						onClick: onImport
					}, null, 8, ["label"])]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	footer: "_footer_1afvd_1",
	notice: "_notice_1afvd_5"
} }]]);
//#endregion
export { ImportCurlModal_default as default };
