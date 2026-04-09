import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type RealtimeTranscriptionInputAudioAppend = {
    type?: "input_audio.append" | undefined;
    /**
     * Base64-encoded raw PCM bytes matching the current audio_format. Max decoded size: 262144 bytes.
     */
    audio: string;
};
/** @internal */
export declare const RealtimeTranscriptionInputAudioAppend$inboundSchema: z.ZodType<RealtimeTranscriptionInputAudioAppend, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionInputAudioAppend$Outbound = {
    type: "input_audio.append";
    audio: string;
};
/** @internal */
export declare const RealtimeTranscriptionInputAudioAppend$outboundSchema: z.ZodType<RealtimeTranscriptionInputAudioAppend$Outbound, z.ZodTypeDef, RealtimeTranscriptionInputAudioAppend>;
export declare function realtimeTranscriptionInputAudioAppendToJSON(realtimeTranscriptionInputAudioAppend: RealtimeTranscriptionInputAudioAppend): string;
export declare function realtimeTranscriptionInputAudioAppendFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionInputAudioAppend, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptioninputaudioappend.d.ts.map