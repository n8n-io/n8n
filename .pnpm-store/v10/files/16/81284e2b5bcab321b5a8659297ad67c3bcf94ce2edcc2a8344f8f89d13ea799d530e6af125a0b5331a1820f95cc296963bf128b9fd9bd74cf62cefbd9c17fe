import type { Analytics } from './utils/miscellaneous';
type Events = {
    [key: string]: Analytics;
};
export declare class OtelServerTelemetry {
    init(): void;
    send<K extends keyof Events>(event: K, data: Events[K]): void;
}
export declare const otelTelemetry: OtelServerTelemetry;
export {};
