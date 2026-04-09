import { Tool } from '@ai-sdk/provider-utils';
import { ProviderMetadata } from '../types';
import { ValueOf } from '../util/value-of';
import { ToolSet } from './tool-set';

type BaseToolCall = {
  type: 'tool-call';
  toolCallId: string;
  providerExecuted?: boolean;
  providerMetadata?: ProviderMetadata;
};

export type StaticToolCall<TOOLS extends ToolSet> = ValueOf<{
  [NAME in keyof TOOLS]: BaseToolCall & {
    toolName: NAME & string;
    input: TOOLS[NAME] extends Tool<infer PARAMETERS> ? PARAMETERS : never;
    dynamic?: false | undefined;
    invalid?: false | undefined;
    error?: never;
    title?: string;
  };
}>;

export type DynamicToolCall = BaseToolCall & {
  toolName: string;
  input: unknown;
  dynamic: true;
  title?: string;

  /**
   * True if this is caused by an unparsable tool call or
   * a tool that does not exist.
   */
  // Added into DynamicToolCall to avoid breaking changes.
  // TODO AI SDK 6: separate into a new InvalidToolCall type
  invalid?: boolean;

  /**
   * The error that caused the tool call to be invalid.
   */
  // TODO AI SDK 6: separate into a new InvalidToolCall type
  error?: unknown;
};

export type TypedToolCall<TOOLS extends ToolSet> =
  | StaticToolCall<TOOLS>
  | DynamicToolCall;
