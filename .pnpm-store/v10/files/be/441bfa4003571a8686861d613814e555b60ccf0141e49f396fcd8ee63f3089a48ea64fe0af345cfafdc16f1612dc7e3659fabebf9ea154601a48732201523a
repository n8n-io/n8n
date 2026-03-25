import { PJSON } from '../interfaces';
import { Plugin as IPlugin } from '../interfaces/plugin';
type PluginLoaderOptions = {
    plugins?: IPlugin[] | PluginsMap | undefined;
    root: string;
};
type LoadOpts = {
    dataDir: string;
    devPlugins?: boolean | undefined;
    force?: boolean | undefined;
    rootPlugin: IPlugin;
    userPlugins?: boolean | undefined;
    pluginAdditions?: {
        core?: string[];
        dev?: string[];
        path?: string;
    } | undefined;
};
type PluginsMap = Map<string, IPlugin>;
export default class PluginLoader {
    options: PluginLoaderOptions;
    errors: (Error | string)[];
    plugins: PluginsMap;
    private pluginsProvided;
    constructor(options: PluginLoaderOptions);
    loadChildren(opts: LoadOpts): Promise<{
        errors: (Error | string)[];
        plugins: PluginsMap;
    }>;
    loadRoot({ pjson }: {
        pjson?: PJSON | undefined;
    }): Promise<IPlugin>;
    private loadCorePlugins;
    private loadDevPlugins;
    private loadPlugins;
    private loadUserPlugins;
}
export {};
