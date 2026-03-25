import { JsonSpec } from "../../../tools/json.cjs";
import { ZeroShotCreatePromptArgs } from "../../mrkl/index.cjs";
import { AgentExecutor } from "../../executor.cjs";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseToolkit, ToolInterface } from "@langchain/core/tools";

//#region src/agents/toolkits/json/json.d.ts

/**
 * Represents a toolkit for working with JSON data. It initializes the
 * JSON tools based on the provided JSON specification.
 * @example
 * ```typescript
 * const toolkit = new JsonToolkit(new JsonSpec());
 * const executor = createJsonAgent(model, toolkit);
 * const result = await executor.invoke({
 *   input: 'What are the required parameters in the request body to the /completions endpoint?'
 * });
 * ```
 */
declare class JsonToolkit extends BaseToolkit {
  jsonSpec: JsonSpec;
  tools: ToolInterface[];
  constructor(jsonSpec: JsonSpec);
}
/**
 * Creates a JSON agent using a language model, a JSON toolkit, and
 * optional prompt arguments. It creates a prompt for the agent using the
 * JSON tools and the provided prefix and suffix. It then creates a
 * ZeroShotAgent with the prompt and the JSON tools, and returns an
 * AgentExecutor for executing the agent with the tools.
 * @param llm The language model used to create the JSON agent.
 * @param toolkit The JSON toolkit used to create the JSON agent.
 * @param args Optional prompt arguments used to create the JSON agent.
 * @returns An AgentExecutor for executing the created JSON agent with the tools.
 */
declare function createJsonAgent(llm: BaseLanguageModelInterface, toolkit: JsonToolkit, args?: ZeroShotCreatePromptArgs): AgentExecutor;
//#endregion
export { JsonToolkit, createJsonAgent };
//# sourceMappingURL=json.d.cts.map