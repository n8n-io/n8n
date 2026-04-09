import { InvalidPromptError } from '@ai-sdk/provider';
import {
  ModelMessage,
  safeValidateTypes,
  SystemModelMessage,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { modelMessageSchema } from './message';
import { Prompt } from './prompt';
import { asArray } from '../util/as-array';

export type StandardizedPrompt = {
  /**
   * System message.
   */
  system?: string | SystemModelMessage | Array<SystemModelMessage>;

  /**
   * Messages.
   */
  messages: ModelMessage[];
};

export async function standardizePrompt(
  prompt: Prompt,
): Promise<StandardizedPrompt> {
  if (prompt.prompt == null && prompt.messages == null) {
    throw new InvalidPromptError({
      prompt,
      message: 'prompt or messages must be defined',
    });
  }

  if (prompt.prompt != null && prompt.messages != null) {
    throw new InvalidPromptError({
      prompt,
      message: 'prompt and messages cannot be defined at the same time',
    });
  }

  // validate that system is a string or a SystemModelMessage
  if (
    prompt.system != null &&
    typeof prompt.system !== 'string' &&
    !asArray(prompt.system).every(
      message =>
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        message.role === 'system',
    )
  ) {
    throw new InvalidPromptError({
      prompt,
      message:
        'system must be a string, SystemModelMessage, or array of SystemModelMessage',
    });
  }

  let messages: ModelMessage[];

  if (prompt.prompt != null && typeof prompt.prompt === 'string') {
    messages = [{ role: 'user', content: prompt.prompt }];
  } else if (prompt.prompt != null && Array.isArray(prompt.prompt)) {
    messages = prompt.prompt;
  } else if (prompt.messages != null) {
    messages = prompt.messages;
  } else {
    throw new InvalidPromptError({
      prompt,
      message: 'prompt or messages must be defined',
    });
  }

  if (messages.length === 0) {
    throw new InvalidPromptError({
      prompt,
      message: 'messages must not be empty',
    });
  }

  const validationResult = await safeValidateTypes({
    value: messages,
    schema: z.array(modelMessageSchema),
  });

  if (!validationResult.success) {
    throw new InvalidPromptError({
      prompt,
      message: 'The messages do not match the ModelMessage[] schema.',
      cause: validationResult.error,
    });
  }

  return {
    messages,
    system: prompt.system,
  };
}
