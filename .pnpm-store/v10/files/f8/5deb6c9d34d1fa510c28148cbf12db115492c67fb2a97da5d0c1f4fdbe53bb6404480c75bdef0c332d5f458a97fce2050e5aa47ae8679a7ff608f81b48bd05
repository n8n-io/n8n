import { AgentActionOutputParser } from "../types.js";
import { OutputParserArgs } from "../agent.js";

//#region src/agents/mrkl/outputParser.d.ts

/**
 * A class that extends `AgentActionOutputParser` to provide a custom
 * implementation for parsing the output of a ZeroShotAgent action.
 */
declare class ZeroShotAgentOutputParser extends AgentActionOutputParser {
  lc_namespace: string[];
  finishToolName: string;
  constructor(fields?: OutputParserArgs);
  /**
   * Parses the text output of an agent action, extracting the tool, tool
   * input, and output.
   * @param text The text output of an agent action.
   * @returns An object containing the tool, tool input, and output extracted from the text, along with the original text as a log.
   */
  parse(text: string): Promise<{
    returnValues: {
      output: string;
    };
    log: string;
    tool?: undefined;
    toolInput?: undefined;
  } | {
    tool: string;
    toolInput: string;
    log: string;
    returnValues?: undefined;
  }>;
  /**
   * Returns the format instructions for parsing the output of an agent
   * action in the style of the ZeroShotAgent.
   * @returns The format instructions for parsing the output.
   */
  getFormatInstructions(): string;
}
//#endregion
export { ZeroShotAgentOutputParser };
//# sourceMappingURL=outputParser.d.ts.map