/// <reference types="node" />
import type { Packet } from 'mqtt-packet';
import type { Duplex } from 'stream';
import type MqttClient from './client';
import type { IClientOptions } from './client';
export type DoneCallback = (error?: Error) => void;
export type GenericCallback<T> = (error?: Error, result?: T) => void;
export type VoidCallback = () => void;
export type IStream = Duplex & {
    socket?: any;
};
export type StreamBuilder = (client: MqttClient, opts?: IClientOptions) => IStream;
export type Callback = () => void;
export type PacketHandler = (client: MqttClient, packet: Packet, done?: DoneCallback) => void;
export type TimerVariant = 'auto' | 'worker' | 'native';
export declare class ErrorWithReasonCode extends Error {
    code: number;
    constructor(message: string, code: number);
}
export type Constructor<T = {}> = new (...args: any[]) => T;
export declare function applyMixin(target: Constructor, mixin: Constructor, includeConstructor?: boolean): void;
export declare const nextTick: (callback: Function, ...args: any[]) => void;
export declare const MQTTJS_VERSION: any;
