import type { Config, IntMode } from "./api.js";
import type { Authority } from "./uri.js";
export interface ExpandedConfig {
    scheme: ExpandedScheme;
    tls: boolean;
    authority: Authority | undefined;
    path: string;
    authToken: string | undefined;
    encryptionKey: string | undefined;
    remoteEncryptionKey: string | undefined;
    syncUrl: string | undefined;
    syncInterval: number | undefined;
    readYourWrites: boolean | undefined;
    offline: boolean | undefined;
    intMode: IntMode;
    fetch: Function | undefined;
    concurrency: number;
}
export type ExpandedScheme = "wss" | "ws" | "https" | "http" | "file";
export declare function isInMemoryConfig(config: ExpandedConfig): boolean;
export declare function expandConfig(config: Readonly<Config>, preferHttp: boolean): ExpandedConfig;
