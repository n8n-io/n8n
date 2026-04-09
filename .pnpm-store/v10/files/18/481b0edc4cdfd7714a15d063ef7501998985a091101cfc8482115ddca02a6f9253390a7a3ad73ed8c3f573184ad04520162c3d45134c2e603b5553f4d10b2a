import type { CommandArgs } from '../wrapper';
export declare function promptClientToken(domain: string): Promise<string>;
export type LoginOptions = {
    verbose?: boolean;
    residency?: string;
    config?: string;
    next?: boolean;
};
export declare function handleLogin({ argv, config, version }: CommandArgs<LoginOptions>): Promise<void>;
export type LogoutOptions = {
    config?: string;
};
export declare function handleLogout({ version }: CommandArgs<LogoutOptions>): Promise<void>;
