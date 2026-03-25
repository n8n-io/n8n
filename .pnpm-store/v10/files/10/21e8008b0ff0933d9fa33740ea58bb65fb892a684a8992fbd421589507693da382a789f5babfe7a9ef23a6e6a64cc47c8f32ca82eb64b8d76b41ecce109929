import { Serializable } from "@langchain/core/load/serializable";

//#region src/memory/stores/entity/base.d.ts

/**
 * Base class for all entity stores. All entity stores should extend this
 * class.
 */
declare abstract class BaseEntityStore extends Serializable {
  abstract get(key: string, defaultValue?: string): Promise<string | undefined>;
  abstract set(key: string, value?: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
}
//#endregion
export { BaseEntityStore };
//# sourceMappingURL=base.d.ts.map