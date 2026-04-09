import * as z from "zod/v3";
import { FileT, FileT$Outbound } from "./file.js";
import { TimestampGranularity } from "./timestampgranularity.js";
export type AudioTranscriptionRequest = {
    /**
     * ID of the model to be used.
     */
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
    diarize?: boolean | undefined;
    contextBias?: Array<string> | undefined;
    /**
     * Granularities of timestamps to include in the response.
     */
    timestampGranularities?: Array<TimestampGranularity> | undefined;
};
/** @internal */
export type AudioTranscriptionRequest$Outbound = {
    model: string;
    file?: FileT$Outbound | Blob | undefined;
    file_url?: string | null | undefined;
    file_id?: string | null | undefined;
    language?: string | null | undefined;
    temperature?: number | null | undefined;
    stream: false;
    diarize: boolean;
    context_bias?: Array<string> | undefined;
    timestamp_granularities?: Array<string> | undefined;
};
/** @internal */
export declare const AudioTranscriptionRequest$outboundSchema: z.ZodType<AudioTranscriptionRequest$Outbound, z.ZodTypeDef, AudioTranscriptionRequest>;
export declare function audioTranscriptionRequestToJSON(audioTranscriptionRequest: AudioTranscriptionRequest): string;
//# sourceMappingURL=audiotranscriptionrequest.d.ts.map