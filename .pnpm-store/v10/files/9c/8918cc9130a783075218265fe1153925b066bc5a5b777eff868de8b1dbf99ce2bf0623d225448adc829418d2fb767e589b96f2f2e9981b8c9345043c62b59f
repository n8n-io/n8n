import { LLMChain, LLMChainInput } from "../../chains/llm_chain.cjs";

//#region src/experimental/babyagi/task_creation.d.ts
/** Chain to generate tasks. */
declare class TaskCreationChain extends LLMChain {
  static lc_name(): string;
  /**
   * Creates a new TaskCreationChain instance. It takes an object of type
   * LLMChainInput as input, omitting the 'prompt' field. It uses the
   * PromptTemplate class to create a new prompt based on the task creation
   * template and the input variables. The new TaskCreationChain instance is
   * then created with this prompt and the remaining fields from the input
   * object.
   * @param fields An object of type LLMChainInput, omitting the 'prompt' field.
   * @returns A new instance of TaskCreationChain.
   */
  static fromLLM(fields: Omit<LLMChainInput, "prompt">): LLMChain;
}
//#endregion
export { TaskCreationChain };
//# sourceMappingURL=task_creation.d.cts.map