import { AIMessageChunk } from "../messages/ai.js";
import { Namespace } from "../utils/namespace.js";

//#region src/errors/index.d.ts
type LangChainErrorCodes = "CONTEXT_OVERFLOW" | "INVALID_PROMPT_INPUT" | "INVALID_TOOL_RESULTS" | "MESSAGE_COERCION_FAILURE" | "MODEL_AUTHENTICATION" | "MODEL_NOT_FOUND" | "MODEL_RATE_LIMIT" | "OUTPUT_PARSING_FAILURE" | "MODEL_ABORTED";
/** @deprecated Subclass LangChainError instead */
declare function addLangChainErrorFields(error: any, lc_error_code: LangChainErrorCodes): any;
/** The error namespace for all LangChain errors */
declare const ns: Namespace;
declare const LangChainError_base: ErrorConstructor & {
  isInstance: <T extends abstract new (...args: any[]) => any>(this: T, obj: unknown) => obj is InstanceType<T>;
};
/**
 * Base error class for all LangChain errors.
 *
 * All LangChain error classes should extend this class (directly or
 * indirectly). Use `LangChainError.isInstance(obj)` to check if an
 * object is any LangChain error.
 *
 * @example
 * ```typescript
 * try {
 *   await model.invoke("hello");
 * } catch (error) {
 *   if (LangChainError.isInstance(error)) {
 *     console.log("Got a LangChain error:", error.message);
 *   }
 * }
 * ```
 */
declare class LangChainError extends LangChainError_base {
  readonly name: string;
  constructor(message?: string);
}
declare const ModelAbortError_base: typeof LangChainError & {
  isInstance: <T extends abstract new (...args: any[]) => any>(this: T, obj: unknown) => obj is InstanceType<T>;
};
/**
 * Error class representing an aborted model operation in LangChain.
 *
 * This error is thrown when a model operation (such as invocation, streaming, or batching)
 * is cancelled before it completes, commonly due to a user-initiated abort signal
 * (e.g., via an AbortController) or an upstream cancellation event.
 *
 * The ModelAbortError provides access to any partial output the model may have produced
 * before the operation was interrupted, which can be useful for resuming work, debugging,
 * or presenting incomplete results to users.
 *
 * @remarks
 * - The `partialOutput` field includes message content that was generated prior to the abort,
 *   such as a partial AIMessageChunk.
 * - This error extends the {@link LangChainError} base class with the marker `"model-abort"`.
 *
 * @example
 * ```typescript
 * try {
 *   await model.invoke(input, { signal: abortController.signal });
 * } catch (err) {
 *   if (ModelAbortError.isInstance(err)) {
 *     // Handle user cancellation, check err.partialOutput if needed
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 */
declare class ModelAbortError extends ModelAbortError_base {
  readonly name = "ModelAbortError";
  /**
   * The partial message output that was produced before the operation was aborted.
   * This is typically an AIMessageChunk, or could be undefined if no output was available.
   */
  readonly partialOutput?: AIMessageChunk;
  /**
   * Constructs a new ModelAbortError instance.
   *
   * @param message - A human-readable message describing the abort event.
   * @param partialOutput - Any partial model output generated before the abort (optional).
   */
  constructor(message: string, partialOutput?: AIMessageChunk);
}
declare const ContextOverflowError_base: typeof LangChainError & {
  isInstance: <T extends abstract new (...args: any[]) => any>(this: T, obj: unknown) => obj is InstanceType<T>;
};
/**
 * Error class representing a context window overflow in a language model operation.
 *
 * This error is thrown when the combined input to a language model (such as prompt tokens,
 * historical messages, and/or instructions) exceeds the maximum context window or token limit
 * that the model can process in a single request. Most models have defined upper limits for the number of
 * tokens or characters allowed in a context, and exceeding this limit will prevent
 * the operation from proceeding.
 *
 * The {@link ContextOverflowError} extends the {@link LangChainError} base class with
 * the marker `"context-overflow"`.
 *
 * @remarks
 * - Use this error to programmatically identify cases where a user request, prompt, or input
 *   sequence is too long to be handled by the target model.
 * - Model providers and framework integrations should throw this error if they detect
 *   a request cannot be processed due to its size.
 *
 * @example
 * ```typescript
 * try {
 *   await model.invoke(veryLongInput);
 * } catch (err) {
 *   if (ContextOverflowError.isInstance(err)) {
 *     // Handle overflow, e.g., prompt user to shorten input or truncate text
 *     console.warn("Model context overflow:", err.message);
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 */
declare class ContextOverflowError extends ContextOverflowError_base {
  readonly name = "ContextOverflowError";
  /**
   * The underlying error that caused this {@link ContextOverflowError}, if any.
   *
   * This property is optionally set when wrapping a lower-level error using {@link ContextOverflowError.fromError}.
   * It allows error handlers to access or inspect the original error that led to the context overflow.
   */
  cause?: Error;
  constructor(message?: string);
  /**
   * Creates a new {@link ContextOverflowError} instance from an existing error.
   *
   * This static utility copies the message from the provided error and
   * attaches the original error as the {@link ContextOverflowError.cause} property,
   * enabling error handlers to inspect or propagate the original failure.
   *
   * @param obj - The original error object causing the context overflow.
   * @returns A new {@link ContextOverflowError} instance with the original error set as its cause.
   *
   * @example
   * ```typescript
   * try {
   *   await model.invoke(input);
   * } catch (err) {
   *   throw ContextOverflowError.fromError(err);
   * }
   * ```
   */
  static fromError(obj: Error): ContextOverflowError;
}
//#endregion
export { ContextOverflowError, LangChainError, LangChainErrorCodes, ModelAbortError, addLangChainErrorFields, ns };
//# sourceMappingURL=index.d.ts.map