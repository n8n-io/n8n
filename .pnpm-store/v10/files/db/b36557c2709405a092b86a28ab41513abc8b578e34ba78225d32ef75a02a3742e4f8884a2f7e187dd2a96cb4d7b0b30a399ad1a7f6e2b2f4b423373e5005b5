import { JsonWebTokenTypes } from "../utils/Constants.js";
export type JoseHeaderOptions = {
    typ?: JsonWebTokenTypes;
    alg?: string;
    kid?: string;
};
/** @internal */
export declare class JoseHeader {
    typ?: JsonWebTokenTypes;
    alg?: string;
    kid?: string;
    constructor(options: JoseHeaderOptions);
    /**
     * Builds SignedHttpRequest formatted JOSE Header from the
     * JOSE Header options provided or previously set on the object and returns
     * the stringified header object.
     * Throws if keyId or algorithm aren't provided since they are required for Access Token Binding.
     * @param shrHeaderOptions
     * @returns
     */
    static getShrHeaderString(shrHeaderOptions: JoseHeaderOptions): string;
}
//# sourceMappingURL=JoseHeader.d.ts.map