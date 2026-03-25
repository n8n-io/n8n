import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";
import { StructuredTool } from "@langchain/core/tools";

//#region src/tools/connery.d.ts

/**
 * An object containing configuration parameters for the ConneryService class.
 * @extends AsyncCallerParams
 */
interface ConneryServiceParams extends AsyncCallerParams {
  runnerUrl: string;
  apiKey: string;
}
type Parameter = {
  key: string;
  title: string;
  description: string;
  type: string;
  validation?: {
    required?: boolean;
  };
};
type Action = {
  id: string;
  key: string;
  title: string;
  description: string;
  type: string;
  inputParameters: Parameter[];
  outputParameters: Parameter[];
  pluginId: string;
};
type Input = Record<string, string | undefined>;
type Output = Record<string, string>;
type ConneryActionSchema = z.ZodObject<Record<string, z.ZodString | z.ZodOptional<z.ZodString>>>;
/**
 * A LangChain Tool object wrapping a Connery action.
 * ConneryAction is a structured tool that can be used only in the agents supporting structured tools.
 * @extends StructuredTool
 */
declare class ConneryAction extends StructuredTool {
  protected _action: Action;
  protected _service: ConneryService;
  name: string;
  description: string;
  schema: ConneryActionSchema;
  /**
   * Creates a ConneryAction instance based on the provided Connery Action.
   * @param _action The Connery Action.
   * @param _service The ConneryService instance.
   * @returns A ConneryAction instance.
   */
  constructor(_action: Action, _service: ConneryService);
  /**
   * Runs the Connery Action with the provided input.
   * @param arg The input object expected by the action.
   * @returns A promise that resolves to a JSON string containing the output of the action.
   */
  protected _call(arg: InferInteropZodOutput<ConneryActionSchema>): Promise<string>;
  /**
   * Creates a Zod schema for the input object expected by the Connery action.
   * @returns A Zod schema for the input object expected by the Connery action.
   */
  protected createInputSchema(): z.ZodObject<Record<string, z.ZodString | z.ZodOptional<z.ZodString>>>;
}
/**
 * A service for working with Connery Actions.
 */
declare class ConneryService {
  protected runnerUrl: string;
  protected apiKey: string;
  protected asyncCaller: AsyncCaller;
  /**
   * Creates a ConneryService instance.
   * @param params A ConneryServiceParams object.
   * If not provided, the values are retrieved from the CONNERY_RUNNER_URL
   * and CONNERY_RUNNER_API_KEY environment variables.
   * @returns A ConneryService instance.
   */
  constructor(params?: ConneryServiceParams);
  /**
   * Returns the list of Connery Actions wrapped as a LangChain StructuredTool objects.
   * @returns A promise that resolves to an array of ConneryAction objects.
   */
  listActions(): Promise<ConneryAction[]>;
  /**
   * Returns the specified Connery action wrapped as a LangChain StructuredTool object.
   * @param actionId The ID of the action to return.
   * @returns A promise that resolves to a ConneryAction object.
   */
  getAction(actionId: string): Promise<ConneryAction>;
  /**
   * Runs the specified Connery action with the provided input.
   * @param actionId The ID of the action to run.
   * @param input The input object expected by the action.
   * @returns A promise that resolves to a JSON string containing the output of the action.
   */
  runAction(actionId: string, input?: Input): Promise<string>;
  /**
   * Returns the list of actions available in the Connery runner.
   * @returns A promise that resolves to an array of Action objects.
   */
  protected _listActions(): Promise<Action[]>;
  /**
   * Returns the specified action available in the Connery runner.
   * @param actionId The ID of the action to return.
   * @returns A promise that resolves to an Action object.
   * @throws An error if the action with the specified ID is not found.
   */
  protected _getAction(actionId: string): Promise<Action>;
  /**
   * Runs the specified Connery action with the provided input.
   * @param actionId The ID of the action to run.
   * @param input The input object expected by the action.
   * @returns A promise that resolves to a RunActionResult object.
   */
  protected _runAction(actionId: string, input?: Input): Promise<Output>;
  /**
   * Returns a standard set of HTTP headers to be used in API calls to the Connery runner.
   * @returns An object containing the standard set of HTTP headers.
   */
  protected _getHeaders(): Record<string, string>;
  /**
   * Shared error handler for API calls to the Connery runner.
   * If the response is not ok, an error is thrown containing the error message returned by the Connery runner.
   * Otherwise, the promise resolves to void.
   * @param response The response object returned by the Connery runner.
   * @param errorMessage The error message to be used in the error thrown if the response is not ok.
   * @returns A promise that resolves to void.
   * @throws An error containing the error message returned by the Connery runner.
   */
  protected _handleError(response: Response, errorMessage: string): Promise<void>;
}
//#endregion
export { ConneryAction, ConneryService, ConneryServiceParams };
//# sourceMappingURL=connery.d.ts.map