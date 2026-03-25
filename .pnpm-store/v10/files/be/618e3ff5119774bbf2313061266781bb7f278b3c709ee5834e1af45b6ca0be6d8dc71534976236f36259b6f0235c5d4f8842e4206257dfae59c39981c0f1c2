import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { EntityType } from "./entitytype.js";
export type SharingDelete = {
    orgId: string;
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
export declare const SharingDelete$inboundSchema: z.ZodType<SharingDelete, z.ZodTypeDef, unknown>;
/** @internal */
export type SharingDelete$Outbound = {
    org_id: string;
    share_with_uuid: string;
    share_with_type: string;
};
/** @internal */
export declare const SharingDelete$outboundSchema: z.ZodType<SharingDelete$Outbound, z.ZodTypeDef, SharingDelete>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace SharingDelete$ {
    /** @deprecated use `SharingDelete$inboundSchema` instead. */
    const inboundSchema: z.ZodType<SharingDelete, z.ZodTypeDef, unknown>;
    /** @deprecated use `SharingDelete$outboundSchema` instead. */
    const outboundSchema: z.ZodType<SharingDelete$Outbound, z.ZodTypeDef, SharingDelete>;
    /** @deprecated use `SharingDelete$Outbound` instead. */
    type Outbound = SharingDelete$Outbound;
}
export declare function sharingDeleteToJSON(sharingDelete: SharingDelete): string;
export declare function sharingDeleteFromJSON(jsonString: string): SafeParseResult<SharingDelete, SDKValidationError>;
//# sourceMappingURL=sharingdelete.d.ts.map