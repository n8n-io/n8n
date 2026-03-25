/**
 * A bitvector representing a traits object.
 *
 * Vector index to trait:
 * 0 - httpLabel
 * 1 - idempotent
 * 2 - idempotencyToken
 * 3 - sensitive
 * 4 - httpPayload
 * 5 - httpResponseCode
 * 6 - httpQueryParams
 *
 * The singular trait values are enumerated for quick identification, but
 * combination values are left to the `number` union type.
 *
 * @public
 */
export type TraitBitVector = HttpLabelBitMask | IdempotentBitMask | IdempotencyTokenBitMask | SensitiveBitMask | HttpPayloadBitMask | HttpResponseCodeBitMask | HttpQueryParamsBitMask | number;
/**
 * @public
 */
export type HttpLabelBitMask = 1;
/**
 * @public
 */
export type IdempotentBitMask = 2;
/**
 * @public
 */
export type IdempotencyTokenBitMask = 4;
/**
 * @public
 */
export type SensitiveBitMask = 8;
/**
 * @public
 */
export type HttpPayloadBitMask = 16;
/**
 * @public
 */
export type HttpResponseCodeBitMask = 32;
/**
 * @public
 */
export type HttpQueryParamsBitMask = 64;
