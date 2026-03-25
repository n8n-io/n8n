import { ListKeyOptions, RecordManager, UpdateOptions } from "@langchain/core/indexing";

//#region src/indexes/memory.d.ts
interface MemoryRecord {
  updatedAt: number;
  groupId: string | null;
}
declare class InMemoryRecordManager extends RecordManager {
  lc_namespace: string[];
  records: Map<string, MemoryRecord>;
  constructor();
  createSchema(): Promise<void>;
  getTime(): Promise<number>;
  update(keys: string[], updateOptions?: UpdateOptions): Promise<void>;
  exists(keys: string[]): Promise<boolean[]>;
  listKeys(options?: ListKeyOptions): Promise<string[]>;
  deleteKeys(keys: string[]): Promise<void>;
}
//#endregion
export { InMemoryRecordManager };
//# sourceMappingURL=memory.d.cts.map