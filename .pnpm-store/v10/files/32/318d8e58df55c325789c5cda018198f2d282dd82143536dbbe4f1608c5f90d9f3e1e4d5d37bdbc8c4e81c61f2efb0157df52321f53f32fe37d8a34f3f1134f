import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ModelCapabilities = {
    completionChat: boolean | undefined;
    functionCalling: boolean | undefined;
    completionFim: boolean | undefined;
    fineTuning: boolean | undefined;
    vision: boolean | undefined;
    ocr: boolean | undefined;
    classification: boolean | undefined;
    moderation: boolean | undefined;
    audio: boolean | undefined;
    audioTranscription: boolean | undefined;
};
/** @internal */
export declare const ModelCapabilities$inboundSchema: z.ZodType<ModelCapabilities, z.ZodTypeDef, unknown>;
export declare function modelCapabilitiesFromJSON(jsonString: string): SafeParseResult<ModelCapabilities, SDKValidationError>;
//# sourceMappingURL=modelcapabilities.d.ts.map