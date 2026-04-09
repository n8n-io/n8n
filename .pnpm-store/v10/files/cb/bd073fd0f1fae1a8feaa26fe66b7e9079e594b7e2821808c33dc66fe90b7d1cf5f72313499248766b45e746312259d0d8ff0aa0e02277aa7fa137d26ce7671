import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierTargetOut } from "./classifiertargetout.js";
import { FTModelCapabilitiesOut } from "./ftmodelcapabilitiesout.js";
export type ClassifierFTModelOut = {
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
    classifierTargets: Array<ClassifierTargetOut>;
    modelType?: "classifier" | undefined;
};
/** @internal */
export declare const ClassifierFTModelOut$inboundSchema: z.ZodType<ClassifierFTModelOut, z.ZodTypeDef, unknown>;
export declare function classifierFTModelOutFromJSON(jsonString: string): SafeParseResult<ClassifierFTModelOut, SDKValidationError>;
//# sourceMappingURL=classifierftmodelout.d.ts.map