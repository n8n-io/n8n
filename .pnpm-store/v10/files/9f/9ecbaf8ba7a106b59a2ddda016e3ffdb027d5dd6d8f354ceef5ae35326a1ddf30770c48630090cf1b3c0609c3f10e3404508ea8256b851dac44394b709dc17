import { JsonSpec } from "../../../tools/json.cjs";
import { ZeroShotCreatePromptArgs } from "../../mrkl/index.cjs";
import { AgentExecutor } from "../../executor.cjs";
import { Headers } from "../../../tools/requests.cjs";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseToolkit, ToolInterface } from "@langchain/core/tools";

//#region src/agents/toolkits/openapi/openapi.d.ts

/**
 * Represents a toolkit for making HTTP requests. It initializes the
 * request tools based on the provided headers.
 */
declare class RequestsToolkit extends BaseToolkit {
  tools: ToolInterface[];
  constructor(headers?: Headers);
}
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
declare class OpenApiToolkit extends RequestsToolkit {
  constructor(jsonSpec: JsonSpec, llm: BaseLanguageModelInterface, headers?: Headers);
}
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
declare function createOpenApiAgent(llm: BaseLanguageModelInterface, openApiToolkit: OpenApiToolkit, args?: ZeroShotCreatePromptArgs): AgentExecutor;
//#endregion
export { OpenApiToolkit, RequestsToolkit, createOpenApiAgent };
//# sourceMappingURL=openapi.d.cts.map