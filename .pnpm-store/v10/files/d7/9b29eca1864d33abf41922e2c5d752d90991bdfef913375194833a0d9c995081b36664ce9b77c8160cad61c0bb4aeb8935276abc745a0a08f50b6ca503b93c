import { DynamicTool, DynamicToolInput } from "@langchain/core/tools";

//#region src/tools/aws_lambda.d.ts

/**
 * Interface for the configuration of the AWS Lambda function.
 */
interface LambdaConfig {
  functionName: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}
/**
 * Class for invoking AWS Lambda functions within the LangChain framework.
 * Extends the DynamicTool class.
 */
declare class AWSLambda extends DynamicTool {
  get lc_namespace(): string[];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  private lambdaConfig;
  constructor({
    name,
    description,
    ...rest
  }: LambdaConfig & Omit<DynamicToolInput, "func">);
  /** @ignore */
  _func(input: string): Promise<string>;
}
//#endregion
export { AWSLambda };
//# sourceMappingURL=aws_lambda.d.ts.map