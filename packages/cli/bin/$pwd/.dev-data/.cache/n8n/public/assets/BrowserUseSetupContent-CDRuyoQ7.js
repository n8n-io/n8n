import { $d as init_runtime_core_esm_bundler, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Iu as useEventListener, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, LM as N8nCallout_default, Mi as isBrowserUseSupportedForBrowser, SN as _plugin_vue_export_helper_default, _N as N8nText_default, _c as CHROME_EXTENSION_URL, gc as BROWSER_USE_EXTENSION_ID, jN as useI18n, qn as useDocumentVisibility, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { i as useInstanceAiBrowserUseTelemetry, n as resetExtensionDirectConnect, r as useExtensionDirectConnect } from "./useExtensionDirectConnect-DyzoSYRV.js";
//#region src/features/ai/instanceAi/components/modals/BrowserUseConnectStep.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CONNECT_URL_REFRESH_MARGIN_MS = 3e4;
var CONNECT_POPUP_WIDTH = 540;
var CONNECT_POPUP_HEIGHT = 700;
var BrowserUseConnectStep_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "BrowserUseConnectStep",
	props: { autoConnect: {
		type: Boolean,
		default: false
	} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const store = useInstanceAiSettingsStore();
		const telemetry = useInstanceAiBrowserUseTelemetry();
		const { status, isFlowActive, attempt } = useExtensionDirectConnect();
		const connectUrl = ref(null);
		const inFlightTextKey = computed(() => {
			if (status.value === "waiting") return "instanceAi.browserUse.directConnect.waiting";
			if (status.value === "connecting" || status.value === "connected") return "instanceAi.browserUse.directConnect.connecting";
			return null;
		});
		let refreshTimer;
		function clearRefreshTimer() {
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = void 0;
			}
		}
		/**
		* Minting rotates the relay token server-side, killing any connect already in flight — so
		* reuse a stored link while it has life left in it.
		*/
		function usableStoredConnectUrl() {
			const url = store.browserConnectUrl;
			const expiresAt = store.browserConnectUrlExpiresAt;
			if (!url || !expiresAt) return null;
			return Date.parse(expiresAt) - Date.now() > CONNECT_URL_REFRESH_MARGIN_MS ? url : null;
		}
		async function refreshConnectUrl() {
			clearRefreshTimer();
			connectUrl.value = usableStoredConnectUrl() ?? await store.fetchBrowserConnectUrl();
			const expiresAt = store.browserConnectUrlExpiresAt;
			if (!connectUrl.value || !expiresAt) return;
			const delay = Date.parse(expiresAt) - Date.now() - CONNECT_URL_REFRESH_MARGIN_MS;
			if (!Number.isFinite(delay) || delay <= 0) return;
			refreshTimer = setTimeout(() => {
				refreshConnectUrl();
			}, delay);
		}
		onMounted(async () => {
			const joinedOuterFlow = isFlowActive.value;
			if (!joinedOuterFlow) resetExtensionDirectConnect();
			await refreshConnectUrl();
			if (!props.autoConnect || !connectUrl.value) return;
			if (joinedOuterFlow) return;
			telemetry.trackDirectConnectRequested();
			await attempt(connectUrl.value);
		});
		/**
		* Let the extension own the confirmation first — a remembered instance connects with no
		* window at all. The unreachable case resolves fast enough that the click's transient
		* activation still permits `window.open`.
		*/
		async function connect() {
			if (!connectUrl.value) return;
			telemetry.trackDirectConnectRequested();
			await attempt(connectUrl.value);
			if (status.value === "unsupported") openConnectPage();
		}
		function openConnectPage() {
			if (!connectUrl.value) return;
			telemetry.trackOpenExtensionClicked();
			const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - CONNECT_POPUP_WIDTH) / 2));
			const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - CONNECT_POPUP_HEIGHT) / 2));
			window.open(connectUrl.value, "n8n-browser-use-connect", `popup,width=${CONNECT_POPUP_WIDTH},height=${CONNECT_POPUP_HEIGHT},left=${left},top=${top}`);
		}
		onBeforeUnmount(() => {
			clearRefreshTimer();
			store.clearBrowserConnectUrl();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.passthrough) }, [createVNode(unref(N8nText_default), {
				bold: true,
				size: "small"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.step.connect.title")), 1)]),
				_: 1
			}), inFlightTextKey.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.waiting),
				"data-test-id": "browser-use-direct-connect-waiting"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "spinner",
				color: "primary",
				spin: "",
				size: "small"
			}), createVNode(unref(N8nText_default), {
				color: "text-light",
				size: "small"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(inFlightTextKey.value)), 1)]),
				_: 1
			})], 2)) : unref(status) === "failed" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nText_default), {
				color: "text-light",
				size: "small"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.directConnect.failed")), 1)]),
				_: 1
			}), createVNode(unref(N8nButton_default), {
				label: unref(i18n).baseText("instanceAi.browserUse.directConnect.retry"),
				variant: "solid",
				size: "medium",
				"data-test-id": "browser-use-direct-connect-retry",
				onClick: connect
			}, null, 8, ["label"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nText_default), {
				color: "text-light",
				size: "small"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.step.connect.description")), 1)]),
				_: 1
			}), createVNode(unref(N8nButton_default), {
				label: unref(i18n).baseText("instanceAi.browserUse.step.connect.cta"),
				variant: "solid",
				size: "medium",
				disabled: !connectUrl.value,
				"data-test-id": "browser-use-open-connect-page",
				onClick: connect
			}, null, 8, ["label", "disabled"])], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	passthrough: "_passthrough_1g6eg_1",
	waiting: "_waiting_1g6eg_5"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/utils/browserUseExtension.ts
var EXTENSION_CONNECT_PAGE_URL = `chrome-extension://${BROWSER_USE_EXTENSION_ID}/connect.html`;
var PROBEABLE_LOCAL_HOSTS = ["localhost", "127.0.0.1"];
var PROBEABLE_CLOUD_HOST = /\.(stage-)?app\.n8n\.cloud$/;
/**
* Mirrors `web_accessible_resources.matches` in the extension manifest, and must stay a
* subset of it: probing an origin the manifest does not cover reports a confident
* "not installed" to users who do have the extension.
*/
function isProbeableOrigin() {
	const { hostname, protocol } = window.location;
	if (protocol !== "http:" && protocol !== "https:") return false;
	if (PROBEABLE_LOCAL_HOSTS.includes(hostname)) return true;
	return protocol === "https:" && PROBEABLE_CLOUD_HOST.test(hostname);
}
/**
* Uncovered origins report `unknown` rather than being probed, so the flow stays available
* where detection is impossible. A rejection reports `not-installed`, which is not airtight:
* a disabled extension or a restrictive `Content-Security-Policy` also reject.
*/
async function detectBrowserUseExtension() {
	if (!isProbeableOrigin()) return "unknown";
	try {
		return (await fetch(EXTENSION_CONNECT_PAGE_URL, { method: "HEAD" })).ok ? "installed" : "unknown";
	} catch {
		return "not-installed";
	}
}
//#endregion
//#region src/features/ai/instanceAi/components/modals/BrowserUseSetupContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var BrowserUseSetupContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "BrowserUseSetupContent",
	props: {
		embedded: {
			type: Boolean,
			default: false
		},
		autoConnect: {
			type: Boolean,
			default: false
		}
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const store = useInstanceAiSettingsStore();
		const telemetry = useInstanceAiBrowserUseTelemetry();
		const { onDocumentVisible } = useDocumentVisibility();
		const isBrowserSupported = isBrowserUseSupportedForBrowser();
		const isConnected = computed(() => store.browserConnected);
		const statusChecked = ref(false);
		const extensionState = ref("unknown");
		const isExtensionMissing = computed(() => extensionState.value === "not-installed");
		const isExtensionInstalled = computed(() => extensionState.value === "installed");
		let isProbingExtension = false;
		async function refreshExtensionState() {
			if (!isBrowserSupported || store.browserConnected || isProbingExtension) return;
			isProbingExtension = true;
			try {
				extensionState.value = await detectBrowserUseExtension();
			} finally {
				isProbingExtension = false;
			}
		}
		onMounted(async () => {
			if (!isBrowserSupported) return;
			await Promise.all([refreshExtensionState(), store.fetchBrowserStatus()]);
			statusChecked.value = true;
		});
		const reprobeExtension = () => {
			refreshExtensionState();
		};
		onDocumentVisible(reprobeExtension);
		useEventListener(window, "focus", reprobeExtension);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.body, props.embedded && _ctx.$style.bodyEmbedded]) }, [!unref(isBrowserSupported) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nCallout_default), {
				theme: "warning",
				"data-test-id": "browser-use-unsupported-browser"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.unsupportedBrowser")), 1)]),
				_: 1
			}), !props.embedded ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.footer)
			}, [createVNode(unref(N8nButton_default), {
				label: unref(i18n).baseText("generic.close"),
				variant: "outline",
				size: "medium",
				"data-test-id": "browser-use-unsupported-close",
				onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
			}, null, 8, ["label"])], 2)) : createCommentVNode("", true)], 64)) : isConnected.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.statusRow) }, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.statusDot, _ctx.$style.statusDotConnected]) }, null, 2), createVNode(unref(N8nText_default), {
				size: "small",
				bold: true
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.connected")), 1)]),
				_: 1
			})], 2), createVNode(unref(N8nText_default), {
				color: "text-light",
				class: normalizeClass(_ctx.$style.description)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.connected.description")), 1)]),
				_: 1
			}, 8, ["class"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
				createVNode(unref(N8nText_default), {
					color: "text-light",
					class: normalizeClass(_ctx.$style.description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.modal.description")), 1)]),
					_: 1
				}, 8, ["class"]),
				!isExtensionInstalled.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.step)
				}, [
					createVNode(unref(N8nText_default), {
						bold: true,
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.step.extension.title")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.step.extension.description")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nButton_default), {
						label: unref(i18n).baseText("instanceAi.browserUse.step.extension.cta"),
						href: unref(CHROME_EXTENSION_URL),
						target: "_blank",
						variant: isExtensionMissing.value ? "solid" : "outline",
						size: "medium",
						icon: "external-link",
						"data-test-id": "browser-use-install-extension",
						onClick: unref(telemetry).trackInstallExtensionClicked
					}, null, 8, [
						"label",
						"href",
						"variant",
						"onClick"
					])
				], 2)) : createCommentVNode("", true),
				isExtensionMissing.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.step)
				}, [createVNode(unref(N8nText_default), {
					bold: true,
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.step.connect.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small",
					"data-test-id": "browser-use-extension-missing-note"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.step.connect.extensionMissing")), 1)]),
					_: 1
				})], 2)) : statusChecked.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.step)
				}, [createVNode(BrowserUseConnectStep_default, { "auto-connect": props.autoConnect }, null, 8, ["auto-connect"])], 2)) : createCommentVNode("", true)
			], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_7e2lg_1",
	bodyEmbedded: "_bodyEmbedded_7e2lg_7",
	description: "_description_7e2lg_11",
	step: "_step_7e2lg_16",
	footer: "_footer_7e2lg_26",
	statusRow: "_statusRow_7e2lg_31",
	statusDot: "_statusDot_7e2lg_37",
	statusDotConnected: "_statusDotConnected_7e2lg_44"
} }]]);
//#endregion
export { BrowserUseSetupContent_default as t };
