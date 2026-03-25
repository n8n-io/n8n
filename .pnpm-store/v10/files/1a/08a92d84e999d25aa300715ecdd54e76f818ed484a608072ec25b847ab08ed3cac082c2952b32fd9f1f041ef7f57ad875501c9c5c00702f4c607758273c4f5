import type { RequestDocument, Variables } from './types.js';
import { ClientError } from './types.js';
export type SocketHandler = {
    onInit?: <T>() => Promise<T>;
    onAcknowledged?: <A>(payload?: A) => Promise<void>;
    onPing?: <In, Out>(payload: In) => Promise<Out>;
    onPong?: <T>(payload: T) => any;
    onClose?: () => any;
};
export type UnsubscribeCallback = () => void;
export interface GraphQLSubscriber<T, E = unknown> {
    next?(data: T, extensions?: E): void;
    error?(errorValue: ClientError): void;
    complete?(): void;
}
export declare class GraphQLWebSocketClient {
    static PROTOCOL: string;
    private socket;
    private socketState;
    constructor(socket: WebSocket, { onInit, onAcknowledged, onPing, onPong }: SocketHandler);
    private makeSubscribe;
    rawRequest<T = any, V extends Variables = Variables, E = any>(query: string, variables?: V): Promise<{
        data: T;
        extensions?: E;
    }>;
    request<T = any, V extends Variables = Variables>(document: RequestDocument, variables?: V): Promise<T>;
    subscribe<T = any, V extends Variables = Variables, E = any>(document: RequestDocument, subscriber: GraphQLSubscriber<T, E>, variables?: V): UnsubscribeCallback;
    rawSubscribe<T = any, V extends Variables = Variables, E = any>(query: string, subscriber: GraphQLSubscriber<T, E>, variables?: V): UnsubscribeCallback;
    ping(payload: Variables): void;
    close(): void;
}
//# sourceMappingURL=graphql-ws.d.ts.map