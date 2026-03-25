import { Event, EventHint, Exception, ParameterizedString, SeverityLevel, StackParser } from '@sentry/core';
/**
 * This function creates an exception from a JavaScript Error
 */
export declare function exceptionFromError(stackParser: StackParser, ex: Error): Exception;
/**
 * Extracts from errors what we use as the exception `type` in error events.
 *
 * Usually, this is the `name` property on Error objects but WASM errors need to be treated differently.
 */
export declare function extractType(ex: Error & {
    message: {
        error?: Error;
    };
}): string | undefined;
/**
 * There are cases where stacktrace.message is an Event object
 * https://github.com/getsentry/sentry-javascript/issues/1949
 * In this specific case we try to extract stacktrace.message.error.message
 */
export declare function extractMessage(ex: Error & {
    message: {
        error?: Error;
    };
}): string;
/**
 * Creates an {@link Event} from all inputs to `captureException` and non-primitive inputs to `captureMessage`.
 * @hidden
 */
export declare function eventFromException(stackParser: StackParser, exception: unknown, hint?: EventHint, attachStacktrace?: boolean): PromiseLike<Event>;
/**
 * Builds and Event from a Message
 * @hidden
 */
export declare function eventFromMessage(stackParser: StackParser, message: ParameterizedString, level?: SeverityLevel, hint?: EventHint, attachStacktrace?: boolean): PromiseLike<Event>;
/**
 * @hidden
 */
export declare function eventFromUnknownInput(stackParser: StackParser, exception: unknown, syntheticException?: Error, attachStacktrace?: boolean, isUnhandledRejection?: boolean): Event;
//# sourceMappingURL=eventbuilder.d.ts.map
