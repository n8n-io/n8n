import { BaseStore, Item, Operation, OperationResults } from "./base.cjs";

//#region src/store/batch.d.ts
declare class AsyncBatchedStore extends BaseStore {
  lg_name: string;
  protected store: BaseStore;
  private queue;
  private nextKey;
  private running;
  private processingTask;
  constructor(store: BaseStore);
  get isRunning(): boolean;
  /**
   * @ignore
   * Batch is not implemented here as we're only extending `BaseStore`
   * to allow it to be passed where `BaseStore` is expected, and implement
   * the convenience methods (get, search, put, delete).
   */
  batch<Op extends Operation[]>(_operations: Op): Promise<OperationResults<Op>>;
  get(namespace: string[], key: string): Promise<Item | null>;
  search(namespacePrefix: string[], options?: {
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
    query?: string;
  }): Promise<Item[]>;
  put(namespace: string[], key: string, value: Record<string, any>): Promise<void>;
  delete(namespace: string[], key: string): Promise<void>;
  start(): void;
  stop(): Promise<void>;
  private enqueueOperation;
  private processBatchQueue;
  // AsyncBatchedStore is internal and gets passed as args into traced tasks
  // some BaseStores contain circular references so just serialize without it
  // as this causes warnings when tracing with LangSmith.
  toJSON(): {
    queue: Map<number, {
      operation: Operation;
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }>;
    nextKey: number;
    running: boolean;
    store: string;
  };
}
//#endregion
export { AsyncBatchedStore };
//# sourceMappingURL=batch.d.cts.map