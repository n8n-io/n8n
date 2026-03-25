import { InteropZodObject } from "../types/zod.cjs";
import { CallbackManagerForToolRun } from "../../callbacks/manager.cjs";
import { ToolInputSchemaOutputType, ToolParams } from "../../tools/types.cjs";
import { StructuredTool } from "../../tools/index.cjs";

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
//# sourceMappingURL=tools.d.cts.map