import { Builder, Options } from 'storybook/internal/types';
import { UserConfig, InlineConfig, PluginOption } from 'vite';

type ViteStats = {
    toJson: () => any;
};
type ViteBuilder = Builder<UserConfig, ViteStats>;
type ViteFinal = (config: InlineConfig, options: Options) => InlineConfig | Promise<InlineConfig>;
type StorybookConfigVite = {
    viteFinal?: ViteFinal;
};
type BuilderOptions = {
    /** Path to `vite.config` file, relative to `process.cwd()`. */
    viteConfigPath?: string;
};

/** Recursively removes all plugins with the names given Resolves async plugins */
declare const withoutVitePlugins: <TPlugin>(plugins: TPlugin[] | undefined, namesToRemove: string[]) => Promise<TPlugin[]>;

/**
 * Returns true if ANY of the plugins in the array have a name that matches one of the names in the
 * names array. Will resolve any promises in the array.
 */
declare function hasVitePlugins(plugins: PluginOption[], names: string[]): Promise<boolean>;

declare function bail(): Promise<void>;
declare const start: ViteBuilder['start'];
declare const build: ViteBuilder['build'];
declare const corePresets: string[];

export { type BuilderOptions, type StorybookConfigVite, type ViteBuilder, type ViteFinal, bail, build, corePresets, hasVitePlugins, start, withoutVitePlugins };
