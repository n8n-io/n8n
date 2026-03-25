import { Tool, ToolParams } from "@langchain/core/tools";

//#region src/tools/aiplugin.d.ts

/**
 * Interface for parameters required to create an instance of
 * AIPluginTool.
 */
interface AIPluginToolParams extends ToolParams {
  name: string;
  description: string;
  apiSpec: string;
}
/**
 * Class for creating instances of AI tools from plugins. It extends the
 * Tool class and implements the AIPluginToolParams interface.
 */
declare class AIPluginTool extends Tool implements AIPluginToolParams {
  static lc_name(): string;
  private _name;
  private _description;
  apiSpec: string;
  get name(): string;
  get description(): string;
  constructor(params: AIPluginToolParams);
  /** @ignore */
  _call(_input: string): Promise<string>;
  /**
   * Static method that creates an instance of AIPluginTool from a given
   * plugin URL. It fetches the plugin and its API specification from the
   * provided URL and returns a new instance of AIPluginTool with the
   * fetched data.
   * @param url The URL of the AI plugin.
   * @returns A new instance of AIPluginTool.
   */
  static fromPluginUrl(url: string): Promise<AIPluginTool>;
}
//#endregion
export { AIPluginTool, AIPluginToolParams };
//# sourceMappingURL=aiplugin.d.ts.map