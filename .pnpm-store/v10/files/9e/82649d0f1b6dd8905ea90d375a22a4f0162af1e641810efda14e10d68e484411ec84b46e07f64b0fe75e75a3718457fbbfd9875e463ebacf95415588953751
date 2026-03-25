import { Command } from '../command';
import { Logger } from './logger';
import { HookOptions, PJSON } from './pjson';
import { Topic } from './topic';
export interface PluginOptions {
    children?: Plugin[] | undefined;
    errorOnManifestCreate?: boolean | undefined;
    flexibleTaxonomy?: boolean | undefined;
    ignoreManifest?: boolean | undefined;
    isRoot?: boolean | undefined;
    name?: string | undefined;
    parent?: Plugin | undefined;
    pjson?: PJSON | undefined;
    respectNoCacheDefault?: boolean | undefined;
    root: string;
    tag?: string | undefined;
    type?: string | undefined;
    url?: string | undefined;
}
export interface Options extends PluginOptions {
    channel?: string | undefined;
    devPlugins?: boolean | undefined;
    enablePerf?: boolean | undefined;
    jitPlugins?: boolean | undefined;
    logger?: Logger | undefined;
    pjson?: PJSON | undefined;
    pluginAdditions?: {
        core?: string[];
        dev?: string[];
        path?: string;
    } | undefined;
    plugins?: Map<string, Plugin> | undefined;
    userPlugins?: boolean | undefined;
    version?: string | undefined;
}
export interface Plugin {
    /**
     * ../config version
     */
    _base: string;
    /**
     * aliases from package.json dependencies
     */
    alias: string;
    readonly commandIDs: string[];
    commands: Command.Loadable[];
    readonly commandsDir: string | undefined;
    findCommand(id: string, opts: {
        must: true;
    }): Promise<Command.Class>;
    findCommand(id: string, opts?: {
        must: boolean;
    }): Promise<Command.Class> | undefined;
    readonly hasManifest: boolean;
    hooks: {
        [key: string]: HookOptions[];
    };
    /**
     * True if the plugin is the root plugin.
     */
    isRoot: boolean;
    load(): Promise<void>;
    /**
     * Plugin is written in ESM or CommonJS
     */
    moduleType: 'commonjs' | 'module';
    /**
     * name from package.json
     */
    name: string;
    readonly options: Options;
    parent?: Plugin | undefined;
    /**
     * full package.json
     *
     * parsed with read-pkg
     */
    pjson: PJSON;
    /**
     * base path of plugin
     */
    root: string;
    /**
     * npm dist-tag of plugin
     * only used for user plugins
     */
    tag?: string | undefined;
    readonly topics: Topic[];
    /**
     * used to tell the user how the plugin was installed
     * examples: core, link, user, dev
     */
    type: string;
    /**
     * if it appears to be an npm package but does not look like it's really a CLI plugin, this is set to false
     */
    valid: boolean;
    /**
     * version from package.json
     *
     * example: 1.2.3
     */
    version: string;
}
