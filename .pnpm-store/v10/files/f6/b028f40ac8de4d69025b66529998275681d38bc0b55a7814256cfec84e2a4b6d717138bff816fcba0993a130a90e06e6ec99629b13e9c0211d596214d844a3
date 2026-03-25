import { ICrypto } from "../crypto/ICrypto.js";
/**
 * Type which defines the object that is stringified, encoded and sent in the state value.
 * Contains the following:
 * - id - unique identifier for this request
 * - ts - timestamp for the time the request was made. Used to ensure that token expiration is not calculated incorrectly.
 * - platformState - string value sent from the platform.
 */
export type LibraryStateObject = {
    id: string;
    meta?: Record<string, string>;
};
/**
 * Type which defines the stringified and encoded object sent to the service in the authorize request.
 */
export type RequestStateObject = {
    userRequestState: string;
    libraryState: LibraryStateObject;
};
/**
 * Class which provides helpers for OAuth 2.0 protocol specific values
 */
export declare class ProtocolUtils {
    /**
     * Appends user state with random guid, or returns random guid.
     * @param userState
     * @param randomGuid
     */
    static setRequestState(cryptoObj: ICrypto, userState?: string, meta?: Record<string, string>): string;
    /**
     * Generates the state value used by the common library.
     * @param randomGuid
     * @param cryptoObj
     */
    static generateLibraryState(cryptoObj: ICrypto, meta?: Record<string, string>): string;
    /**
     * Parses the state into the RequestStateObject, which contains the LibraryState info and the state passed by the user.
     * @param state
     * @param cryptoObj
     */
    static parseRequestState(cryptoObj: ICrypto, state: string): RequestStateObject;
}
//# sourceMappingURL=ProtocolUtils.d.ts.map