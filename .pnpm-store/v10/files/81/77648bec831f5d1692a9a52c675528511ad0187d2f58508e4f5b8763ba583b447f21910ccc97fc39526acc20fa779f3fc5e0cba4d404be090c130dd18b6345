import * as z from "zod/v3";
import { EntityType } from "./entitytype.js";
export type SharingDelete = {
    orgId?: string | null | undefined;
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
export type SharingDelete$Outbound = {
    org_id?: string | null | undefined;
    share_with_uuid: string;
    share_with_type: string;
};
/** @internal */
export declare const SharingDelete$outboundSchema: z.ZodType<SharingDelete$Outbound, z.ZodTypeDef, SharingDelete>;
export declare function sharingDeleteToJSON(sharingDelete: SharingDelete): string;
//# sourceMappingURL=sharingdelete.d.ts.map