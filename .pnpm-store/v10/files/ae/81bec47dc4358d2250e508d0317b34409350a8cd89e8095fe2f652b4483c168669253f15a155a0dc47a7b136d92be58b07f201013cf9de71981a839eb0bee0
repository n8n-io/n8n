import { Command } from '../command';
import { Manifest } from '../interfaces/manifest';
import { HookOptions, PJSON } from '../interfaces/pjson';
import { Plugin as IPlugin, PluginOptions } from '../interfaces/plugin';
import { Topic } from '../interfaces/topic';
export declare class Plugin implements IPlugin {
    options: PluginOptions;
    alias: string;
    alreadyLoaded: boolean;
    children: Plugin[];
    commandIDs: string[];
    commands: Command.Loadable[];
    commandsDir: string | undefined;
    hasManifest: boolean;
    hooks: {
        [key: string]: HookOptions[];
    };
    isRoot: boolean;
    manifest: Manifest;
    moduleType: 'commonjs' | 'module';
    name: string;
    parent?: Plugin | undefined;
    pjson: PJSON;
    root: string;
    tag?: string | undefined;
    type: string;
    valid: boolean;
    version: string;
    _base: string;
    protected _debug: (..._: any) => void;
    private commandCache;
    private commandDiscoveryOpts;
    private flexibleTaxonomy;
    constructor(options: PluginOptions);
    get topics(): Topic[];
    findCommand(id: string, opts: {
        must: true;
    }): Promise<Command.Class>;
    findCommand(id: string, opts?: {
        must: boolean;
    }): Promise<Command.Class | undefined>;
    load(): Promise<void>;
    private _manifest;
    private addErrorScope;
    private getCommandIDs;
    private getCommandIdsFromPattern;
    private getCommandIdsFromTarget;
    private getCommandsDir;
    private loadCommandsFromTarget;
    private warn;
}
