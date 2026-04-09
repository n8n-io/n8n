import * as z from "zod/v3";
import { EntityType } from "./entitytype.js";
import { ShareEnum } from "./shareenum.js";
export type SharingIn = {
    orgId?: string | null | undefined;
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
export type SharingIn$Outbound = {
    org_id?: string | null | undefined;
    level: string;
    share_with_uuid: string;
    share_with_type: string;
};
/** @internal */
export declare const SharingIn$outboundSchema: z.ZodType<SharingIn$Outbound, z.ZodTypeDef, SharingIn>;
export declare function sharingInToJSON(sharingIn: SharingIn): string;
//# sourceMappingURL=sharingin.d.ts.map