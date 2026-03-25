import { Serializable } from "@langchain/core/load/serializable";

//#region src/stores/file/base.d.ts

/**
 * Base class for all file stores. All file stores should extend this
 * class.
 */
declare abstract class BaseFileStore extends Serializable {
  abstract readFile(path: string): Promise<string>;
  abstract writeFile(path: string, contents: string): Promise<void>;
}
//#endregion
export { BaseFileStore };
//# sourceMappingURL=base.d.cts.map