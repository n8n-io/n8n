import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ModelCapabilities } from "./modelcapabilities.js";
/**
 * Extra fields for fine-tuned models.
 */
export type FTModelCard = {
    id: string;
    object: string | undefined;
    created?: number | undefined;
    ownedBy: string | undefined;
    capabilities: ModelCapabilities;
    name?: string | null | undefined;
    description?: string | null | undefined;
    maxContextLength: number | undefined;
    aliases?: Array<string> | undefined;
    deprecation?: Date | null | undefined;
    deprecationReplacementModel?: string | null | undefined;
    defaultModelTemperature?: number | null | undefined;
    type?: "fine-tuned" | undefined;
    job: string;
    root: string;
    archived: boolean | undefined;
};
/** @internal */
export declare const FTModelCard$inboundSchema: z.ZodType<FTModelCard, z.ZodTypeDef, unknown>;
export declare function ftModelCardFromJSON(jsonString: string): SafeParseResult<FTModelCard, SDKValidationError>;
//# sourceMappingURL=ftmodelcard.d.ts.map