import { ConneryService } from "../../../tools/connery.cjs";
import { ToolInterface } from "@langchain/core/tools";
import { Toolkit as Toolkit$1 } from "@langchain/core/indexing";

//#region src/agents/toolkits/connery/index.d.ts

/**
 * ConneryToolkit provides access to all the available actions from the Connery Runner.
 * @extends Toolkit
 */
declare class ConneryToolkit extends Toolkit$1 {
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
//# sourceMappingURL=index.d.cts.map