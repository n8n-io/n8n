import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FileT, FileT$Outbound } from "./file.js";
import { TimestampGranularity } from "./timestampgranularity.js";
export type AudioTranscriptionRequest = {
    model: string;
    file?: FileT | Blob | undefined;
    /**
     * Url of a file to be transcribed
     */
    fileUrl?: string | null | undefined;
    /**
     * ID of a file uploaded to /v1/files
     */
    fileId?: string | null | undefined;
    /**
     * Language of the audio, e.g. 'en'. Providing the language can boost accuracy.
     */
    language?: string | null | undefined;
    temperature?: number | null | undefined;
    stream?: false | undefined;
    /**
     * Granularities of timestamps to include in the response.
     */
    timestampGranularities?: Array<TimestampGranularity> | undefined;
};
/** @internal */
export declare const AudioTranscriptionRequest$inboundSchema: z.ZodType<AudioTranscriptionRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AudioTranscriptionRequest$Outbound = {
    model: string;
    file?: FileT$Outbound | Blob | undefined;
    file_url?: string | null | undefined;
    file_id?: string | null | undefined;
    language?: string | null | undefined;
    temperature?: number | null | undefined;
    stream: false;
    timestamp_granularities?: Array<string> | undefined;
};
/** @internal */
export declare const AudioTranscriptionRequest$outboundSchema: z.ZodType<AudioTranscriptionRequest$Outbound, z.ZodTypeDef, AudioTranscriptionRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AudioTranscriptionRequest$ {
    /** @deprecated use `AudioTranscriptionRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AudioTranscriptionRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AudioTranscriptionRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AudioTranscriptionRequest$Outbound, z.ZodTypeDef, AudioTranscriptionRequest>;
    /** @deprecated use `AudioTranscriptionRequest$Outbound` instead. */
    type Outbound = AudioTranscriptionRequest$Outbound;
}
export declare function audioTranscriptionRequestToJSON(audioTranscriptionRequest: AudioTranscriptionRequest): string;
export declare function audioTranscriptionRequestFromJSON(jsonString: string): SafeParseResult<AudioTranscriptionRequest, SDKValidationError>;
//# sourceMappingURL=audiotranscriptionrequest.d.ts.map