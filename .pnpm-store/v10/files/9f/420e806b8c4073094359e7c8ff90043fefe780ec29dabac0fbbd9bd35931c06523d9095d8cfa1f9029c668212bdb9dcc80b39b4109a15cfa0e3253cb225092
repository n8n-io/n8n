import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FileT, FileT$Outbound } from "./file.js";
import { TimestampGranularity } from "./timestampgranularity.js";
export type AudioTranscriptionRequestStream = {
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
    stream?: true | undefined;
    /**
     * Granularities of timestamps to include in the response.
     */
    timestampGranularities?: Array<TimestampGranularity> | undefined;
};
/** @internal */
export declare const AudioTranscriptionRequestStream$inboundSchema: z.ZodType<AudioTranscriptionRequestStream, z.ZodTypeDef, unknown>;
/** @internal */
export type AudioTranscriptionRequestStream$Outbound = {
    model: string;
    file?: FileT$Outbound | Blob | undefined;
    file_url?: string | null | undefined;
    file_id?: string | null | undefined;
    language?: string | null | undefined;
    temperature?: number | null | undefined;
    stream: true;
    timestamp_granularities?: Array<string> | undefined;
};
/** @internal */
export declare const AudioTranscriptionRequestStream$outboundSchema: z.ZodType<AudioTranscriptionRequestStream$Outbound, z.ZodTypeDef, AudioTranscriptionRequestStream>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AudioTranscriptionRequestStream$ {
    /** @deprecated use `AudioTranscriptionRequestStream$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AudioTranscriptionRequestStream, z.ZodTypeDef, unknown>;
    /** @deprecated use `AudioTranscriptionRequestStream$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AudioTranscriptionRequestStream$Outbound, z.ZodTypeDef, AudioTranscriptionRequestStream>;
    /** @deprecated use `AudioTranscriptionRequestStream$Outbound` instead. */
    type Outbound = AudioTranscriptionRequestStream$Outbound;
}
export declare function audioTranscriptionRequestStreamToJSON(audioTranscriptionRequestStream: AudioTranscriptionRequestStream): string;
export declare function audioTranscriptionRequestStreamFromJSON(jsonString: string): SafeParseResult<AudioTranscriptionRequestStream, SDKValidationError>;
//# sourceMappingURL=audiotranscriptionrequeststream.d.ts.map