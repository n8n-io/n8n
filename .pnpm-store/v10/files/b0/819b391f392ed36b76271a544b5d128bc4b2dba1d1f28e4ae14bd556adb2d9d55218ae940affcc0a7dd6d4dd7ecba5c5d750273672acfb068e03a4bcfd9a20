import type { HandlerExecutionContext, SerializeHandler, SerializeHandlerArguments } from "@smithy/types";
import type { PreviouslyResolved } from "./schema-middleware-types";
/**
 * @internal
 */
export declare const schemaSerializationMiddleware: (config: PreviouslyResolved) => (next: SerializeHandler<any, any>, context: HandlerExecutionContext) => (args: SerializeHandlerArguments<any>) => Promise<import("@smithy/types").SerializeHandlerOutput<any>>;
