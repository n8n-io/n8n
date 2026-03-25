import { FullOperationResponse, OperationResponseMap } from "./interfaces.js";
/**
 * The union of all possible types for a primitive response body.
 * @internal
 */
export type BodyPrimitive = number | string | boolean | Date | Uint8Array | undefined | null;
/**
 * A type guard for a primitive response body.
 * @param value - Value to test
 *
 * @internal
 */
export declare function isPrimitiveBody(value: unknown, mapperTypeName?: string): value is BodyPrimitive;
/**
 * Returns true if the given string is in ISO 8601 format.
 * @param value - The value to be validated for ISO 8601 duration format.
 * @internal
 */
export declare function isDuration(value: string): boolean;
/**
 * Returns true if the provided uuid is valid.
 *
 * @param uuid - The uuid that needs to be validated.
 *
 * @internal
 */
export declare function isValidUuid(uuid: string): boolean;
/**
 * Take a `FullOperationResponse` and turn it into a flat
 * response object to hand back to the consumer.
 * @param fullResponse - The processed response from the operation request
 * @param responseSpec - The response map from the OperationSpec
 *
 * @internal
 */
export declare function flattenResponse(fullResponse: FullOperationResponse, responseSpec: OperationResponseMap | undefined): unknown;
//# sourceMappingURL=utils.d.ts.map