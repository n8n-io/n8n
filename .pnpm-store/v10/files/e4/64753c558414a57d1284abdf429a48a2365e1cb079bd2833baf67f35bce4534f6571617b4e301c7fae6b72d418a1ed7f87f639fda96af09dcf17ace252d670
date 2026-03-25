export type FeatureGate = {
    readonly name: string;
    readonly value: boolean;
};
type EventNameToEventDataMap = {
    gate_evaluation: {
        gate: FeatureGate;
    };
};
export interface StatsigClient {
    on(event: keyof EventNameToEventDataMap, callback: (data: EventNameToEventDataMap[keyof EventNameToEventDataMap]) => void): void;
}
export {};
//# sourceMappingURL=types.d.ts.map
