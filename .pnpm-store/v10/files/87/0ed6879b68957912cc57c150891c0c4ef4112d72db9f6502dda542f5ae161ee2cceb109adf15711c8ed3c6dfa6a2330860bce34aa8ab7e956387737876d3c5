import { SerializerProtocol } from "./serde/base.js";
import { CheckpointMetadata, CheckpointPendingWrite, PendingWrite } from "./types.js";
import { RunnableConfig } from "@langchain/core/runnables";

//#region src/base.d.ts
/** @inline */
type ChannelVersion = number | string;
type ChannelVersions = Record<string, ChannelVersion>;
interface Checkpoint<N extends string = string, C extends string = string> {
  /**
   * The version of the checkpoint format. Currently 4
   */
  v: number;
  /**
   * Checkpoint ID {uuid6}
   */
  id: string;
  /**
   * Timestamp {new Date().toISOString()}
   */
  ts: string;
  /**
   * @default {}
   */
  channel_values: Record<C, unknown>;
  /**
   * @default {}
   */
  channel_versions: Record<C, ChannelVersion>;
  /**
   * @default {}
   */
  versions_seen: Record<N, Record<C, ChannelVersion>>;
}
interface ReadonlyCheckpoint extends Readonly<Checkpoint> {
  readonly channel_values: Readonly<Record<string, unknown>>;
  readonly channel_versions: Readonly<Record<string, ChannelVersion>>;
  readonly versions_seen: Readonly<Record<string, Readonly<Record<string, ChannelVersion>>>>;
}
declare function deepCopy<T>(obj: T): T;
/** @hidden */
declare function emptyCheckpoint(): Checkpoint;
/** @hidden */
declare function copyCheckpoint(checkpoint: ReadonlyCheckpoint): Checkpoint;
interface CheckpointTuple {
  config: RunnableConfig;
  checkpoint: Checkpoint;
  metadata?: CheckpointMetadata;
  parentConfig?: RunnableConfig;
  pendingWrites?: CheckpointPendingWrite[];
}
type CheckpointListOptions = {
  limit?: number;
  before?: RunnableConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: Record<string, any>;
};
declare abstract class BaseCheckpointSaver<V extends string | number = number> {
  serde: SerializerProtocol;
  constructor(serde?: SerializerProtocol);
  get(config: RunnableConfig): Promise<Checkpoint | undefined>;
  abstract getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined>;
  abstract list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple>;
  abstract put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata, newVersions: ChannelVersions): Promise<RunnableConfig>;
  /**
   * Store intermediate writes linked to a checkpoint.
   */
  abstract putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void>;
  /**
   * Delete all checkpoints and writes associated with a specific thread ID.
   * @param threadId The thread ID whose checkpoints should be deleted.
   */
  abstract deleteThread(threadId: string): Promise<void>;
  /**
   * Generate the next version ID for a channel.
   *
   * Default is to use integer versions, incrementing by 1. If you override, you can use str/int/float versions,
   * as long as they are monotonically increasing.
   */
  getNextVersion(current: V | undefined): V;
}
declare function compareChannelVersions(a: ChannelVersion, b: ChannelVersion): number;
declare function maxChannelVersion(...versions: ChannelVersion[]): ChannelVersion;
/**
 * Mapping from error type to error index.
 * Regular writes just map to their index in the list of writes being saved.
 * Special writes (e.g. errors) map to negative indices, to avoid those writes from
 * conflicting with regular writes.
 * Each Checkpointer implementation should use this mapping in put_writes.
 */
declare const WRITES_IDX_MAP: Record<string, number>;
declare function getCheckpointId(config: RunnableConfig): string;
//#endregion
export { BaseCheckpointSaver, ChannelVersions, Checkpoint, CheckpointListOptions, CheckpointTuple, ReadonlyCheckpoint, WRITES_IDX_MAP, compareChannelVersions, copyCheckpoint, deepCopy, emptyCheckpoint, getCheckpointId, maxChannelVersion };
//# sourceMappingURL=base.d.ts.map