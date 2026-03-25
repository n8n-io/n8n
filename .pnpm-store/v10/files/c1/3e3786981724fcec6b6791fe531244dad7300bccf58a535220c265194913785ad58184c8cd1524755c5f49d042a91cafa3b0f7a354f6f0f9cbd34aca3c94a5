import { Command } from '../command';
import { Hook, Hooks, OclifConfiguration, PJSON, S3Templates, Topic, UserPJSON } from '../interfaces';
import { ArchTypes, Config as IConfig, LoadOptions, PlatformTypes, VersionDetails } from '../interfaces/config';
import { Plugin as IPlugin, Options } from '../interfaces/plugin';
import { Theme } from '../interfaces/theme';
export declare class Config implements IConfig {
    options: Options;
    arch: ArchTypes;
    bin: string;
    binAliases?: string[] | undefined;
    binPath?: string | undefined;
    cacheDir: string;
    channel: string;
    configDir: string;
    dataDir: string;
    dirname: string;
    flexibleTaxonomy: boolean;
    home: string;
    isSingleCommandCLI: boolean;
    name: string;
    npmRegistry?: string | undefined;
    nsisCustomization?: string | undefined;
    pjson: PJSON;
    platform: PlatformTypes;
    plugins: Map<string, IPlugin>;
    root: string;
    shell: string;
    theme?: Theme | undefined;
    topicSeparator: ' ' | ':';
    updateConfig: NonNullable<OclifConfiguration['update']>;
    userAgent: string;
    userPJSON?: UserPJSON | undefined;
    valid: boolean;
    version: string;
    protected warned: boolean;
    windows: boolean;
    private _base;
    private _commandIDs;
    private _commands;
    private _topics;
    private commandPermutations;
    private pluginLoader;
    private rootPlugin;
    private topicPermutations;
    constructor(options: Options);
    static load(opts?: LoadOptions): Promise<Config>;
    get commandIDs(): string[];
    get commands(): Command.Loadable[];
    protected get isProd(): boolean;
    static get rootPlugin(): IPlugin | undefined;
    get topics(): Topic[];
    get versionDetails(): VersionDetails;
    protected _shell(): string;
    protected dir(category: 'cache' | 'config' | 'data'): string;
    findCommand(id: string, opts: {
        must: true;
    }): Command.Loadable;
    findCommand(id: string, opts?: {
        must: boolean;
    }): Command.Loadable | undefined;
    /**
     * Find all command ids that include the provided command id.
     *
     * For example, if the command ids are:
     * - foo:bar:baz
     * - one:two:three
     *
     * `bar` would return `foo:bar:baz`
     *
     * @param partialCmdId string
     * @param argv string[] process.argv containing the flags and arguments provided by the user
     * @returns string[]
     */
    findMatches(partialCmdId: string, argv: string[]): Command.Loadable[];
    findTopic(id: string, opts: {
        must: true;
    }): Topic;
    findTopic(id: string, opts?: {
        must: boolean;
    }): Topic | undefined;
    /**
     * Returns an array of all command ids. If flexible taxonomy is enabled then all permutations will be appended to the array.
     * @returns string[]
     */
    getAllCommandIDs(): string[];
    /**
     * Returns an array of all commands. If flexible taxonomy is enabled then all permutations will be appended to the array.
     * @returns Command.Loadable[]
     */
    getAllCommands(): Command.Loadable[];
    getPluginsList(): IPlugin[];
    load(): Promise<void>;
    loadPluginsAndCommands(opts?: {
        force: boolean;
    }): Promise<void>;
    loadTheme(): Promise<Theme | undefined>;
    protected macosCacheDir(): string | undefined;
    runCommand<T = unknown>(id: string, argv?: string[], cachedCommand?: Command.Loadable | null): Promise<T>;
    runHook<T extends keyof Hooks, P extends Hooks = Hooks>(event: T, opts: P[T]['options'], timeout?: number, captureErrors?: boolean): Promise<Hook.Result<P[T]['return']>>;
    s3Key(type: keyof S3Templates, ext?: '.tar.gz' | '.tar.xz' | IConfig.s3Key.Options, options?: IConfig.s3Key.Options): string;
    s3Url(key: string): string;
    scopedEnvVar(k: string): string | undefined;
    /**
     * this DOES NOT account for bin aliases, use scopedEnvVarKeys instead which will account for bin aliases
     * @param k {string}, the unscoped key you want to get the value for
     * @returns {string} returns the env var key
     */
    scopedEnvVarKey(k: string): string;
    /**
     * gets the scoped env var keys for a given key, including bin aliases
     * @param k {string}, the env key e.g. 'debug'
     * @returns {string[]} e.g. ['SF_DEBUG', 'SFDX_DEBUG']
     */
    scopedEnvVarKeys(k: string): string[];
    scopedEnvVarTrue(k: string): boolean;
    protected windowsHome(): string | undefined;
    protected windowsHomedriveHome(): string | undefined;
    protected windowsUserprofileHome(): string | undefined;
    private buildS3Config;
    private getCmdLookupId;
    private getTopicLookupId;
    /**
     * Insert legacy plugins
     *
     * Replace invalid CLI plugins (cli-engine plugins, mostly Heroku) loaded via `this.loadPlugins`
     * with oclif-compatible ones returned by @oclif/plugin-legacy init hook.
     *
     * @param plugins array of oclif-compatible plugins
     */
    private insertLegacyPlugins;
    private isJitPluginCommand;
    private loadCommands;
    private loadTopics;
    private maybeAdjustDebugSetting;
    private warn;
}
