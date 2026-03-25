const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_generative_agent_memory = require('./generative_agent_memory.cjs');
const require_generative_agent = require('./generative_agent.cjs');

//#region src/experimental/generative_agents/index.ts
var generative_agents_exports = {};
require_rolldown_runtime.__export(generative_agents_exports, {
	GenerativeAgent: () => require_generative_agent.GenerativeAgent,
	GenerativeAgentMemory: () => require_generative_agent_memory.GenerativeAgentMemory
});

//#endregion
exports.GenerativeAgent = require_generative_agent.GenerativeAgent;
exports.GenerativeAgentMemory = require_generative_agent_memory.GenerativeAgentMemory;
Object.defineProperty(exports, 'generative_agents_exports', {
  enumerable: true,
  get: function () {
    return generative_agents_exports;
  }
});
//# sourceMappingURL=index.cjs.map