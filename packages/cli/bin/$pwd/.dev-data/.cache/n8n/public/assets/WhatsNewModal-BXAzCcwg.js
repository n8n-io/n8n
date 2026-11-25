import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, LM as N8nCallout_default, Qj as N8nMarkdown_default, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Wy as RELEASE_NOTES_URL, _C as useUsersStore, _N as N8nText_default, cC as useVersionsStore, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jM as createEventBus, jN as useI18n, lC as VERSIONS_MODAL_KEY, uC as WHATS_NEW_MODAL_KEY, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/app/components/WhatsNewModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var _hoisted_1 = ["data-test-id"];
var WhatsNewModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WhatsNewModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const articleRefs = ref({});
		const pageRedirectionHelper = usePageRedirectionHelper();
		const i18n = useI18n();
		const modalBus = createEventBus();
		const versionsStore = useVersionsStore();
		const uiStore = useUIStore();
		const usersStore = useUsersStore();
		const telemetry = useTelemetry();
		const nextVersions = computed(() => versionsStore.nextVersions);
		const openUpdatesPanel = () => {
			uiStore.openModal(VERSIONS_MODAL_KEY);
		};
		const onUpdateClick = async () => {
			telemetry.track("User clicked on update button", { source: "whats-new-modal" });
			await pageRedirectionHelper.goToVersions();
		};
		const scrollToItem = async (articleId) => {
			await nextTick(() => {
				const target = articleRefs.value[articleId];
				if (!target) return;
				target.scrollIntoView({
					behavior: "smooth",
					block: "start"
				});
			});
		};
		modalBus.on("opened", () => {
			versionsStore.closeWhatsNewCallout();
			for (const item of versionsStore.whatsNewArticles) if (!versionsStore.isWhatsNewArticleRead(item.id)) versionsStore.setWhatsNewArticleRead(item.id);
			scrollToItem(props.data.articleId);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				"max-width": "860px",
				"max-height": "85vh",
				"event-bus": unref(modalBus),
				name: unref(WHATS_NEW_MODAL_KEY),
				center: true
			}, {
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.column) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.row) }, [createVNode(unref(N8nIcon_default), {
					icon: "bell",
					color: "primary",
					size: "large"
				}), createVNode(unref(N8nHeading_default), { size: "xlarge" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(versionsStore).whatsNew.title), 1)]),
					_: 1
				})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.row) }, [createVNode(unref(N8nHeading_default), {
					size: "medium",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(import_dateformat.default)(unref(versionsStore).latestVersion.createdAt, `d mmmm, yyyy`)), 1)]),
					_: 1
				}), unref(versionsStore).hasVersionUpdates ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nText_default), {
					size: "medium",
					class: normalizeClass(_ctx.$style.text),
					color: "text-base"
				}, {
					default: withCtx(() => [..._cache[0] || (_cache[0] = [createTextVNode("•", -1)])]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nLink_default), {
					size: "medium",
					theme: "primary",
					"data-test-id": "whats-new-modal-next-versions-link",
					onClick: openUpdatesPanel
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("whatsNew.versionsBehind", { interpolate: { count: nextVersions.value.length > 99 ? "99+" : nextVersions.value.length } })), 1)]),
					_: 1
				})], 64)) : createCommentVNode("", true)], 2)], 2), unref(versionsStore).hasVersionUpdates ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					disabled: unref(usersStore).canUserUpdateVersion,
					content: unref(i18n).baseText("whatsNew.updateNudgeTooltip"),
					placement: "bottom"
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						size: "large",
						label: unref(i18n).baseText("whatsNew.update"),
						disabled: !unref(usersStore).canUserUpdateVersion,
						"data-test-id": "whats-new-modal-update-button",
						onClick: onUpdateClick
					}, null, 8, ["label", "disabled"])]),
					_: 1
				}, 8, ["disabled", "content"])) : createCommentVNode("", true)], 2)]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [
					unref(versionsStore).hasSignificantUpdates ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.callout),
						theme: "warning"
					}, {
						default: withCtx(() => [renderSlot(_ctx.$slots, "callout-message", {}, () => [createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("whatsNew.updateAvailable", { interpolate: {
								currentVersion: unref(versionsStore).currentVersion?.name ?? "unknown",
								latestVersion: unref(versionsStore).latestVersion?.name,
								count: nextVersions.value.length
							} })) + " ", 1), createVNode(unref(N8nLink_default), {
								size: "small",
								underline: true,
								theme: "primary",
								to: unref(RELEASE_NOTES_URL),
								target: "_blank"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("whatsNew.updateAvailable.changelogLink")), 1)]),
								_: 1
							}, 8, ["to"])]),
							_: 1
						})])]),
						_: 3
					}, 8, ["class"])) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment, null, renderList(unref(versionsStore).whatsNewArticles, (item) => {
						return openBlock(), createElementBlock("div", {
							ref_for: true,
							ref: (el) => {
								if (el) articleRefs.value[item.id] = el;
							},
							key: item.id,
							class: normalizeClass(_ctx.$style.article),
							"data-test-id": `whats-new-item-${item.id}`
						}, [createVNode(unref(N8nHeading_default), {
							bold: "",
							tag: "h2",
							size: "xlarge"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(item.title), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nMarkdown_default), {
							content: item.content,
							class: normalizeClass(_ctx.$style.markdown),
							options: {
								markdown: {
									html: true,
									linkify: true,
									typographer: true,
									breaks: true
								},
								tasklists: { enabled: false },
								linkAttributes: { attrs: {
									target: "_blank",
									rel: "noopener"
								} },
								youtube: {
									width: "100%",
									height: "315"
								}
							}
						}, null, 8, ["content", "class"])], 10, _hoisted_1);
					}), 128)),
					unref(versionsStore).whatsNew.footer ? (openBlock(), createBlock(unref(N8nMarkdown_default), {
						key: 1,
						content: unref(versionsStore).whatsNew.footer,
						class: normalizeClass(_ctx.$style.markdown),
						options: {
							markdown: {
								html: true,
								linkify: true,
								typographer: true,
								breaks: true
							},
							tasklists: { enabled: false },
							linkAttributes: { attrs: {
								target: "_blank",
								rel: "noopener"
							} },
							youtube: {
								width: "100%",
								height: "315"
							}
						}
					}, null, 8, ["content", "class"])) : createCommentVNode("", true)
				], 2)]),
				_: 3
			}, 8, ["event-bus", "name"]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_ygylk_1",
	column: "_column_ygylk_14",
	row: "_row_ygylk_20",
	container: "_container_ygylk_27",
	article: "_article_ygylk_38",
	markdown: "_markdown_ygylk_42"
} }]]);
//#endregion
export { WhatsNewModal_default as default };
