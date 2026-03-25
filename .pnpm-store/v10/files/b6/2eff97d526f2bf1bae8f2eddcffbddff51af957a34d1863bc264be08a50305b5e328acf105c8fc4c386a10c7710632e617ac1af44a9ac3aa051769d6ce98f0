import { WatsonxAuth, WatsonxInit } from "../../types/ibm.cjs";
import { BaseToolkit, StructuredTool, StructuredToolInterface } from "@langchain/core/tools";
import { InteropZodObject, ZodObjectV3 } from "@langchain/core/utils/types";
import { WatsonXAI } from "@ibm-cloud/watsonx-ai";

//#region src/agents/toolkits/ibm.d.ts
interface WatsonxToolParams {
  name: string;
  description: string;
  schema?: Record<string, any>;
  service?: WatsonXAI;
  configSchema?: Record<string, any>;
}
declare class WatsonxTool extends StructuredTool implements WatsonxToolParams {
  name: string;
  description: string;
  service: WatsonXAI;
  schema: ZodObjectV3;
  configSchema?: InteropZodObject;
  toolConfig?: Record<string, any>;
  constructor(fields: WatsonXAI.TextChatParameterFunction, service: WatsonXAI, configSchema?: WatsonXAI.JsonObject);
  protected _call(inputObject: Record<string, any>): Promise<string>;
  set config(config: Record<string, any>);
}
declare class WatsonxToolkit extends BaseToolkit {
  tools: WatsonxTool[];
  service: WatsonXAI;
  constructor(fields: WatsonxAuth & WatsonxInit);
  loadTools(): Promise<void>;
  static init(props: WatsonxAuth & WatsonxInit): Promise<WatsonxToolkit>;
  getTools(): StructuredToolInterface[];
  getTool(toolName: string, config?: Record<string, any>): WatsonxTool;
}
//#endregion
export { WatsonxTool, WatsonxToolParams, WatsonxToolkit };
//# sourceMappingURL=ibm.d.cts.map