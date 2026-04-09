import { AISDKError } from '@ai-sdk/provider';

const name = 'AI_InvalidMessageRoleError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class InvalidMessageRoleError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly role: string;

  constructor({
    role,
    message = `Invalid message role: '${role}'. Must be one of: "system", "user", "assistant", "tool".`,
  }: {
    role: string;
    message?: string;
  }) {
    super({ name, message });

    this.role = role;
  }

  static isInstance(error: unknown): error is InvalidMessageRoleError {
    return AISDKError.hasMarker(error, marker);
  }
}
