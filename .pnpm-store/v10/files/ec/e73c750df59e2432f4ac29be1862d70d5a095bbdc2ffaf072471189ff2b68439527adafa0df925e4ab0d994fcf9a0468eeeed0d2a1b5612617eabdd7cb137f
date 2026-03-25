import { RunnableConfig } from "./types.cjs";
import { Runnable, RunnableAssign, RunnableMapLike } from "./base.cjs";

//#region src/runnables/passthrough.d.ts
type RunnablePassthroughFunc<RunInput = any> = ((input: RunInput) => void) | ((input: RunInput, config?: RunnableConfig) => void) | ((input: RunInput) => Promise<void>) | ((input: RunInput, config?: RunnableConfig) => Promise<void>);
/**
 * A runnable to passthrough inputs unchanged or with additional keys.
 *
 * This runnable behaves almost like the identity function, except that it
 * can be configured to add additional keys to the output, if the input is
 * an object.
 *
 * The example below demonstrates how to use `RunnablePassthrough to
 * passthrough the input from the `.invoke()`
 *
 * @example
 * ```typescript
 * const chain = RunnableSequence.from([
 *   {
 *     question: new RunnablePassthrough(),
 *     context: async () => loadContextFromStore(),
 *   },
 *   prompt,
 *   llm,
 *   outputParser,
 * ]);
 * const response = await chain.invoke(
 *   "I can pass a single string instead of an object since I'm using `RunnablePassthrough`."
 * );
 * ```
 */
declare class RunnablePassthrough<RunInput = any> extends Runnable<RunInput, RunInput> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  func?: RunnablePassthroughFunc<RunInput>;
  constructor(fields?: {
    func?: RunnablePassthroughFunc<RunInput>;
  });
  invoke(input: RunInput, options?: Partial<RunnableConfig>): Promise<RunInput>;
  transform(generator: AsyncGenerator<RunInput>, options: Partial<RunnableConfig>): AsyncGenerator<RunInput>;
  /**
   * A runnable that assigns key-value pairs to the input.
   *
   * The example below shows how you could use it with an inline function.
   *
   * @example
   * ```typescript
   * const prompt =
   *   PromptTemplate.fromTemplate(`Write a SQL query to answer the question using the following schema: {schema}
   * Question: {question}
   * SQL Query:`);
   *
   * // The `RunnablePassthrough.assign()` is used here to passthrough the input from the `.invoke()`
   * // call (in this example it's the question), along with any inputs passed to the `.assign()` method.
   * // In this case, we're passing the schema.
   * const sqlQueryGeneratorChain = RunnableSequence.from([
   *   RunnablePassthrough.assign({
   *     schema: async () => db.getTableInfo(),
   *   }),
   *   prompt,
   *   new ChatOpenAI({ model: "gpt-4o-mini" }).withConfig({ stop: ["\nSQLResult:"] }),
   *   new StringOutputParser(),
   * ]);
   * const result = await sqlQueryGeneratorChain.invoke({
   *   question: "How many employees are there?",
   * });
   * ```
   */
  static assign<RunInput extends Record<string, unknown> = Record<string, unknown>, RunOutput extends Record<string, unknown> = Record<string, unknown>>(mapping: RunnableMapLike<RunInput, RunOutput>): RunnableAssign<RunInput, RunInput & RunOutput>;
}
//#endregion
export { RunnablePassthrough };
//# sourceMappingURL=passthrough.d.cts.map