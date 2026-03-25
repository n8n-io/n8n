//#region src/serde/types.d.ts
declare const TASKS = "__pregel_tasks";
declare const ERROR = "__error__";
declare const SCHEDULED = "__scheduled__";
declare const INTERRUPT = "__interrupt__";
declare const RESUME = "__resume__";
// Mirrors BaseChannel in "@langchain/langgraph"
interface ChannelProtocol<ValueType = unknown, UpdateType = unknown, CheckpointType = unknown> {
  ValueType: ValueType;
  UpdateType: UpdateType;
  /**
   * The name of the channel.
   */
  lc_graph_name: string;
  /**
   * Return a new identical channel, optionally initialized from a checkpoint.
   * Can be thought of as a "restoration" from a checkpoint which is a "snapshot" of the channel's state.
   *
   * @param {CheckpointType | undefined} checkpoint
   * @returns {this}
   */
  fromCheckpoint(checkpoint?: CheckpointType): this;
  /**
   * Update the channel's value with the given sequence of updates.
   * The order of the updates in the sequence is arbitrary.
   *
   * @throws {InvalidUpdateError} if the sequence of updates is invalid.
   * @param {Array<UpdateType>} values
   * @returns {void}
   */
  update(values: UpdateType[]): void;
  /**
   * Return the current value of the channel.
   *
   * @throws {EmptyChannelError} if the channel is empty (never updated yet).
   * @returns {ValueType}
   */
  get(): ValueType;
  /**
   * Return a string representation of the channel's current state.
   *
   * @throws {EmptyChannelError} if the channel is empty (never updated yet), or doesn't support checkpoints.
   * @returns {CheckpointType | undefined}
   */
  checkpoint(): CheckpointType | undefined;
}
// Mirrors SendInterface in "@langchain/langgraph"
interface SendProtocol {
  node: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
}
//#endregion
export { ChannelProtocol, ERROR, INTERRUPT, RESUME, SCHEDULED, SendProtocol, TASKS };
//# sourceMappingURL=types.d.ts.map