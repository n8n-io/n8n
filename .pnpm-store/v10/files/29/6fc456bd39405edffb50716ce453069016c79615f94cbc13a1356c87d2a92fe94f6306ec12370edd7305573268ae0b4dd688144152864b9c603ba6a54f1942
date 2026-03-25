//#region src/testing/matchers.d.ts
/**
 * The `this` context that Vitest and Jest provide to custom matchers
 * via `expect.extend`.
 *
 * Compatible with both frameworks:
 * - https://vitest.dev/guide/extending-matchers.html
 * - https://jestjs.io/docs/expect#expectextendmatchers
 */
interface ExpectExtendThis {
  isNot?: boolean;
  equals(a: unknown, b: unknown): boolean;
  utils: {
    matcherHint(name: string, received?: string, expected?: string): string;
    printReceived(value: unknown): string;
    printExpected(value: unknown): string;
  };
}
interface ExpectationResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}
declare const toBeHumanMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
declare const toBeAIMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
declare const toBeSystemMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
declare const toBeToolMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
declare function toHaveToolCalls(this: ExpectExtendThis, received: unknown, expected: Array<Record<string, unknown>>): ExpectationResult;
declare function toHaveToolCallCount(this: ExpectExtendThis, received: unknown, expected: number): ExpectationResult;
declare function toContainToolCall(this: ExpectExtendThis, received: unknown, expected: Record<string, unknown>): ExpectationResult;
declare function toHaveToolMessages(this: ExpectExtendThis, received: unknown, expected: Array<Record<string, unknown>>): ExpectationResult;
declare function toHaveBeenInterrupted(this: ExpectExtendThis, received: unknown, expectedValue?: unknown): ExpectationResult;
declare function toHaveStructuredResponse(this: ExpectExtendThis, received: unknown, expected?: Record<string, unknown>): ExpectationResult;
/**
 * All matcher functions bundled for convenient use with `expect.extend()`.
 */
declare const langchainMatchers: {
  toBeHumanMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
  toBeAIMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
  toBeSystemMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
  toBeToolMessage: (this: ExpectExtendThis, received: unknown, expected?: string | Record<string, unknown> | undefined) => ExpectationResult;
  toHaveToolCalls: typeof toHaveToolCalls;
  toHaveToolCallCount: typeof toHaveToolCallCount;
  toContainToolCall: typeof toContainToolCall;
  toHaveToolMessages: typeof toHaveToolMessages;
  toHaveBeenInterrupted: typeof toHaveBeenInterrupted;
  toHaveStructuredResponse: typeof toHaveStructuredResponse;
};
interface LangChainMatchers<R = unknown> {
  toBeHumanMessage(expected?: string | {
    content?: string;
    id?: string;
  }): R;
  toBeAIMessage(expected?: string | {
    content?: string;
    name?: string;
  }): R;
  toBeSystemMessage(expected?: string | {
    content?: string;
    additional_kwargs?: object;
  }): R;
  toBeToolMessage(expected?: string | {
    content?: string;
    name?: string;
    status?: string;
    tool_call_id?: string;
  }): R;
  toHaveToolCalls(expected: Array<{
    name?: string;
    id?: string;
    args?: Record<string, unknown>;
  }>): R;
  toHaveToolCallCount(expected: number): R;
  toContainToolCall(expected: {
    name?: string;
    id?: string;
    args?: Record<string, unknown>;
  }): R;
  toHaveToolMessages(expected: Array<{
    content?: string;
    name?: string;
    status?: string;
    tool_call_id?: string;
  }>): R;
  toHaveBeenInterrupted(expectedValue?: unknown): R;
  toHaveStructuredResponse(expected?: Record<string, unknown>): R;
}
declare module "vitest" {
  interface Matchers<T = any> extends LangChainMatchers<T> {}
}
//#endregion
export { LangChainMatchers, langchainMatchers, toBeAIMessage, toBeHumanMessage, toBeSystemMessage, toBeToolMessage, toContainToolCall, toHaveBeenInterrupted, toHaveStructuredResponse, toHaveToolCallCount, toHaveToolCalls, toHaveToolMessages };
//# sourceMappingURL=matchers.d.ts.map