import { ConneryService } from "../../../tools/connery.js";
import { Toolkit } from "@langchain/core/indexing";
import { ToolInterface } from "@langchain/core/tools";

//#region src/agents/toolkits/connery/index.d.ts

/**
 * ConneryToolkit provides access to all the available actions from the Connery Runner.
 * @extends Toolkit
 */
declare class ConneryToolkit extends Toolkit {
  tools: ToolInterface[];
  /**
   * Creates a ConneryToolkit instance based on the provided ConneryService instance.
   * It populates the tools property of the ConneryToolkit instance with the list of
   * available tools from the Connery Runner.
   * @param conneryService The ConneryService instance.
   * @returns A Promise that resolves to a ConneryToolkit instance.
   */
  static createInstance(conneryService: ConneryService): Promise<ConneryToolkit>;
}
//#endregion
export { ConneryToolkit };
//# sourceMappingURL=index.d.ts.map