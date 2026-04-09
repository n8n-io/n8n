import WebSocket from "ws";
import { TranscriptionStreamDone } from "../../models/components/transcriptionstreamdone.js";
import { TranscriptionStreamLanguage } from "../../models/components/transcriptionstreamlanguage.js";
import { TranscriptionStreamSegmentDelta } from "../../models/components/transcriptionstreamsegmentdelta.js";
import { TranscriptionStreamTextDelta } from "../../models/components/transcriptionstreamtextdelta.js";
import { type AudioFormat } from "../../models/components/audioformat.js";
import { type RealtimeTranscriptionError } from "../../models/components/realtimetranscriptionerror.js";
import type { RealtimeTranscriptionSession } from "../../models/components/realtimetranscriptionsession.js";
import { type RealtimeTranscriptionSessionCreated } from "../../models/components/realtimetranscriptionsessioncreated.js";
import { type RealtimeTranscriptionSessionUpdated } from "../../models/components/realtimetranscriptionsessionupdated.js";
export type KnownRealtimeEvent = RealtimeTranscriptionSessionCreated | RealtimeTranscriptionSessionUpdated | RealtimeTranscriptionError | TranscriptionStreamLanguage | TranscriptionStreamSegmentDelta | TranscriptionStreamTextDelta | TranscriptionStreamDone;
export type UnknownRealtimeEvent = {
    type: string;
    raw: unknown;
    error?: Error | undefined;
};
export type RealtimeEvent = KnownRealtimeEvent | UnknownRealtimeEvent;
/** @internal */
export declare function isUnknownRealtimeEvent(event: RealtimeEvent): event is UnknownRealtimeEvent;
/** @internal */
export declare function parseRealtimeEventFromData(data: unknown): RealtimeEvent;
/** WebSocket connection for realtime transcription. */
export declare class RealtimeConnection implements AsyncIterable<RealtimeEvent> {
    private readonly websocket;
    private closed;
    private currentAudioFormat;
    private currentSession;
    private initialEvents;
    constructor(websocket: WebSocket, session: RealtimeTranscriptionSession, initialEvents?: RealtimeEvent[]);
    get requestId(): string;
    get session(): RealtimeTranscriptionSession;
    get audioFormat(): AudioFormat;
    get isClosed(): boolean;
    [Symbol.asyncIterator](): AsyncIterator<RealtimeEvent>;
    events(): AsyncGenerator<RealtimeEvent>;
    sendAudio(audioBytes: Uint8Array | ArrayBuffer): Promise<void>;
    flushAudio(): Promise<void>;
    updateSession(audioFormat: AudioFormat): Promise<void>;
    endAudio(): Promise<void>;
    close(code?: number, reason?: string): Promise<void>;
    private sendJson;
    private applySessionEvent;
}
//# sourceMappingURL=connection.d.ts.map