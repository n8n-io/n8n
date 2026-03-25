import { SerializedBaseChain } from "../../chains/serde.js";
import { BaseChain, ChainInputs } from "../../chains/base.js";
import { Optional } from "../../types/type-utils.js";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";
import { VectorStoreInterface } from "@langchain/core/vectorstores";

//#region src/experimental/babyagi/agent.d.ts

/**
 * Interface defining the structure of a task. A task has a `taskID` and a
 * `taskName`.
 */
interface Task {
  taskID: string;
  taskName: string;
}
/**
 * Interface defining the structure of the inputs for the `BabyAGI` class.
 * It extends the `ChainInputs` interface, omitting the 'memory' and
 * 'callbackManager' properties, and adds properties specific to
 * `BabyAGI`.
 */
interface BabyAGIInputs extends Omit<ChainInputs, "memory" | "callbackManager"> {
  creationChain: BaseChain;
  prioritizationChain: BaseChain;
  executionChain: BaseChain;
  vectorstore: VectorStoreInterface;
  maxIterations?: number;
}
/**
 * Class responsible for managing tasks, including their creation,
 * prioritization, and execution. It uses three chains for these
 * operations: `creationChain`, `prioritizationChain`, and
 * `executionChain`.
 * @example
 * ```typescript
 * const babyAGI = BabyAGI.fromLLM({
 *   llm: new OpenAI({ temperature: 0 }),
 *   vectorstore: new MemoryVectorStore(new OpenAIEmbeddings()),
 *   maxIterations: 3,
 * });
 *
 * const result = await babyAGI.call({
 *   objective: "Write a weather report for SF today",
 * });
 * ```
 */
declare class BabyAGI extends BaseChain implements BabyAGIInputs {
  static lc_name(): string;
  taskList: Task[];
  creationChain: BaseChain;
  prioritizationChain: BaseChain;
  executionChain: BaseChain;
  taskIDCounter: number;
  vectorstore: VectorStoreInterface;
  maxIterations: number;
  constructor({
    creationChain,
    prioritizationChain,
    executionChain,
    vectorstore,
    maxIterations,
    verbose,
    callbacks
  }: BabyAGIInputs);
  _chainType(): "BabyAGI";
  get inputKeys(): string[];
  get outputKeys(): never[];
  /**
   * Adds a task to the task list.
   * @param task The task to be added.
   * @returns Promise resolving to void.
   */
  addTask(task: Task): Promise<void>;
  /**
   * Prints the current task list to the console.
   * @returns void
   */
  printTaskList(): void;
  /**
   * Prints the next task to the console.
   * @param task The next task to be printed.
   * @returns void
   */
  printNextTask(task: Task): void;
  /**
   * Prints the result of a task to the console.
   * @param result The result of the task.
   * @returns void
   */
  printTaskResult(result: string): void;
  /**
   * Generates the next tasks based on the result of the previous task, the
   * task description, and the objective.
   * @param result The result of the previous task.
   * @param task_description The description of the task.
   * @param objective The objective of the task.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns Promise resolving to an array of tasks without taskID.
   */
  getNextTasks(result: string, task_description: string, objective: string, runManager?: CallbackManagerForChainRun): Promise<Optional<Task, "taskID">[]>;
  /**
   * Prioritizes the tasks based on the current task ID and the objective.
   * @param thisTaskID The ID of the current task.
   * @param objective The objective of the task.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns Promise resolving to an array of prioritized tasks.
   */
  prioritizeTasks(thisTaskID: number, objective: string, runManager?: CallbackManagerForChainRun): Promise<{
    taskID: string;
    taskName: string;
  }[]>;
  /**
   * Retrieves the top tasks that are most similar to the given query.
   * @param query The query to search for.
   * @param k The number of top tasks to retrieve.
   * @returns Promise resolving to an array of top tasks.
   */
  getTopTasks(query: string, k?: number): Promise<string[]>;
  /**
   * Executes a task based on the objective and the task description.
   * @param objective The objective of the task.
   * @param task The task to be executed.
   * @param runManager Optional CallbackManagerForChainRun instance.
   * @returns Promise resolving to the result of the task execution as a string.
   */
  executeTask(objective: string, task: string, runManager?: CallbackManagerForChainRun): Promise<string>;
  _call({
    objective,
    firstTask
  }: ChainValues, runManager?: CallbackManagerForChainRun): Promise<{}>;
  serialize(): SerializedBaseChain;
  /**
   * Static method to create a new BabyAGI instance from a
   * BaseLanguageModel.
   * @param llm BaseLanguageModel instance used to generate a new BabyAGI instance.
   * @param vectorstore VectorStore instance used to store and retrieve vectors.
   * @param executionChain Optional BaseChain instance used to execute tasks.
   * @param verbose Optional boolean indicating whether to log verbose output.
   * @param callbacks Optional callbacks to be used during the execution of tasks.
   * @param rest Optional additional parameters.
   * @returns A new instance of BabyAGI.
   */
  static fromLLM({
    llm,
    vectorstore,
    executionChain,
    verbose,
    callbacks,
    ...rest
  }: Optional<BabyAGIInputs, "executionChain" | "creationChain" | "prioritizationChain"> & {
    llm: BaseLanguageModelInterface;
  }): BabyAGI;
}
//#endregion
export { BabyAGI, BabyAGIInputs, Task };
//# sourceMappingURL=agent.d.ts.map