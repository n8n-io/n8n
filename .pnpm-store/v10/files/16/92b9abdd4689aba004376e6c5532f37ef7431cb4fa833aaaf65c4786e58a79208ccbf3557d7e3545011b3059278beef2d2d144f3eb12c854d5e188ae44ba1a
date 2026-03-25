import { __export } from "../../_virtual/rolldown_runtime.js";

//#region src/agents/format_scratchpad/xml.ts
var xml_exports = {};
__export(xml_exports, { formatXml: () => formatXml });
function formatXml(intermediateSteps) {
	let log = "";
	for (const step of intermediateSteps) {
		const { action, observation } = step;
		log += `<tool>${action.tool}</tool><tool_input>${action.toolInput}\n</tool_input><observation>${observation}</observation>`;
	}
	return log;
}

//#endregion
export { formatXml, xml_exports };
//# sourceMappingURL=xml.js.map