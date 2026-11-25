import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Tf as watch, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, of as onBeforeUnmount, v as P, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, KA as Dialog_default, Od as useWorkflowsStore, SN as _plugin_vue_export_helper_default, WA as DialogBody_default, Zb as BINARY_DATA_VIEW_MODAL_KEY, dr as RunDataMarkdown_default, iM as N8nHtmlPreview_default, jN as useI18n } from "./app-D5flEmb-.js";
//#region src/features/ndv/runData/components/BinaryDataViewModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "loading-message"
};
var _hoisted_2 = {
	key: 1,
	class: "error-message"
};
var _hoisted_3 = {
	key: 2,
	class: "content-wrapper"
};
var _hoisted_4 = {
	key: 0,
	controls: "",
	autoplay: ""
};
var _hoisted_5 = ["src", "type"];
var _hoisted_6 = {
	key: 1,
	controls: "",
	autoplay: ""
};
var _hoisted_7 = ["src", "type"];
var _hoisted_8 = ["src", "alt"];
var _hoisted_9 = {
	key: 6,
	class: "text-content"
};
var _hoisted_10 = ["src", "title"];
var _hoisted_11 = {
	key: 8,
	class: "error-message"
};
//#endregion
//#region src/features/ndv/runData/components/BinaryDataViewModal.vue
var BinaryDataViewModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "BinaryDataViewModal",
	props: { data: {} },
	setup(__props) {
		const i18n = useI18n();
		const uiStore = useUIStore();
		const workflowsStore = useWorkflowsStore();
		const props = __props;
		const isLoading = ref(true);
		const embedSource = ref("");
		const error = ref(false);
		const displayData = ref("");
		let currentBlobUrl = null;
		const binaryData = computed(() => {
			const { id, mimeType, fileName } = props.data.binaryData;
			let fileType = "other";
			if (mimeType) {
				const baseType = mimeType.split(";")[0].trim();
				if (baseType.startsWith("image/")) fileType = "image";
				else if (baseType.startsWith("audio/")) fileType = "audio";
				else if (baseType.startsWith("video/")) fileType = "video";
				else if (baseType === "application/pdf") fileType = "pdf";
				else if (baseType === "application/json" || baseType === "text/json") fileType = "json";
				else if (baseType === "text/html") fileType = "html";
				else if (baseType === "text/markdown" || baseType.includes("markdown")) fileType = "markdown";
				else if (baseType.startsWith("text/")) fileType = "text";
			}
			return {
				id,
				mimeType,
				fileName,
				fileType
			};
		});
		function revokeBlobUrl() {
			if (currentBlobUrl) {
				URL.revokeObjectURL(currentBlobUrl);
				currentBlobUrl = null;
			}
		}
		async function loadBinaryData() {
			isLoading.value = true;
			error.value = false;
			revokeBlobUrl();
			embedSource.value = "";
			displayData.value = "";
			const { id, fileName, fileType, mimeType } = binaryData.value;
			try {
				const action = [
					"html",
					"pdf",
					"text"
				].includes(fileType) ? "download" : "view";
				const binaryUrl = workflowsStore.getBinaryUrl(id, action, fileName || "", mimeType || "");
				switch (fileType) {
					case "json": {
						const fetchedData = await fetch(binaryUrl, { credentials: "include" });
						displayData.value = await fetchedData.json();
						break;
					}
					case "html":
					case "markdown":
					case "text": {
						const fetchedData = await fetch(binaryUrl, { credentials: "include" });
						displayData.value = await fetchedData.text();
						break;
					}
					case "pdf": {
						const fetched = await fetch(binaryUrl, { credentials: "include" });
						const blob = new Blob([await fetched.blob()], { type: "application/pdf" });
						currentBlobUrl = URL.createObjectURL(blob);
						embedSource.value = currentBlobUrl;
						break;
					}
					default: embedSource.value = binaryUrl;
				}
			} catch (e) {
				console.error(e.message);
				error.value = true;
			}
			isLoading.value = false;
		}
		watch(() => props.data.binaryData, () => {
			loadBinaryData().catch(() => {});
		}, { immediate: true });
		onBeforeUnmount(() => {
			revokeBlobUrl();
		});
		const modalOpen = computed(() => uiStore.modalsById[BINARY_DATA_VIEW_MODAL_KEY]?.open === true);
		function closeDialog() {
			uiStore.closeModal(BINARY_DATA_VIEW_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "2xlarge",
				header: unref(i18n).baseText("binaryDataDisplay.filePreview"),
				"container-class": "binary-data-view-dialog",
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(["binary-data-modal-content", binaryData.value.fileType]),
						"data-test-id": "binaryDataView-modal"
					}, [isLoading.value ? (openBlock(), createElementBlock("div", _hoisted_1, toDisplayString(unref(i18n).baseText("binaryDataDisplay.loading")), 1)) : error.value ? (openBlock(), createElementBlock("div", _hoisted_2, toDisplayString(unref(i18n).baseText("binaryDataDisplay.errorLoading")), 1)) : (openBlock(), createElementBlock("div", _hoisted_3, [binaryData.value.fileType === "video" ? (openBlock(), createElementBlock("video", _hoisted_4, [createBaseVNode("source", {
						src: embedSource.value,
						type: binaryData.value.mimeType
					}, null, 8, _hoisted_5), createTextVNode(" " + toDisplayString(unref(i18n).baseText("binaryDataDisplay.yourBrowserDoesNotSupport")), 1)])) : binaryData.value.fileType === "audio" ? (openBlock(), createElementBlock("audio", _hoisted_6, [createBaseVNode("source", {
						src: embedSource.value,
						type: binaryData.value.mimeType
					}, null, 8, _hoisted_7), createTextVNode(" " + toDisplayString(unref(i18n).baseText("binaryDataDisplay.yourBrowserDoesNotSupport")), 1)])) : binaryData.value.fileType === "image" ? (openBlock(), createElementBlock("img", {
						key: 2,
						src: embedSource.value,
						alt: binaryData.value.fileName || unref(i18n).baseText("binaryDataDisplay.imagePreview")
					}, null, 8, _hoisted_8)) : binaryData.value.fileType === "json" ? (openBlock(), createBlock(unref(P), {
						key: 3,
						data: displayData.value,
						deep: 3,
						"show-length": true
					}, null, 8, ["data"])) : binaryData.value.fileType === "html" ? (openBlock(), createBlock(unref(N8nHtmlPreview_default), {
						key: 4,
						html: displayData.value
					}, null, 8, ["html"])) : binaryData.value.fileType === "markdown" ? (openBlock(), createBlock(RunDataMarkdown_default, {
						key: 5,
						"input-markdown": displayData.value
					}, null, 8, ["input-markdown"])) : binaryData.value.fileType === "text" ? (openBlock(), createElementBlock("pre", _hoisted_9, "						" + toDisplayString(displayData.value) + "\n					", 1)) : binaryData.value.fileType === "pdf" ? (openBlock(), createElementBlock("iframe", {
						key: 7,
						src: embedSource.value,
						class: "binary-data",
						title: binaryData.value.fileName || unref(i18n).baseText("binaryDataDisplay.filePreview")
					}, null, 8, _hoisted_10)) : (openBlock(), createElementBlock("div", _hoisted_11, toDisplayString(unref(i18n).baseText("binaryDataDisplay.previewNotAvailable")), 1))]))], 2)]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__scopeId", "data-v-d89f8c80"]]);
//#endregion
export { BinaryDataViewModal_default as default };
