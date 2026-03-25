import { BaseChannel } from "./base.js";

//#region src/channels/topic.d.ts

/**
 * A configurable PubSub Topic.
 */
declare class Topic<Value> extends BaseChannel<Array<Value>, Value | Value[], [Value[], Value[]]> {
  lc_graph_name: string;
  unique: boolean;
  accumulate: boolean;
  seen: Set<Value>;
  values: Value[];
  constructor(fields?: {
    /**
     * Whether to only add unique values to the topic. If `true`, only unique values (using reference equality) will be added to the topic.
     */
    unique?: boolean;
    /**
     * Whether to accumulate values across steps. If `false`, the channel will be emptied after each step.
     */
    accumulate?: boolean;
  });
  fromCheckpoint(checkpoint?: [Value[], Value[]]): this;
  update(values: Array<Value | Value[]>): boolean;
  get(): Array<Value>;
  checkpoint(): [Value[], Value[]];
  isAvailable(): boolean;
}
//#endregion
export { Topic };
//# sourceMappingURL=topic.d.ts.map