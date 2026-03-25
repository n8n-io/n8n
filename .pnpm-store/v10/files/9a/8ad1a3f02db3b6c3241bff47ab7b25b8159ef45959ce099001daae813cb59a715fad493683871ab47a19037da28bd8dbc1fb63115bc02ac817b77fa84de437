import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Security = {
    apiKey?: string | undefined;
};
/** @internal */
export declare const Security$inboundSchema: z.ZodType<Security, z.ZodTypeDef, unknown>;
/** @internal */
export type Security$Outbound = {
    ApiKey?: string | undefined;
};
/** @internal */
export declare const Security$outboundSchema: z.ZodType<Security$Outbound, z.ZodTypeDef, Security>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Security$ {
    /** @deprecated use `Security$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Security, z.ZodTypeDef, unknown>;
    /** @deprecated use `Security$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Security$Outbound, z.ZodTypeDef, Security>;
    /** @deprecated use `Security$Outbound` instead. */
    type Outbound = Security$Outbound;
}
export declare function securityToJSON(security: Security): string;
export declare function securityFromJSON(jsonString: string): SafeParseResult<Security, SDKValidationError>;
//# sourceMappingURL=security.d.ts.map