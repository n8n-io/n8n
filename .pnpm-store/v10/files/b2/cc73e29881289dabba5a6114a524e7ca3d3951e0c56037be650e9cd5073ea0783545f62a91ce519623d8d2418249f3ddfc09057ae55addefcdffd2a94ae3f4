import type { JWSHeaderParameters, JWTClaimVerificationOptions, JWTPayload } from '../types';
import { ProduceJWT } from './produce';
export interface UnsecuredResult {
    payload: JWTPayload;
    header: JWSHeaderParameters;
}
/**
 * The UnsecuredJWT class is a utility for dealing with `{ "alg": "none" }` Unsecured JWTs.
 *
 */
export declare class UnsecuredJWT extends ProduceJWT {
    /** Encodes the Unsecured JWT. */
    encode(): string;
    /**
     * Decodes an unsecured JWT.
     *
     * @param jwt Unsecured JWT to decode the payload of.
     * @param options JWT Claims Set validation options.
     */
    static decode(jwt: string, options?: JWTClaimVerificationOptions): UnsecuredResult;
}
