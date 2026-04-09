import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Audio URL.
 *
 * @remarks
 *
 * Attributes:
 *     url: The URL of the audio file.
 */
export type AudioURL = {
    url: string;
};
/** @internal */
export declare const AudioURL$inboundSchema: z.ZodType<AudioURL, z.ZodTypeDef, unknown>;
/** @internal */
export type AudioURL$Outbound = {
    url: string;
};
/** @internal */
export declare const AudioURL$outboundSchema: z.ZodType<AudioURL$Outbound, z.ZodTypeDef, AudioURL>;
export declare function audioURLToJSON(audioURL: AudioURL): string;
export declare function audioURLFromJSON(jsonString: string): SafeParseResult<AudioURL, SDKValidationError>;
//# sourceMappingURL=audiourl.d.ts.map