import { Plan } from "./base.cjs";
import { BaseOutputParser } from "@langchain/core/output_parsers";

//#region src/experimental/plan_and_execute/outputParser.d.ts

/**
 * Specific implementation of the `BaseOutputParser` class designed to
 * parse the output text into a `Plan` object.
 */
declare class PlanOutputParser extends BaseOutputParser<Plan> {
  lc_namespace: string[];
  /**
   * Parses the output text into a `Plan` object. The steps are extracted by
   * splitting the text on newline followed by a number and a period,
   * indicating the start of a new step. The `<END_OF_PLAN>` tag is then
   * removed from each step.
   * @param text The output text to be parsed.
   * @returns A `Plan` object consisting of a series of steps.
   */
  parse(text: string): Promise<Plan>;
  /**
   * Returns a string that represents the format instructions for the plan.
   * This is defined by the `PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE`
   * constant.
   * @returns A string representing the format instructions for the plan.
   */
  getFormatInstructions(): string;
}
//#endregion
export { PlanOutputParser };
//# sourceMappingURL=outputParser.d.cts.map