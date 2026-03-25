const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');

//#region src/agents/format_scratchpad/xml.ts
var xml_exports = {};
require_rolldown_runtime.__export(xml_exports, { formatXml: () => formatXml });
function formatXml(intermediateSteps) {
	let log = "";
	for (const step of intermediateSteps) {
		const { action, observation } = step;
		log += `<tool>${action.tool}</tool><tool_input>${action.toolInput}\n</tool_input><observation>${observation}</observation>`;
	}
	return log;
}

//#endregion
exports.formatXml = formatXml;
Object.defineProperty(exports, 'xml_exports', {
  enumerable: true,
  get: function () {
    return xml_exports;
  }
});
//# sourceMappingURL=xml.cjs.map