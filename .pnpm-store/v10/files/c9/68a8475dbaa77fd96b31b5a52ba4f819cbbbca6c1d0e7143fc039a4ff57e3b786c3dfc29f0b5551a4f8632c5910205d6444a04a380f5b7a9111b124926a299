/// <reference types="node" />
/// <reference types="node" />
import { IAuthPacket, IConnackPacket, IDisconnectPacket, IPublishPacket, ISubscribePacket, Packet, QoS, IConnectPacket } from 'mqtt-packet';
import { IMessageIdProvider } from './default-message-id-provider';
import { DuplexOptions } from 'readable-stream';
import Store, { IStore } from './store';
import { ClientOptions } from 'ws';
import { ClientRequestArgs } from 'http';
import { DoneCallback, ErrorWithReasonCode, IStream, StreamBuilder, TimerVariant, VoidCallback } from './shared';
import { TypedEventEmitter } from './TypedEmitter';
import KeepaliveManager from './KeepaliveManager';
export type BaseMqttProtocol = 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs' | 'ali' | 'alis';
export type MqttProtocolWithUnix = `${BaseMqttProtocol}+unix`;
export type MqttProtocol = BaseMqttProtocol | MqttProtocolWithUnix;
export type StorePutCallback = () => void;
export interface ISecureClientOptions {
    key?: string | string[] | Buffer | Buffer[] | any[];
    keyPath?: string;
    cert?: string | string[] | Buffer | Buffer[];
    certPath?: string;
    ca?: string | string[] | Buffer | Buffer[];
    caPaths?: string | string[];
    rejectUnauthorized?: boolean;
    ALPNProtocols?: string[] | Buffer[] | Uint8Array[] | Buffer | Uint8Array;
}
export type AckHandler = (topic: string, message: Buffer, packet: any, cb: (error: Error | number, code?: number) => void) => void;
export interface IClientOptions extends ISecureClientOptions {
    encoding?: BufferEncoding;
    browserBufferSize?: number;
    binary?: boolean;
    my?: any;
    manualConnect?: boolean;
    authPacket?: Partial<IAuthPacket>;
    writeCache?: boolean;
    servername?: string;
    defaultProtocol?: MqttProtocol;
    query?: Record<string, string>;
    auth?: string;
    customHandleAcks?: AckHandler;
    port?: number;
    host?: string;
    hostname?: string;
    unixSocket?: boolean;
    path?: string;
    protocol?: MqttProtocol;
    wsOptions?: ClientOptions | ClientRequestArgs | DuplexOptions;
    reconnectPeriod?: number;
    connectTimeout?: number;
    incomingStore?: IStore;
    outgoingStore?: IStore;
    queueQoSZero?: boolean;
    log?: (...args: any[]) => void;
    autoUseTopicAlias?: boolean;
    autoAssignTopicAlias?: boolean;
    reschedulePings?: boolean;
    servers?: Array<{
        host: string;
        port: number;
        protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
    }>;
    resubscribe?: boolean;
    transformWsUrl?: (url: string, options: IClientOptions, client: MqttClient) => string;
    createWebsocket?: (url: string, websocketSubProtocols: string[], options: IClientOptions) => any;
    messageIdProvider?: IMessageIdProvider;
    browserBufferTimeout?: number;
    objectMode?: boolean;
    clientId?: string;
    protocolVersion?: IConnectPacket['protocolVersion'];
    protocolId?: IConnectPacket['protocolId'];
    clean?: boolean;
    keepalive?: number;
    username?: string;
    password?: Buffer | string;
    will?: IConnectPacket['will'];
    properties?: IConnectPacket['properties'];
    timerVariant?: TimerVariant;
}
export interface IClientPublishOptions {
    qos?: QoS;
    retain?: boolean;
    dup?: boolean;
    properties?: IPublishPacket['properties'];
    cbStorePut?: StorePutCallback;
}
export interface IClientReconnectOptions {
    incomingStore?: Store;
    outgoingStore?: Store;
}
export interface IClientSubscribeProperties {
    properties?: ISubscribePacket['properties'];
}
export interface IClientSubscribeOptions extends IClientSubscribeProperties {
    qos: QoS;
    nl?: boolean;
    rap?: boolean;
    rh?: number;
}
export interface ISubscriptionRequest extends IClientSubscribeOptions {
    topic: string;
}
export interface ISubscriptionGrant extends Omit<ISubscriptionRequest, 'qos' | 'properties'> {
    qos: QoS | 128;
}
export type ISubscriptionMap = {
    [topic: string]: IClientSubscribeOptions;
} & {
    resubscribe?: boolean;
};
export { IConnackPacket, IDisconnectPacket, IPublishPacket, Packet };
export type OnConnectCallback = (packet: IConnackPacket) => void;
export type OnDisconnectCallback = (packet: IDisconnectPacket) => void;
export type ClientSubscribeCallback = (err: Error | null, granted?: ISubscriptionGrant[]) => void;
export type OnMessageCallback = (topic: string, payload: Buffer, packet: IPublishPacket) => void;
export type OnPacketCallback = (packet: Packet) => void;
export type OnCloseCallback = () => void;
export type OnErrorCallback = (error: Error | ErrorWithReasonCode) => void;
export type PacketCallback = (error?: Error, packet?: Packet) => any;
export type CloseCallback = (error?: Error) => void;
export interface MqttClientEventCallbacks {
    connect: OnConnectCallback;
    message: OnMessageCallback;
    packetsend: OnPacketCallback;
    packetreceive: OnPacketCallback;
    disconnect: OnDisconnectCallback;
    error: OnErrorCallback;
    close: OnCloseCallback;
    end: VoidCallback;
    reconnect: VoidCallback;
    offline: VoidCallback;
    outgoingEmpty: VoidCallback;
}
export default class MqttClient extends TypedEventEmitter<MqttClientEventCallbacks> {
    static VERSION: any;
    connected: boolean;
    disconnecting: boolean;
    disconnected: boolean;
    reconnecting: boolean;
    incomingStore: IStore;
    outgoingStore: IStore;
    options: IClientOptions;
    queueQoSZero: boolean;
    _reconnectCount: number;
    log: (...args: any[]) => void;
    messageIdProvider: IMessageIdProvider;
    outgoing: Record<number, {
        volatile: boolean;
        cb: (err: Error, packet?: Packet) => void;
    }>;
    messageIdToTopic: Record<number, string[]>;
    noop: (error?: any) => void;
    keepaliveManager: KeepaliveManager;
    stream: IStream;
    queue: {
        packet: Packet;
        cb: PacketCallback;
    }[];
    private streamBuilder;
    private _resubscribeTopics;
    private connackTimer;
    private reconnectTimer;
    private _storeProcessing;
    private _packetIdsDuringStoreProcessing;
    private _storeProcessingQueue;
    private _firstConnection;
    private topicAliasRecv;
    private topicAliasSend;
    private _deferredReconnect;
    private connackPacket;
    static defaultId(): string;
    constructor(streamBuilder: StreamBuilder, options: IClientOptions);
    handleAuth(packet: IAuthPacket, callback: PacketCallback): void;
    handleMessage(packet: IPublishPacket, callback: DoneCallback): void;
    private _nextId;
    getLastMessageId(): number;
    connect(): this;
    publish(topic: string, message: string | Buffer): MqttClient;
    publish(topic: string, message: string | Buffer, callback?: PacketCallback): MqttClient;
    publish(topic: string, message: string | Buffer, opts?: IClientPublishOptions, callback?: PacketCallback): MqttClient;
    publishAsync(topic: string, message: string | Buffer): Promise<Packet | undefined>;
    publishAsync(topic: string, message: string | Buffer, opts?: IClientPublishOptions): Promise<Packet | undefined>;
    subscribe(topicObject: string | string[] | ISubscriptionMap): MqttClient;
    subscribe(topicObject: string | string[] | ISubscriptionMap, callback?: ClientSubscribeCallback): MqttClient;
    subscribe(topicObject: string | string[] | ISubscriptionMap, opts?: IClientSubscribeOptions | IClientSubscribeProperties): MqttClient;
    subscribe(topicObject: string | string[] | ISubscriptionMap, opts?: IClientSubscribeOptions | IClientSubscribeProperties, callback?: ClientSubscribeCallback): MqttClient;
    subscribeAsync(topicObject: string | string[] | ISubscriptionMap): Promise<ISubscriptionGrant[]>;
    subscribeAsync(topicObject: string | string[] | ISubscriptionMap, opts?: IClientSubscribeOptions | IClientSubscribeProperties): Promise<ISubscriptionGrant[]>;
    unsubscribe(topic: string | string[]): MqttClient;
    unsubscribe(topic: string | string[], opts?: IClientSubscribeOptions): MqttClient;
    unsubscribe(topic: string | string[], callback?: PacketCallback): MqttClient;
    unsubscribe(topic: string | string[], opts?: IClientSubscribeOptions, callback?: PacketCallback): MqttClient;
    unsubscribeAsync(topic: string | string[]): Promise<Packet | undefined>;
    unsubscribeAsync(topic: string | string[], opts?: IClientSubscribeOptions): Promise<Packet | undefined>;
    end(cb?: DoneCallback): MqttClient;
    end(force?: boolean): MqttClient;
    end(opts?: Partial<IDisconnectPacket>, cb?: DoneCallback): MqttClient;
    end(force?: boolean, cb?: DoneCallback): MqttClient;
    end(force?: boolean, opts?: Partial<IDisconnectPacket>, cb?: DoneCallback): MqttClient;
    endAsync(): Promise<void>;
    endAsync(force?: boolean): Promise<void>;
    endAsync(opts?: Partial<IDisconnectPacket>): Promise<void>;
    endAsync(force?: boolean, opts?: Partial<IDisconnectPacket>): Promise<void>;
    removeOutgoingMessage(messageId: number): MqttClient;
    reconnect(opts?: Pick<IClientOptions, 'incomingStore' | 'outgoingStore'>): MqttClient;
    private _flushVolatile;
    private _flush;
    private _removeTopicAliasAndRecoverTopicName;
    private _checkDisconnecting;
    private _reconnect;
    private _setupReconnect;
    private _clearReconnect;
    private _cleanUp;
    private _storeAndSend;
    private _applyTopicAlias;
    private _noop;
    private _writePacket;
    private _sendPacket;
    private _storePacket;
    private _setupKeepaliveManager;
    private _destroyKeepaliveManager;
    reschedulePing(): void;
    private _reschedulePing;
    sendPing(): void;
    onKeepaliveTimeout(): void;
    private _resubscribe;
    private _onConnect;
    private _invokeStoreProcessingQueue;
    private _invokeAllStoreProcessingQueue;
    private _flushStoreProcessingQueue;
    private _removeOutgoingAndStoreMessage;
}
