import { TypedToolError } from './tool-error';
import { TypedToolResult } from './tool-result';
import { ToolSet } from './tool-set';

export type ToolOutput<TOOLS extends ToolSet> =
  | TypedToolResult<TOOLS>
  | TypedToolError<TOOLS>;
