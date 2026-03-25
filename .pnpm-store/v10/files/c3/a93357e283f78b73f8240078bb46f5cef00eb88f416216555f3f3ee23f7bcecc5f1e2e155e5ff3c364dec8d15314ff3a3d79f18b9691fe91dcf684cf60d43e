/**
 * @deprecated
 * @extends Observable<string>
 */
export class WebsocketClient extends Observable<string> {
    /**
     * @param {string} url
     * @param {object} opts
     * @param {'arraybuffer' | 'blob' | null} [opts.binaryType] Set `ws.binaryType`
     */
    constructor(url: string, { binaryType }?: {
        binaryType?: "arraybuffer" | "blob" | null | undefined;
    });
    url: string;
    /**
     * @type {WebSocket?}
     */
    ws: WebSocket | null;
    binaryType: "arraybuffer" | "blob" | null;
    connected: boolean;
    connecting: boolean;
    unsuccessfulReconnects: number;
    lastMessageReceived: number;
    /**
     * Whether to connect to other peers or not
     * @type {boolean}
     */
    shouldConnect: boolean;
    _checkInterval: NodeJS.Timeout;
    /**
     * @param {any} message
     */
    send(message: any): void;
    disconnect(): void;
    connect(): void;
}
import { Observable } from './observable.js';
//# sourceMappingURL=websocket.d.ts.map