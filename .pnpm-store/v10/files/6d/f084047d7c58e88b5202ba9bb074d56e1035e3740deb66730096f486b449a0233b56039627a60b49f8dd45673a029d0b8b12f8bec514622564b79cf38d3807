import type MqttClient from './client';
import type { TimerVariant } from './shared';
export default class KeepaliveManager {
    private _keepalive;
    private timerId;
    private timer;
    private destroyed;
    private counter;
    private client;
    private _keepaliveTimeoutTimestamp;
    private _intervalEvery;
    get keepaliveTimeoutTimestamp(): number;
    get intervalEvery(): number;
    get keepalive(): number;
    constructor(client: MqttClient, variant: TimerVariant);
    private clear;
    setKeepalive(value: number): void;
    destroy(): void;
    reschedule(): void;
}
