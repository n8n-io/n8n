import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ModelCapabilities } from "./modelcapabilities.js";
export type BaseModelCard = {
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
    type?: "base" | undefined;
};
/** @internal */
export declare const BaseModelCard$inboundSchema: z.ZodType<BaseModelCard, z.ZodTypeDef, unknown>;
export declare function baseModelCardFromJSON(jsonString: string): SafeParseResult<BaseModelCard, SDKValidationError>;
//# sourceMappingURL=basemodelcard.d.ts.map