import * as z from "zod/v3";
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
    diarize?: boolean | undefined;
    contextBias?: Array<string> | undefined;
    /**
     * Granularities of timestamps to include in the response.
     */
    timestampGranularities?: Array<TimestampGranularity> | undefined;
};
/** @internal */
export type AudioTranscriptionRequestStream$Outbound = {
    model: string;
    file?: FileT$Outbound | Blob | undefined;
    file_url?: string | null | undefined;
    file_id?: string | null | undefined;
    language?: string | null | undefined;
    temperature?: number | null | undefined;
    stream: true;
    diarize: boolean;
    context_bias?: Array<string> | undefined;
    timestamp_granularities?: Array<string> | undefined;
};
/** @internal */
export declare const AudioTranscriptionRequestStream$outboundSchema: z.ZodType<AudioTranscriptionRequestStream$Outbound, z.ZodTypeDef, AudioTranscriptionRequestStream>;
export declare function audioTranscriptionRequestStreamToJSON(audioTranscriptionRequestStream: AudioTranscriptionRequestStream): string;
//# sourceMappingURL=audiotranscriptionrequeststream.d.ts.map