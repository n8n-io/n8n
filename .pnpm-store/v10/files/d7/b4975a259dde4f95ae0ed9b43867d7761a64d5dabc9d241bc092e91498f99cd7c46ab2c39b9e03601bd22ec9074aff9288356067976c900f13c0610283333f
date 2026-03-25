import { ICrypto, SignedHttpRequestParameters } from "./ICrypto.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { Logger } from "../logger/Logger.js";
/**
 * See eSTS docs for more info.
 * - A kid element, with the value containing an RFC 7638-compliant JWK thumbprint that is base64 encoded.
 * -  xms_ksl element, representing the storage location of the key's secret component on the client device. One of two values:
 *      - sw: software storage
 *      - uhw: hardware storage
 */
type ReqCnf = {
    kid: string;
    xms_ksl: KeyLocation;
};
export type ReqCnfData = {
    kid: string;
    reqCnfString: string;
};
declare const KeyLocation: {
    readonly SW: "sw";
    readonly UHW: "uhw";
};
export type KeyLocation = (typeof KeyLocation)[keyof typeof KeyLocation];
/** @internal */
export declare class PopTokenGenerator {
    private cryptoUtils;
    private performanceClient?;
    constructor(cryptoUtils: ICrypto, performanceClient?: IPerformanceClient);
    /**
     * Generates the req_cnf validated at the RP in the POP protocol for SHR parameters
     * and returns an object containing the keyid, the full req_cnf string and the req_cnf string hash
     * @param request
     * @returns
     */
    generateCnf(request: SignedHttpRequestParameters, logger: Logger): Promise<ReqCnfData>;
    /**
     * Generates key_id for a SHR token request
     * @param request
     * @returns
     */
    generateKid(request: SignedHttpRequestParameters): Promise<ReqCnf>;
    /**
     * Signs the POP access_token with the local generated key-pair
     * @param accessToken
     * @param request
     * @returns
     */
    signPopToken(accessToken: string, keyId: string, request: SignedHttpRequestParameters): Promise<string>;
    /**
     * Utility function to generate the signed JWT for an access_token
     * @param payload
     * @param kid
     * @param request
     * @param claims
     * @returns
     */
    signPayload(payload: string, keyId: string, request: SignedHttpRequestParameters, claims?: object): Promise<string>;
}
export {};
//# sourceMappingURL=PopTokenGenerator.d.ts.map