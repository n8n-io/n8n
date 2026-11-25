import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { ts as require_lib } from "./vendor-Hx42-oQF.js";
import { ZA as isRecord, lr as splitTextBySearch } from "./app-D5flEmb-.js";
//#region src/features/ndv/runData/components/ai/utils.ts
var import_lib = /* @__PURE__ */ __toESM(require_lib(), 1);
function getRespondingModelName(task) {
	return task.map((item) => item?.json?.response).filter(isRecord).flatMap((response) => Array.isArray(response.generations) ? response.generations.flat() : []).map((generation) => isRecord(generation) && isRecord(generation.generationInfo) ? generation.generationInfo.model_name : void 0).find((name) => typeof name === "string" && name.trim() !== "");
}
function getReferencedData(taskData) {
	const returnData = [];
	function addFunction(data, inOut) {
		if (!data) return;
		Object.keys(data).map((type) => {
			returnData.push({
				data: data[type][0],
				inOut,
				type,
				source: taskData.source,
				metadata: {
					executionTime: taskData.executionTime,
					startTime: taskData.startTime,
					subExecution: taskData.metadata?.subExecution
				}
			});
		});
	}
	addFunction(taskData.inputOverride, "input");
	addFunction(taskData.data, "output");
	return returnData;
}
function createHtmlFragmentWithSearchHighlight(text, search) {
	const escaped = (0, import_lib.escapeHtml)(text);
	return search ? splitTextBySearch(escaped, search).map((part) => part.isMatched ? `<mark>${part.content}</mark>` : part.content).join("") : escaped;
}
function createSearchHighlightPlugin(search) {
	return (md) => {
		md.renderer.rules.text = (tokens, idx) => createHtmlFragmentWithSearchHighlight(tokens[idx].content, search);
		md.renderer.rules.code_inline = (tokens, idx, _, __, slf) => `<code${slf.renderAttrs(tokens[idx])}>${createHtmlFragmentWithSearchHighlight(tokens[idx].content, search)}</code>`;
		md.renderer.rules.code_block = (tokens, idx, _, __, slf) => `<pre${slf.renderAttrs(tokens[idx])}><code>${createHtmlFragmentWithSearchHighlight(tokens[idx].content, search)}</code></pre>\n`;
		md.renderer.rules.fence = (tokens, idx, options, _, slf) => {
			const token = tokens[idx];
			const info = token.info ? md.utils.unescapeAll(token.info).trim() : "";
			let langName = "";
			let langAttrs = "";
			if (info) {
				const arr = info.split(/(\s+)/g);
				langName = arr[0];
				langAttrs = arr.slice(2).join("");
			}
			const highlighted = options.highlight?.(token.content, langName, langAttrs) ?? createHtmlFragmentWithSearchHighlight(token.content, search);
			if (highlighted.indexOf("<pre") === 0) return highlighted + "\n";
			return `<pre><code${slf.renderAttrs(token)}>${highlighted}</code></pre>\n`;
		};
	};
}
//#endregion
export { getReferencedData as n, getRespondingModelName as r, createSearchHighlightPlugin as t };
