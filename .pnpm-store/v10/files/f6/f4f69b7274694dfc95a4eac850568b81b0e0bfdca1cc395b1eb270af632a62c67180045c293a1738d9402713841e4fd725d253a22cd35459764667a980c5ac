import { Checkpoint, ReadonlyCheckpoint } from "@langchain/langgraph-checkpoint";

//#region src/channels/base.d.ts
/** @internal */
declare abstract class BaseChannel<ValueType = unknown, UpdateType = unknown, CheckpointType = unknown> {
  ValueType: ValueType;
  UpdateType: UpdateType;
  /**
   * The name of the channel.
   */
  abstract lc_graph_name: string;
  /** @ignore */
  lg_is_channel: boolean;
  /**
   * Return a new identical channel, optionally initialized from a checkpoint.
   * Can be thought of as a "restoration" from a checkpoint which is a "snapshot" of the channel's state.
   *
   * @param {CheckpointType | undefined} checkpoint
   * @param {CheckpointType | undefined} initialValue
   * @returns {this}
   */
  abstract fromCheckpoint(checkpoint?: CheckpointType): this;
  /**
   * Update the channel's value with the given sequence of updates.
   * The order of the updates in the sequence is arbitrary.
   * This method is called by Pregel for all channels at the end of each step.
   * If there are no updates, it is called with an empty sequence.
   *
   * Raises InvalidUpdateError if the sequence of updates is invalid.
   * Returns True if the channel was updated, False otherwise.
   *
   * @throws {InvalidUpdateError} if the sequence of updates is invalid.
   * @param {Array<UpdateType>} values
   * @returns {void}
   */
  abstract update(values: UpdateType[]): boolean;
  /**
   * Return the current value of the channel.
   *
   * @throws {EmptyChannelError} if the channel is empty (never updated yet).
   * @returns {ValueType}
   */
  abstract get(): ValueType;
  /**
   * Return a string representation of the channel's current state.
   *
   * @throws {EmptyChannelError} if the channel is empty (never updated yet), or doesn't support checkpoints.
   * @returns {CheckpointType | undefined}
   */
  abstract checkpoint(): CheckpointType | undefined;
  /**
   * Mark the current value of the channel as consumed. By default, no-op.
   * A channel can use this method to modify its state, preventing the value
   * from being consumed again.
   *
   * Returns True if the channel was updated, False otherwise.
   */
  consume(): boolean;
  /**
   * Notify the channel that the Pregel run is finishing. By default, no-op.
   * A channel can use this method to modify its state, preventing finish.
   *
   * Returns True if the channel was updated, False otherwise.
   */
  finish(): boolean;
  /**
   * Return True if the channel is available (not empty), False otherwise.
   * Subclasses should override this method to provide a more efficient
   * implementation than calling get() and catching EmptyChannelError.
   */
  isAvailable(): boolean;
}
declare function emptyChannels<Cc extends Record<string, BaseChannel>>(channels: Cc, checkpoint: ReadonlyCheckpoint): Cc;
declare function createCheckpoint<ValueType>(checkpoint: ReadonlyCheckpoint, channels: Record<string, BaseChannel<ValueType>> | undefined, step: number, options?: {
  id?: string;
}): Checkpoint;
//#endregion
export { BaseChannel, createCheckpoint, emptyChannels };
//# sourceMappingURL=base.d.ts.map