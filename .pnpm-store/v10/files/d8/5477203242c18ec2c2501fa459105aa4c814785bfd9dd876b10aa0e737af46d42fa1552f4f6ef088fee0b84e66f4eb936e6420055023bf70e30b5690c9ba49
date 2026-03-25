import { Tool } from "@langchain/core/tools";

//#region src/tools/ifttt.d.ts

/**
 * Represents a tool for creating and managing webhooks with the IFTTT (If
 * This Then That) service. The IFTTT service allows users to create
 * chains of simple conditional statements, called applets, which are
 * triggered based on changes to other web services.
 */
declare class IFTTTWebhook extends Tool {
  static lc_name(): string;
  private url;
  name: string;
  description: string;
  constructor(url: string, name: string, description: string);
  /** @ignore */
  _call(input: string): Promise<string>;
}
//#endregion
export { IFTTTWebhook };
//# sourceMappingURL=ifttt.d.ts.map