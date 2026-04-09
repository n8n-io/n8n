import * as esbuild from 'esbuild';
import { BuildOptions } from 'esbuild';
import { Builder, Builder_WithRequiredProperty, BuilderStats } from '@storybook/core/types';

type ManagerBuilder = Builder<Builder_WithRequiredProperty<BuildOptions, 'outdir'> & {
    entryPoints: string[];
}, BuilderStats>;

declare const getConfig: ManagerBuilder['getConfig'];
declare const executor: {
    get: () => Promise<typeof esbuild.build>;
};
declare const bail: ManagerBuilder['bail'];
declare const start: ManagerBuilder['start'];
declare const build: ManagerBuilder['build'];
declare const corePresets: ManagerBuilder['corePresets'];
declare const overridePresets: ManagerBuilder['overridePresets'];

export { bail, build, corePresets, executor, getConfig, overridePresets, start };
