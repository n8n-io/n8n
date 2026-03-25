import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { EntityType } from "./entitytype.js";
import { ShareEnum } from "./shareenum.js";
export type SharingIn = {
    orgId: string;
    level: ShareEnum;
    /**
     * The id of the entity (user, workspace or organization) to share with
     */
    shareWithUuid: string;
    /**
     * The type of entity, used to share a library.
     */
    shareWithType: EntityType;
};
/** @internal */
export declare const SharingIn$inboundSchema: z.ZodType<SharingIn, z.ZodTypeDef, unknown>;
/** @internal */
export type SharingIn$Outbound = {
    org_id: string;
    level: string;
    share_with_uuid: string;
    share_with_type: string;
};
/** @internal */
export declare const SharingIn$outboundSchema: z.ZodType<SharingIn$Outbound, z.ZodTypeDef, SharingIn>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace SharingIn$ {
    /** @deprecated use `SharingIn$inboundSchema` instead. */
    const inboundSchema: z.ZodType<SharingIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `SharingIn$outboundSchema` instead. */
    const outboundSchema: z.ZodType<SharingIn$Outbound, z.ZodTypeDef, SharingIn>;
    /** @deprecated use `SharingIn$Outbound` instead. */
    type Outbound = SharingIn$Outbound;
}
export declare function sharingInToJSON(sharingIn: SharingIn): string;
export declare function sharingInFromJSON(jsonString: string): SafeParseResult<SharingIn, SDKValidationError>;
//# sourceMappingURL=sharingin.d.ts.map