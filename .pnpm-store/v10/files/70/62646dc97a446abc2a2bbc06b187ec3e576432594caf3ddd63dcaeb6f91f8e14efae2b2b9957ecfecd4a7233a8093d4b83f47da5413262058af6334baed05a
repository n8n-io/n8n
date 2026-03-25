//#region src/types.d.ts
type All = "*";
type PendingWriteValue = unknown;
type PendingWrite<Channel = string> = [Channel, PendingWriteValue];
type CheckpointPendingWrite<TaskId = string> = [TaskId, ...PendingWrite<string>];
/**
 * Additional details about the checkpoint, including the source, step, writes, and parents.
 *
 * @typeParam ExtraProperties - Optional additional properties to include in the metadata.
 */
type CheckpointMetadata<ExtraProperties extends object = object> = {
  /**
   * The source of the checkpoint.
   * - "input": The checkpoint was created from an input to invoke/stream/batch.
   * - "loop": The checkpoint was created from inside the pregel loop.
   * - "update": The checkpoint was created from a manual state update.
   * - "fork": The checkpoint was created as a copy of another checkpoint.
   */
  source: "input" | "loop" | "update" | "fork";
  /**
   * The step number of the checkpoint.
   * -1 for the first "input" checkpoint.
   * 0 for the first "loop" checkpoint.
   * ... for the nth checkpoint afterwards.
   */
  step: number;
  /**
   * The IDs of the parent checkpoints.
   * Mapping from checkpoint namespace to checkpoint ID.
   */
  parents: Record<string, string>;
} & ExtraProperties;
//#endregion
export { All, CheckpointMetadata, CheckpointPendingWrite, PendingWrite, PendingWriteValue };
//# sourceMappingURL=types.d.ts.map