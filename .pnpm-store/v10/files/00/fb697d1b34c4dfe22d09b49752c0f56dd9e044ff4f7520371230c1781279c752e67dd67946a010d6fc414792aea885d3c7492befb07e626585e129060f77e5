import { z } from "zod/v3";
import { BaseToolkit, StructuredTool, StructuredToolInterface, Tool } from "@langchain/core/tools";
import { Stagehand } from "@browserbasehq/stagehand";

//#region src/agents/toolkits/stagehand.d.ts
declare abstract class StagehandToolBase extends Tool {
  protected stagehand?: Stagehand;
  private localStagehand?;
  constructor(stagehandInstance?: Stagehand);
  protected getStagehand(): Promise<Stagehand>;
}
declare class StagehandNavigateTool extends StagehandToolBase {
  name: string;
  description: string;
  _call(input: string): Promise<string>;
}
declare class StagehandActTool extends StagehandToolBase {
  name: string;
  description: string;
  _call(input: string): Promise<string>;
}
declare class StagehandExtractTool extends StructuredTool {
  name: string;
  description: string;
  schema: z.ZodObject<{
    instruction: z.ZodString;
    schema: z.ZodRecord<z.ZodString, z.ZodAny>;
  }, "strip", z.ZodTypeAny, {
    instruction: string;
    schema: Record<string, any>;
  }, {
    instruction: string;
    schema: Record<string, any>;
  }>;
  private stagehand?;
  constructor(stagehandInstance?: Stagehand);
  _call(input: {
    instruction: string;
    schema: z.AnyZodObject;
  }): Promise<string>;
  protected getStagehand(): Promise<Stagehand>;
}
declare class StagehandObserveTool extends StagehandToolBase {
  name: string;
  description: string;
  _call(input: string): Promise<string>;
}
declare class StagehandToolkit extends BaseToolkit {
  tools: StructuredToolInterface[];
  stagehand?: Stagehand;
  constructor(stagehand?: Stagehand);
  private initializeTools;
  static fromStagehand(stagehand: Stagehand): Promise<StagehandToolkit>;
}
//#endregion
export { StagehandActTool, StagehandExtractTool, StagehandNavigateTool, StagehandObserveTool, StagehandToolkit };
//# sourceMappingURL=stagehand.d.ts.map