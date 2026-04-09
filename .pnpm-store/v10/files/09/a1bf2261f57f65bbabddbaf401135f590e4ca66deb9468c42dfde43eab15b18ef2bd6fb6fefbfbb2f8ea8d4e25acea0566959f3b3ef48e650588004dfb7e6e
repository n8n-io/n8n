import { JSONParseError, TypeValidationError } from '@ai-sdk/provider';

/**
 * A function that attempts to repair the raw output of the model
 * to enable JSON parsing.
 *
 * Should return the repaired text or null if the text cannot be repaired.
 */
export type RepairTextFunction = (options: {
  text: string;
  error: JSONParseError | TypeValidationError;
}) => Promise<string | null>;
