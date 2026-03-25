/// <reference types="node" />
import { Command } from '../command';
import { Hook, Hooks } from './hooks';
import { OclifConfiguration, PJSON, S3Templates } from './pjson';
import { Options, Plugin } from './plugin';
import { Theme } from './theme';
import { Topic } from './topic';
export type LoadOptions = Config | Options | string | undefined;
export type PlatformTypes = 'wsl' | NodeJS.Platform;
export type ArchTypes = 'arm' | 'arm64' | 'mips' | 'mipsel' | 'ppc' | 'ppc64' | 's390' | 's390x' | 'x32' | 'x64' | 'x86';
export type PluginVersionDetail = {
    root: string;
    type: string;
    version: string;
};
export type VersionDetails = {
    architecture: string;
    cliVersion: string;
    nodeVersion: string;
    osVersion?: string;
    pluginVersions?: Record<string, PluginVersionDetail>;
    rootPath?: string;
    shell?: string;
};
export interface Config {
    /**
     * process.arch
     */
    readonly arch: ArchTypes;
    /**
     * bin name of CLI command
     */
    readonly bin: string;
    /**
     * name of any bin aliases that will execute the cli
     */
    readonly binAliases?: string[] | undefined;
    readonly binPath?: string | undefined;
    /**
     * cache directory to use for CLI
     *
     * example ~/Library/Caches/mycli or ~/.cache/mycli
     */
    readonly cacheDir: string;
    readonly channel: string;
    readonly commandIDs: string[];
    readonly commands: Command.Loadable[];
    /**
     * config directory to use for CLI
     *
     * example: ~/.config/mycli
     */
    readonly configDir: string;
    /**
     * data directory to use for CLI
     *
     * example: ~/.local/share/mycli
     */
    readonly dataDir: string;
    /**
     * base dirname to use in cacheDir/configDir/dataDir
     */
    readonly dirname: string;
    findCommand(id: string, opts: {
        must: true;
    }): Command.Loadable;
    findCommand(id: string, opts?: {
        must: boolean;
    }): Command.Loadable | undefined;
    findMatches(id: string, argv: string[]): Command.Loadable[];
    findTopic(id: string, opts: {
        must: true;
    }): Topic;
    findTopic(id: string, opts?: {
        must: boolean;
    }): Topic | undefined;
    readonly flexibleTaxonomy?: boolean;
    getAllCommandIDs(): string[];
    getAllCommands(): Command.Loadable[];
    getPluginsList(): Plugin[];
    /**
     * path to home directory
     *
     * example: /home/myuser
     */
    readonly home: string;
    readonly isSingleCommandCLI: boolean;
    readonly name: string;
    /**
     * npm registry to use for installing plugins
     */
    readonly npmRegistry?: string | undefined;
    readonly nsisCustomization?: string | undefined;
    readonly pjson: PJSON;
    /**
     * process.platform
     */
    readonly platform: PlatformTypes;
    readonly plugins: Map<string, Plugin>;
    readonly root: string;
    runCommand<T = unknown>(id: string, argv?: string[], cachedCommand?: Command.Loadable): Promise<T>;
    runHook<T extends keyof Hooks>(event: T, opts: Hooks[T]['options'], timeout?: number, captureErrors?: boolean): Promise<Hook.Result<Hooks[T]['return']>>;
    s3Key(type: 'unversioned' | 'versioned', ext: '.tar.gz' | '.tar.xz', options?: Config.s3Key.Options): string;
    s3Key(type: keyof S3Templates, options?: Config.s3Key.Options): string;
    s3Url(key: string): string;
    scopedEnvVar(key: string): string | undefined;
    scopedEnvVarKey(key: string): string;
    scopedEnvVarKeys(key: string): string[];
    scopedEnvVarTrue(key: string): boolean;
    /**
     * active shell
     */
    readonly shell: string;
    readonly theme?: Theme | undefined;
    topicSeparator: ' ' | ':';
    readonly topics: Topic[];
    readonly updateConfig: NonNullable<OclifConfiguration['update']>;
    /**
     * user agent to use for http calls
     *
     * example: mycli/1.2.3 (darwin-x64) node-9.0.0
     */
    readonly userAgent: string;
    readonly valid: boolean;
    readonly version: string;
    readonly versionDetails: VersionDetails;
    /**
     * if windows
     */
    readonly windows: boolean;
}
export declare namespace Config {
    namespace s3Key {
        interface Options {
            [key: string]: any;
            arch?: ArchTypes;
            platform?: PlatformTypes;
        }
    }
}
