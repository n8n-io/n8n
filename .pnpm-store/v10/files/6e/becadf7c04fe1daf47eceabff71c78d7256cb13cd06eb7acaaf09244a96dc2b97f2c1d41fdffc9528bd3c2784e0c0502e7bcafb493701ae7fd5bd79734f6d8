import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibraryOut = {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    ownerType: string;
    totalSize: number;
    nbDocuments: number;
    chunkSize: number | null;
    emoji?: string | null | undefined;
    description?: string | null | undefined;
    generatedName?: string | null | undefined;
    generatedDescription?: string | null | undefined;
    explicitUserMembersCount?: number | null | undefined;
    explicitWorkspaceMembersCount?: number | null | undefined;
    orgSharingRole?: string | null | undefined;
};
/** @internal */
export declare const LibraryOut$inboundSchema: z.ZodType<LibraryOut, z.ZodTypeDef, unknown>;
/** @internal */
export type LibraryOut$Outbound = {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    owner_id: string;
    owner_type: string;
    total_size: number;
    nb_documents: number;
    chunk_size: number | null;
    emoji?: string | null | undefined;
    description?: string | null | undefined;
    generated_name?: string | null | undefined;
    generated_description?: string | null | undefined;
    explicit_user_members_count?: number | null | undefined;
    explicit_workspace_members_count?: number | null | undefined;
    org_sharing_role?: string | null | undefined;
};
/** @internal */
export declare const LibraryOut$outboundSchema: z.ZodType<LibraryOut$Outbound, z.ZodTypeDef, LibraryOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace LibraryOut$ {
    /** @deprecated use `LibraryOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<LibraryOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `LibraryOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<LibraryOut$Outbound, z.ZodTypeDef, LibraryOut>;
    /** @deprecated use `LibraryOut$Outbound` instead. */
    type Outbound = LibraryOut$Outbound;
}
export declare function libraryOutToJSON(libraryOut: LibraryOut): string;
export declare function libraryOutFromJSON(jsonString: string): SafeParseResult<LibraryOut, SDKValidationError>;
//# sourceMappingURL=libraryout.d.ts.map