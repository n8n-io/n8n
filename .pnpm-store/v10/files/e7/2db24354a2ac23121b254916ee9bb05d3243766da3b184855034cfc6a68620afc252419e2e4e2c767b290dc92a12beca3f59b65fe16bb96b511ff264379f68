import { CallbackManagerForChainRun } from "../callbacks/manager.cjs";
import { RunnableConfig } from "./types.cjs";
import { Runnable, RunnableLike } from "./base.cjs";

//#region src/runnables/branch.d.ts
/**
 * Type for a branch in the RunnableBranch. It consists of a condition
 * runnable and a branch runnable. The condition runnable is used to
 * determine whether the branch should be executed, and the branch runnable
 * is executed if the condition is true.
 */
type Branch<RunInput, RunOutput> = [Runnable<RunInput, boolean>, Runnable<RunInput, RunOutput>];
type BranchLike<RunInput, RunOutput> = [RunnableLike<RunInput, boolean>, RunnableLike<RunInput, RunOutput>];
/**
 * Class that represents a runnable branch. The RunnableBranch is
 * initialized with an array of branches and a default branch. When invoked,
 * it evaluates the condition of each branch in order and executes the
 * corresponding branch if the condition is true. If none of the conditions
 * are true, it executes the default branch.
 * @example
 * ```typescript
 * const branch = RunnableBranch.from([
 *   [
 *     (x: { topic: string; question: string }) =>
 *       x.topic.toLowerCase().includes("anthropic"),
 *     anthropicChain,
 *   ],
 *   [
 *     (x: { topic: string; question: string }) =>
 *       x.topic.toLowerCase().includes("langchain"),
 *     langChainChain,
 *   ],
 *   generalChain,
 * ]);
 *
 * const fullChain = RunnableSequence.from([
 *   {
 *     topic: classificationChain,
 *     question: (input: { question: string }) => input.question,
 *   },
 *   branch,
 * ]);
 *
 * const result = await fullChain.invoke({
 *   question: "how do I use LangChain?",
 * });
 * ```
 */
declare class RunnableBranch<RunInput = any, RunOutput = any> extends Runnable<RunInput, RunOutput> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  default: Runnable<RunInput, RunOutput>;
  branches: Branch<RunInput, RunOutput>[];
  constructor(fields: {
    branches: Branch<RunInput, RunOutput>[];
    default: Runnable<RunInput, RunOutput>;
  });
  /**
   * Convenience method for instantiating a RunnableBranch from
   * RunnableLikes (objects, functions, or Runnables).
   *
   * Each item in the input except for the last one should be a
   * tuple with two items. The first is a "condition" RunnableLike that
   * returns "true" if the second RunnableLike in the tuple should run.
   *
   * The final item in the input should be a RunnableLike that acts as a
   * default branch if no other branches match.
   *
   * @example
   * ```ts
   * import { RunnableBranch } from "@langchain/core/runnables";
   *
   * const branch = RunnableBranch.from([
   *   [(x: number) => x > 0, (x: number) => x + 1],
   *   [(x: number) => x < 0, (x: number) => x - 1],
   *   (x: number) => x
   * ]);
   * ```
   * @param branches An array where the every item except the last is a tuple of [condition, runnable]
   *   pairs. The last item is a default runnable which is invoked if no other condition matches.
   * @returns A new RunnableBranch.
   */
  static from<RunInput = any, RunOutput = any>(branches: [...BranchLike<RunInput, RunOutput>[], RunnableLike<RunInput, RunOutput>]): RunnableBranch<RunInput, RunOutput>;
  _invoke(input: RunInput, config?: Partial<RunnableConfig>, runManager?: CallbackManagerForChainRun): Promise<RunOutput>;
  invoke(input: RunInput, config?: RunnableConfig): Promise<RunOutput>;
  _streamIterator(input: RunInput, config?: Partial<RunnableConfig>): AsyncGenerator<Awaited<RunOutput>, void, unknown>;
}
//#endregion
export { Branch, BranchLike, RunnableBranch };
//# sourceMappingURL=branch.d.cts.map