const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_tool_calling = require('./tool_calling.cjs');

//#region src/agents/format_scratchpad/openai_tools.ts
var openai_tools_exports = {};
require_rolldown_runtime.__export(openai_tools_exports, { formatToOpenAIToolMessages: () => require_tool_calling.formatToToolMessages });

//#endregion
exports.formatToOpenAIToolMessages = require_tool_calling.formatToToolMessages;
Object.defineProperty(exports, 'openai_tools_exports', {
  enumerable: true,
  get: function () {
    return openai_tools_exports;
  }
});
//# sourceMappingURL=openai_tools.cjs.map