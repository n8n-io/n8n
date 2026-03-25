import { InteropZodObject } from "../types/zod.js";
import { CallbackManagerForToolRun } from "../../callbacks/manager.js";
import { ToolInputSchemaOutputType, ToolParams } from "../../tools/types.js";
import { StructuredTool } from "../../tools/index.js";

//#region src/utils/testing/tools.d.ts
interface FakeToolParams<T extends InteropZodObject = InteropZodObject> extends ToolParams {
  name: string;
  description: string;
  schema: T;
}
declare class FakeTool<T extends InteropZodObject = InteropZodObject> extends StructuredTool<T> {
  name: string;
  description: string;
  schema: T;
  constructor(fields: FakeToolParams<T>);
  protected _call(arg: ToolInputSchemaOutputType<T>, _runManager?: CallbackManagerForToolRun): Promise<string>;
}
//#endregion
export { FakeTool, FakeToolParams };
//# sourceMappingURL=tools.d.ts.map