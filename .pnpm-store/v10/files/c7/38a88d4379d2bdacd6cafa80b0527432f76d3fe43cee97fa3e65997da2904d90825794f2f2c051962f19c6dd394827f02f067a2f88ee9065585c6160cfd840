import { ComposeDownOptions, ComposeOptions } from "./types";
export interface ComposeClient {
    up(options: ComposeOptions, services?: Array<string>): Promise<void>;
    pull(options: ComposeOptions, services?: Array<string>): Promise<void>;
    stop(options: ComposeOptions): Promise<void>;
    down(options: ComposeOptions, downOptions: ComposeDownOptions): Promise<void>;
}
export declare function getComposeClient(environment: NodeJS.ProcessEnv): Promise<ComposeClient>;
