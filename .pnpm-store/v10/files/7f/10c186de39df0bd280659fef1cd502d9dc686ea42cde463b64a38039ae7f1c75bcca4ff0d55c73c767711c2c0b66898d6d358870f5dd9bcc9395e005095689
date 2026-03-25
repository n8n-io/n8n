import type { DeserializeHandler, DeserializeHandlerArguments, HandlerExecutionContext } from "@smithy/types";
import type { PreviouslyResolved } from "./schema-middleware-types";
/**
 * @internal
 */
export declare const schemaDeserializationMiddleware: <O>(config: PreviouslyResolved) => (next: DeserializeHandler<any, any>, context: HandlerExecutionContext) => (args: DeserializeHandlerArguments<any>) => Promise<{
    response: unknown;
    output: O;
}>;
