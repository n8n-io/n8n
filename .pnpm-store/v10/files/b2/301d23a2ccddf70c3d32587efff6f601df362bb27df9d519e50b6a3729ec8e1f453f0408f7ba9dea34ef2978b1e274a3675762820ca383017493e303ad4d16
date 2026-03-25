import { LLMChain, LLMChainInput } from "../../chains/llm_chain.cjs";

//#region src/experimental/babyagi/task_execution.d.ts
/** Chain to execute tasks. */
declare class TaskExecutionChain extends LLMChain {
  static lc_name(): string;
  /**
   * A static factory method that creates an instance of TaskExecutionChain.
   * It constructs a prompt template for task execution, which is then used
   * to create a new instance of TaskExecutionChain. The prompt template
   * instructs an AI to perform a task based on a given objective, taking
   * into account previously completed tasks.
   * @param fields An object of type LLMChainInput, excluding the "prompt" field.
   * @returns An instance of LLMChain.
   */
  static fromLLM(fields: Omit<LLMChainInput, "prompt">): LLMChain;
}
//#endregion
export { TaskExecutionChain };
//# sourceMappingURL=task_execution.d.cts.map