import { RunnableCallable } from "../utils.js";
import { Send } from "../constants.js";
import { Runnable, RunnableConfig, RunnableLike } from "@langchain/core/runnables";

//#region src/pregel/write.d.ts

/**
 * Mapping of write channels to Runnables that return the value to be written,
 * or None to skip writing.
 */
declare class ChannelWrite<
// eslint-disable-next-line @typescript-eslint/no-explicit-any
RunInput = any> extends RunnableCallable<RunInput, RunInput> {
  writes: Array<ChannelWriteEntry | ChannelWriteTupleEntry | Send>;
  constructor(writes: Array<ChannelWriteEntry | ChannelWriteTupleEntry | Send>, tags?: string[]);
  _write(input: unknown, config: RunnableConfig): Promise<unknown>;
  // TODO: Support requireAtLeastOneOf
  static doWrite(config: RunnableConfig, writes: (ChannelWriteEntry | ChannelWriteTupleEntry | Send)[]): Promise<void>;
  static isWriter(runnable: RunnableLike): runnable is ChannelWrite;
  static registerWriter<T extends Runnable>(runnable: T): T;
}
interface ChannelWriteEntry {
  channel: string;
  value: unknown;
  skipNone?: boolean;
  mapper?: Runnable;
}
interface ChannelWriteTupleEntry {
  value: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapper: Runnable<any, [string, any][]>;
}
//#endregion
export { ChannelWrite };
//# sourceMappingURL=write.d.ts.map