import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FTModelCapabilitiesOut } from "./ftmodelcapabilitiesout.js";
export type CompletionFTModelOut = {
    id: string;
    object?: "model" | undefined;
    created: number;
    ownedBy: string;
    workspaceId: string;
    root: string;
    rootVersion: string;
    archived: boolean;
    name?: string | null | undefined;
    description?: string | null | undefined;
    capabilities: FTModelCapabilitiesOut;
    maxContextLength: number | undefined;
    aliases?: Array<string> | undefined;
    job: string;
    modelType?: "completion" | undefined;
};
/** @internal */
export declare const CompletionFTModelOut$inboundSchema: z.ZodType<CompletionFTModelOut, z.ZodTypeDef, unknown>;
export declare function completionFTModelOutFromJSON(jsonString: string): SafeParseResult<CompletionFTModelOut, SDKValidationError>;
//# sourceMappingURL=completionftmodelout.d.ts.map