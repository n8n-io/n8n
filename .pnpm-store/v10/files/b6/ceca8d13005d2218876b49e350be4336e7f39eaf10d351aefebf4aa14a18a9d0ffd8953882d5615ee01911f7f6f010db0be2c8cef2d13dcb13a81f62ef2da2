import { Serializable } from "../load/serializable.cjs";

//#region src/indexing/record_manager.d.ts
declare const UUIDV5_NAMESPACE = "10f90ea3-90a4-4962-bf75-83a0f3c1c62a";
type UpdateOptions = {
  groupIds?: (string | null)[];
  timeAtLeast?: number;
};
type ListKeyOptions = {
  before?: number;
  after?: number;
  groupIds?: (string | null)[];
  limit?: number;
};
interface RecordManagerInterface {
  /**
   * Creates schema in the record manager.
   * @returns Promise
   */
  createSchema(): Promise<void>;
  /**
   * Returns current time from the record manager.
   * @returns Current time
   */
  getTime(): Promise<number>;
  /**
   * Updates keys in the record manager.
   * @param keys List of keys to update
   * @param groupIds List of groupIds to update
   * @param timeAtLeast Update only if current time is at least this value
   * @returns Promise
   * @throws Error if timeAtLeast is provided and current time is less than timeAtLeast
   * @throws Error if number of keys does not match number of groupIds
   */
  update(keys: string[], updateOptions: UpdateOptions): Promise<void>;
  /**
   * Checks if keys exist in the record manager.
   * @param keys List of keys to check
   * @returns List of booleans indicating if key exists in same order as provided keys
   */
  exists(keys: string[]): Promise<boolean[]>;
  /**
   * Lists keys from the record manager.
   * @param before List keys before this timestamp
   * @param after List keys after this timestamp
   * @param groupIds List keys with these groupIds
   * @param limit Limit the number of keys returned
   * @returns List of keys
   *
   */
  listKeys(options: ListKeyOptions): Promise<string[]>;
  /**
   * Deletes keys from the record manager.
   * @param keys List of keys to delete
   */
  deleteKeys(keys: string[]): Promise<void>;
}
declare abstract class RecordManager extends Serializable implements RecordManagerInterface {
  lc_namespace: string[];
  abstract createSchema(): Promise<void>;
  abstract getTime(): Promise<number>;
  abstract update(keys: string[], updateOptions?: UpdateOptions): Promise<void>;
  abstract exists(keys: string[]): Promise<boolean[]>;
  abstract listKeys(options?: ListKeyOptions): Promise<string[]>;
  abstract deleteKeys(keys: string[]): Promise<void>;
}
//#endregion
export { ListKeyOptions, RecordManager, RecordManagerInterface, UUIDV5_NAMESPACE, UpdateOptions };
//# sourceMappingURL=record_manager.d.cts.map