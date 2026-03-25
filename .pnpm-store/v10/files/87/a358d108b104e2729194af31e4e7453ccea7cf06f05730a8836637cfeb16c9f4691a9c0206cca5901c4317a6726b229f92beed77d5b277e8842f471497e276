import { Tool, ToolParams } from "@langchain/core/tools";

//#region src/tools/wolframalpha.d.ts

/**
 * @example
 * ```typescript
 * const tool = new WolframAlphaTool({
 *   appid: "YOUR_APP_ID",
 * });
 * const res = await tool.invoke("What is 2 * 2?");
 * ```
 */
declare class WolframAlphaTool extends Tool {
  appid: string;
  name: string;
  description: string;
  constructor(fields: ToolParams & {
    appid: string;
  });
  static lc_name(): string;
  _call(query: string): Promise<string>;
}
//#endregion
export { WolframAlphaTool };
//# sourceMappingURL=wolframalpha.d.ts.map