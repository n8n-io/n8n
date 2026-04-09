import { ClientSDK } from "../../lib/sdks.js";
import type { AudioFormat } from "../../models/components/audioformat.js";
import type { RealtimeEvent } from "./connection.js";
import { RealtimeConnection } from "./connection.js";
export type RealtimeConnectOptions = Readonly<{
    audioFormat?: AudioFormat | undefined;
    serverUrl?: string | undefined;
    timeoutMs?: number | undefined;
    httpHeaders?: Record<string, string> | undefined;
}>;
/** Client for realtime transcription over WebSocket. */
export declare class RealtimeTranscription extends ClientSDK {
    connect(model: string, options?: RealtimeConnectOptions): Promise<RealtimeConnection>;
    transcribeStream(audioStream: AsyncIterable<Uint8Array>, model: string, options?: RealtimeConnectOptions): AsyncIterable<RealtimeEvent>;
    private getWsUrl;
}
//# sourceMappingURL=transcription.d.ts.map