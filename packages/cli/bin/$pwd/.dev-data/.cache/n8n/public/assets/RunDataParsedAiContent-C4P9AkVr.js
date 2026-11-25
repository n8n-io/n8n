import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, mr as VueMarkdown, ns as core_default } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, Vr as useClipboard, cr as TextWithHighlights_default, dC as useToast, jN as useI18n, vN as N8nIconButton_default } from "./app-D5flEmb-.js";
import { t as createSearchHighlightPlugin } from "./utils-BURAX59V.js";
//#region src/features/ndv/runData/components/RunDataParsedAiContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-content-type"];
var RunDataParsedAiContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunDataParsedAiContent",
	props: {
		content: {},
		compact: {
			type: Boolean,
			default: false
		},
		search: {},
		renderType: {}
	},
	setup(__props) {
		const i18n = useI18n();
		const clipboard = useClipboard();
		const { showMessage } = useToast();
		const vueMarkdownPlugins = computed(() => [createSearchHighlightPlugin(__props.search)]);
		function isJsonString(text) {
			try {
				JSON.parse(text);
				return true;
			} catch (e) {
				return false;
			}
		}
		const markdownOptions = { highlight(str, lang) {
			if (lang && core_default.getLanguage(lang)) try {
				return core_default.highlight(str, { language: lang }).value;
			} catch {}
		} };
		function isMarkdown(jsonMarkdown) {
			if (typeof jsonMarkdown !== "string") return false;
			return [
				/^# .+/gm,
				/\*{1,2}.+\*{1,2}/g,
				/\[.+\]\(.+\)/g,
				/```[\s\S]+```/g
			].some((pattern) => pattern.test(jsonMarkdown));
		}
		function formatToJsonMarkdown(data) {
			return "```json\n" + data + "\n```";
		}
		function jsonToMarkdown(data) {
			if (isMarkdown(data)) return data;
			if (Array.isArray(data) && data.length && typeof data[0] !== "number") return data.map((item) => jsonToMarkdown(item)).join("\n\n").trim();
			if (typeof data === "string") {
				if (isJsonString(data)) return formatToJsonMarkdown(data);
				return data;
			}
			return formatToJsonMarkdown(JSON.stringify(data, null, 2));
		}
		function onCopyToClipboard(object) {
			try {
				clipboard.copy(JSON.stringify(object, void 0, 2));
				showMessage({
					title: i18n.baseText("generic.copiedToClipboard"),
					type: "success"
				});
			} catch {}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.component, __props.compact ? _ctx.$style.compact : ""]) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.content, ({ parsedContent, raw }, index) => {
				return openBlock(), createElementBlock("div", {
					key: index,
					class: normalizeClass(_ctx.$style.contentText),
					"data-content-type": parsedContent?.type
				}, [parsedContent && __props.renderType === "rendered" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [parsedContent.type === "json" ? (openBlock(), createBlock(unref(VueMarkdown), {
					key: 0,
					source: jsonToMarkdown(parsedContent.data),
					class: normalizeClass(_ctx.$style.markdown),
					options: markdownOptions,
					plugins: vueMarkdownPlugins.value
				}, null, 8, [
					"source",
					"class",
					"plugins"
				])) : parsedContent.type === "markdown" ? (openBlock(), createBlock(unref(VueMarkdown), {
					key: 1,
					source: parsedContent.data,
					class: normalizeClass(_ctx.$style.markdown),
					options: markdownOptions,
					plugins: vueMarkdownPlugins.value
				}, null, 8, [
					"source",
					"class",
					"plugins"
				])) : parsedContent.type === "text" ? (openBlock(), createBlock(TextWithHighlights_default, {
					key: 2,
					class: normalizeClass(_ctx.$style.runText),
					content: String(parsedContent.data),
					search: __props.search
				}, null, 8, [
					"class",
					"content",
					"search"
				])) : createCommentVNode("", true)], 64)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.rawContent)
				}, [createVNode(unref(N8nIconButton_default), {
					variant: "outline",
					size: "small",
					class: normalizeClass(_ctx.$style.copyToClipboard),
					title: unref(i18n).baseText("nodeErrorView.copyToClipboard"),
					icon: "files",
					onClick: ($event) => onCopyToClipboard(raw)
				}, null, 8, [
					"class",
					"title",
					"onClick"
				]), createVNode(unref(VueMarkdown), {
					source: jsonToMarkdown(raw),
					class: normalizeClass(_ctx.$style.markdown),
					plugins: vueMarkdownPlugins.value
				}, null, 8, [
					"source",
					"class",
					"plugins"
				])], 2))], 10, _hoisted_1);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	runText: "_runText_1myg2_1",
	markdown: "_markdown_1myg2_6",
	compact: "_compact_1myg2_29",
	copyToClipboard: "_copyToClipboard_1myg2_37",
	rawContent: "_rawContent_1myg2_47",
	contentText: "_contentText_1myg2_51"
} }]]);
//#endregion
export { RunDataParsedAiContent_default as t };
