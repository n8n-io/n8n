import { LLMChain } from "../../../chains/llm_chain.js";
import { ZeroShotAgent } from "../../mrkl/index.js";
import { AgentExecutor } from "../../executor.js";
import { JsonToolkit, createJsonAgent } from "../json/json.js";
import { JSON_EXPLORER_DESCRIPTION, OPENAPI_PREFIX, OPENAPI_SUFFIX } from "./prompt.js";
import { RequestsGetTool, RequestsPostTool } from "../../../tools/requests.js";
import { BaseToolkit, DynamicTool } from "@langchain/core/tools";

//#region src/agents/toolkits/openapi/openapi.ts
/**
* Represents a toolkit for making HTTP requests. It initializes the
* request tools based on the provided headers.
*/
var RequestsToolkit = class extends BaseToolkit {
	tools;
	constructor(headers) {
		super();
		this.tools = [new RequestsGetTool(headers), new RequestsPostTool(headers)];
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
		const jsonAgent = createJsonAgent(llm, new JsonToolkit(jsonSpec));
		this.tools = [...this.tools, new DynamicTool({
			name: "json_explorer",
			func: async (input) => {
				const result = await jsonAgent.call({ input });
				return result.output;
			},
			description: JSON_EXPLORER_DESCRIPTION
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
	const { prefix = OPENAPI_PREFIX, suffix = OPENAPI_SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = openApiToolkit;
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables
	});
	const chain = new LLMChain({
		prompt,
		llm
	});
	const toolNames = tools.map((tool) => tool.name);
	const agent = new ZeroShotAgent({
		llmChain: chain,
		allowedTools: toolNames
	});
	return AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
export { OpenApiToolkit, RequestsToolkit, createOpenApiAgent };
//# sourceMappingURL=openapi.js.map