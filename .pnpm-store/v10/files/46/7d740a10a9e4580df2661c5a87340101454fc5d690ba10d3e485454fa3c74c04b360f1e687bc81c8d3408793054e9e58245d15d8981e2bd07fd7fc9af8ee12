import { BaseFileStore } from "../stores/file/base.cjs";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { StructuredTool, ToolParams } from "@langchain/core/tools";
import { z } from "zod/v3";

//#region src/tools/fs.d.ts

/**
 * Interface for parameters required by the ReadFileTool class.
 */
interface ReadFileParams extends ToolParams {
  store: BaseFileStore;
}
declare const readSchema: z.ZodObject<{
  file_path: z.ZodString;
}, "strip", z.ZodTypeAny, {
  file_path: string;
}, {
  file_path: string;
}>;
type ReadToolSchema = typeof readSchema;
/**
 * Class for reading files from the disk. Extends the StructuredTool
 * class.
 */
declare class ReadFileTool extends StructuredTool {
  static lc_name(): string;
  schema: z.ZodObject<{
    file_path: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    file_path: string;
  }, {
    file_path: string;
  }>;
  name: string;
  description: string;
  store: BaseFileStore;
  constructor({
    store
  }: ReadFileParams);
  _call({
    file_path
  }: InferInteropZodOutput<ReadToolSchema>): Promise<string>;
}
/**
 * Interface for parameters required by the WriteFileTool class.
 */
interface WriteFileParams extends ToolParams {
  store: BaseFileStore;
}
declare const writeSchema: z.ZodObject<{
  file_path: z.ZodString;
  text: z.ZodString;
}, "strip", z.ZodTypeAny, {
  file_path: string;
  text: string;
}, {
  file_path: string;
  text: string;
}>;
type WriteToolSchema = typeof writeSchema;
/**
 * Class for writing data to files on the disk. Extends the StructuredTool
 * class.
 */
declare class WriteFileTool extends StructuredTool {
  static lc_name(): string;
  schema: z.ZodObject<{
    file_path: z.ZodString;
    text: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    file_path: string;
    text: string;
  }, {
    file_path: string;
    text: string;
  }>;
  name: string;
  description: string;
  store: BaseFileStore;
  constructor({
    store,
    ...rest
  }: WriteFileParams);
  _call({
    file_path,
    text
  }: InferInteropZodOutput<WriteToolSchema>): Promise<string>;
}
//#endregion
export { ReadFileTool, WriteFileTool };
//# sourceMappingURL=fs.d.cts.map