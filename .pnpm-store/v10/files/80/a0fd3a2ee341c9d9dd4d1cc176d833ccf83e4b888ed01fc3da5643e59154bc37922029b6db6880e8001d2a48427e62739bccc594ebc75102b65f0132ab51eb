import { JSONSchema7 } from 'json-schema';
import { SharedV2ProviderOptions } from '../../shared';

/**
 * A tool has a name, a description, and a set of parameters.
 *
 * Note: this is **not** the user-facing tool definition. The AI SDK methods will
 * map the user-facing tool definitions to this format.
 */
export type LanguageModelV2FunctionTool = {
  /**
   * The type of the tool (always 'function').
   */
  type: 'function';

  /**
   * The name of the tool. Unique within this model call.
   */
  name: string;

  /**
   * A description of the tool. The language model uses this to understand the
   * tool's purpose and to provide better completion suggestions.
   */
  description?: string;

  /**
   * The parameters that the tool expects. The language model uses this to
   * understand the tool's input requirements and to provide matching suggestions.
   */
  inputSchema: JSONSchema7;

  /**
   * The provider-specific options for the tool.
   */
  providerOptions?: SharedV2ProviderOptions;
};
