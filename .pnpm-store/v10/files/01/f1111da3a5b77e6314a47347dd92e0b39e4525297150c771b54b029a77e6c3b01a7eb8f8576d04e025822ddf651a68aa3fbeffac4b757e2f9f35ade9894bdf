import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Dataset = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    name: string;
    description: string;
    ownerId: string;
    workspaceId: string;
};
/** @internal */
export declare const Dataset$inboundSchema: z.ZodType<Dataset, z.ZodTypeDef, unknown>;
export declare function datasetFromJSON(jsonString: string): SafeParseResult<Dataset, SDKValidationError>;
//# sourceMappingURL=dataset.d.ts.map