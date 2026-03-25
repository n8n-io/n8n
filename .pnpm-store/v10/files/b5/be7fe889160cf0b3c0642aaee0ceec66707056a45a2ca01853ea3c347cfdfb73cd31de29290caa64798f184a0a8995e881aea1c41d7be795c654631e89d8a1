import { Tool, ToolParams } from "@langchain/core/tools";

//#region src/tools/aws_sfn.d.ts

/**
 * Interface for AWS Step Functions configuration.
 */
interface SfnConfig {
  stateMachineArn: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}
/**
 * Class for starting the execution of an AWS Step Function.
 */
declare class StartExecutionAWSSfnTool extends Tool {
  static lc_name(): string;
  private sfnConfig;
  name: string;
  description: string;
  constructor({
    name,
    description,
    ...rest
  }: SfnConfig & {
    name: string;
    description: string;
  });
  /**
   * Generates a formatted description for the StartExecutionAWSSfnTool.
   * @param name Name of the state machine.
   * @param description Description of the state machine.
   * @returns A formatted description string.
   */
  static formatDescription(name: string, description: string): string;
  /** @ignore */
  _call(input: string): Promise<string>;
}
/**
 * Class for checking the status of an AWS Step Function execution.
 */
declare class DescribeExecutionAWSSfnTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  sfnConfig: Omit<SfnConfig, "stateMachineArn">;
  constructor(config: Omit<SfnConfig, "stateMachineArn"> & ToolParams);
  /** @ignore */
  _call(input: string): Promise<string>;
}
/**
 * Class for sending a task success signal to an AWS Step Function
 * execution.
 */
declare class SendTaskSuccessAWSSfnTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  sfnConfig: Omit<SfnConfig, "stateMachineArn">;
  constructor(config: Omit<SfnConfig, "stateMachineArn"> & ToolParams);
  /** @ignore */
  _call(input: string): Promise<string>;
}
//#endregion
export { DescribeExecutionAWSSfnTool, SendTaskSuccessAWSSfnTool, SfnConfig, StartExecutionAWSSfnTool };
//# sourceMappingURL=aws_sfn.d.cts.map