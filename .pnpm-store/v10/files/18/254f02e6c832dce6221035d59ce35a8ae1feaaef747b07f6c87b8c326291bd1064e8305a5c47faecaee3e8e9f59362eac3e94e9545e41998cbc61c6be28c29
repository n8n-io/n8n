const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../../../chains/llm_chain.cjs');
const require_index = require('../../mrkl/index.cjs');
const require_executor = require('../../executor.cjs');
const require_json = require('../json/json.cjs');
const require_prompt = require('./prompt.cjs');
const require_requests = require('../../../tools/requests.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/agents/toolkits/openapi/openapi.ts
/**
* Represents a toolkit for making HTTP requests. It initializes the
* request tools based on the provided headers.
*/
var RequestsToolkit = class extends __langchain_core_tools.BaseToolkit {
	tools;
	constructor(headers) {
		super();
		this.tools = [new require_requests.RequestsGetTool(headers), new require_requests.RequestsPostTool(headers)];
	}
};
/**
* Extends the `RequestsToolkit` class and adds a dynamic tool for
* exploring JSON data. It creates a JSON agent using the `JsonToolkit`
* and the provided language model, and adds the JSON explorer tool to the
* toolkit.
* @example
* ```typescript
* const toolkit = new OpenApiToolkit(
*   new JsonSpec({
*   }),
*   new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*   {
*     "Content-Type": "application/json",
*     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
*   },
* );
*
* const result = await toolkit.invoke({
*   input:
*     "Make a POST request to openai /completions. The prompt should be 'tell me a joke.'",
* });
* console.log(`Got output ${result.output}`);
* ```
*/
var OpenApiToolkit = class extends RequestsToolkit {
	constructor(jsonSpec, llm, headers) {
		super(headers);
		const jsonAgent = require_json.createJsonAgent(llm, new require_json.JsonToolkit(jsonSpec));
		this.tools = [...this.tools, new __langchain_core_tools.DynamicTool({
			name: "json_explorer",
			func: async (input) => {
				const result = await jsonAgent.call({ input });
				return result.output;
			},
			description: require_prompt.JSON_EXPLORER_DESCRIPTION
		})];
	}
};
/**
* Creates an OpenAPI agent using a language model, an OpenAPI toolkit,
* and optional prompt arguments. It creates a prompt for the agent using
* the OpenAPI tools and the provided prefix and suffix. It then creates a
* ZeroShotAgent with the prompt and the OpenAPI tools, and returns an
* AgentExecutor for executing the agent with the tools.
* @param llm The language model to use.
* @param openApiToolkit The OpenAPI toolkit to use.
* @param args Optional arguments for creating the prompt.
* @returns An AgentExecutor for executing the agent with the tools.
*
* @security **Security Notice** This agent provides access to external APIs.
* Use with caution as this agent can make API calls with arbitrary headers.
* Exposing this agent to users could lead to security vulnerabilities. Consider
* limiting access to what endpoints it can hit, what actions can be taken, and
* more.
*
* @link See https://js.langchain.com/docs/security for more information.
*/
function createOpenApiAgent(llm, openApiToolkit, args) {
	const { prefix = require_prompt.OPENAPI_PREFIX, suffix = require_prompt.OPENAPI_SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = openApiToolkit;
	const prompt = require_index.ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables
	});
	const chain = new require_llm_chain.LLMChain({
		prompt,
		llm
	});
	const toolNames = tools.map((tool) => tool.name);
	const agent = new require_index.ZeroShotAgent({
		llmChain: chain,
		allowedTools: toolNames
	});
	return require_executor.AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
exports.OpenApiToolkit = OpenApiToolkit;
exports.RequestsToolkit = RequestsToolkit;
exports.createOpenApiAgent = createOpenApiAgent;
//# sourceMappingURL=openapi.cjs.map