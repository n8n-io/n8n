import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type LibraryOut = {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string | null;
    ownerType: string;
    totalSize: number;
    nbDocuments: number;
    chunkSize: number | null;
    emoji?: string | null | undefined;
    description?: string | null | undefined;
    generatedDescription?: string | null | undefined;
    explicitUserMembersCount?: number | null | undefined;
    explicitWorkspaceMembersCount?: number | null | undefined;
    orgSharingRole?: string | null | undefined;
    /**
     * Generated Name
     */
    generatedName?: string | null | undefined;
};
/** @internal */
export declare const LibraryOut$inboundSchema: z.ZodType<LibraryOut, z.ZodTypeDef, unknown>;
export declare function libraryOutFromJSON(jsonString: string): SafeParseResult<LibraryOut, SDKValidationError>;
//# sourceMappingURL=libraryout.d.ts.map