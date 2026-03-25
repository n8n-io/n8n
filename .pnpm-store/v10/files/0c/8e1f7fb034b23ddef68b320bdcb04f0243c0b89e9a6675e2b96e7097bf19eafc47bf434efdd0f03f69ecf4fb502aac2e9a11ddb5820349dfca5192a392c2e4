import { SerializerProtocol } from "./serde/base.cjs";
import { CheckpointMetadata, PendingWrite } from "./types.cjs";
import { BaseCheckpointSaver, Checkpoint, CheckpointListOptions, CheckpointTuple } from "./base.cjs";
import { RunnableConfig } from "@langchain/core/runnables";

//#region src/memory.d.ts
declare class MemorySaver extends BaseCheckpointSaver {
  // thread ID ->  checkpoint namespace -> checkpoint ID -> checkpoint mapping
  storage: Record<string, Record<string, Record<string, [Uint8Array, Uint8Array, string | undefined]>>>;
  writes: Record<string, Record<string, [string, string, Uint8Array]>>;
  constructor(serde?: SerializerProtocol);
  /** @internal */
  _migratePendingSends(mutableCheckpoint: Checkpoint, threadId: string, checkpointNs: string, parentCheckpointId: string): Promise<void>;
  getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined>;
  list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple>;
  put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig>;
  putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
}
//#endregion
export { MemorySaver };
//# sourceMappingURL=memory.d.cts.map