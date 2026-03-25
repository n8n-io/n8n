import { PkceCodes } from "@azure/msal-common/node";
/**
 * https://tools.ietf.org/html/rfc7636#page-8
 */
export declare class PkceGenerator {
    private hashUtils;
    constructor();
    /**
     * generates the codeVerfier and the challenge from the codeVerfier
     * reference: https://tools.ietf.org/html/rfc7636#section-4.1 and https://tools.ietf.org/html/rfc7636#section-4.2
     */
    generatePkceCodes(): Promise<PkceCodes>;
    /**
     * generates the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.1
     */
    private generateCodeVerifier;
    /**
     * generate the challenge from the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.2
     * @param codeVerifier
     */
    private generateCodeChallengeFromVerifier;
}
//# sourceMappingURL=PkceGenerator.d.ts.map