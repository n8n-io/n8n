export interface IVariant {
    name: string;
    enabled: boolean;
    feature_enabled?: boolean;
    payload?: {
        type: string;
        value: string;
    };
}
export interface UnleashClient {
    isEnabled(this: UnleashClient, featureName: string): boolean;
    getVariant(this: UnleashClient, featureName: string): IVariant;
}
export interface IConfig {
    [key: string]: unknown;
    appName: string;
    clientKey: string;
    url: URL | string;
}
export type UnleashClientClass = new (config: IConfig) => UnleashClient;
//# sourceMappingURL=types.d.ts.map
