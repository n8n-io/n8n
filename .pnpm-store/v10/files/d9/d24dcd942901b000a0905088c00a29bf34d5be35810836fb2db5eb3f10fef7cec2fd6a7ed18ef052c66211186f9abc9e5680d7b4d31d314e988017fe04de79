import { ValueOf } from '../util/value-of';
import { ToolSet } from './tool-set';

/**
 * Tool output when the tool execution has been denied (for static tools).
 */
export type StaticToolOutputDenied<TOOLS extends ToolSet> = ValueOf<{
  [NAME in keyof TOOLS]: {
    type: 'tool-output-denied';
    toolCallId: string;
    toolName: NAME & string;
    providerExecuted?: boolean;
    dynamic?: false | undefined;
  };
}>;

/**
 * Tool output when the tool execution has been denied.
 */
export type TypedToolOutputDenied<TOOLS extends ToolSet> =
  StaticToolOutputDenied<TOOLS>;
