import { HookHandler, ConfigEnv, UserConfig } from 'vite';
export { ConfigEnv, Plugin, UserConfig as ViteUserConfig, mergeConfig } from 'vite';
import { I as InlineConfig, c as CoverageV8Options, R as ResolvedCoverageOptions, U as UserWorkspaceConfig, d as UserProjectConfigFn, e as UserProjectConfigExport } from './chunks/reporters.d.Rsi0PyxX.js';
export { b as TestProjectConfiguration, g as TestProjectInlineConfiguration, f as TestUserConfig, W as WatcherTriggerPattern } from './chunks/reporters.d.Rsi0PyxX.js';
import { V as VitestPluginContext } from './chunks/plugin.d.v1sC_bv1.js';
import { F as FakeTimerInstallOpts } from './chunks/config.d.CzIjkicf.js';
import '@vitest/runner';
import '@vitest/utils';
import './chunks/rpc.d.RH3apGEf.js';
import '@vitest/snapshot';
import 'vite/module-runner';
import './chunks/traces.d.402V_yFI.js';
import 'node:stream';
import './chunks/browser.d.Bz3lxTX-.js';
import './chunks/worker.d.5JNaocaN.js';
import './chunks/environment.d.CrsxCzP1.js';
import '@vitest/mocker';
import '@vitest/utils/source-map';
import 'vitest/browser';
import '@vitest/pretty-format';
import '@vitest/utils/diff';
import '@vitest/expect';
import 'vitest/optional-types.js';
import './chunks/benchmark.d.DAaHLpsq.js';
import '@vitest/runner/utils';
import 'tinybench';
import './chunks/coverage.d.BZtK59WP.js';
import '@vitest/snapshot/manager';
import 'node:console';
import 'node:fs';

type VitestInlineConfig = InlineConfig;
declare module "vite" {
	interface UserConfig {
		/**
		* Options for Vitest
		*/
		test?: VitestInlineConfig;
	}
	interface Plugin<A = any> {
		configureVitest?: HookHandler<(context: VitestPluginContext) => void>;
	}
}

declare const defaultBrowserPort = 63315;

declare const defaultInclude: string[];
declare const defaultExclude: string[];
declare const coverageConfigDefaults: ResolvedCoverageOptions;
declare const configDefaults: Readonly<{
	allowOnly: boolean;
	isolate: boolean;
	watch: boolean;
	globals: boolean;
	environment: "node";
	clearMocks: boolean;
	restoreMocks: boolean;
	mockReset: boolean;
	unstubGlobals: boolean;
	unstubEnvs: boolean;
	include: string[];
	exclude: string[];
	teardownTimeout: number;
	forceRerunTriggers: string[];
	update: boolean;
	reporters: never[];
	silent: boolean;
	hideSkippedTests: boolean;
	api: boolean;
	ui: boolean;
	uiBase: string;
	open: boolean;
	css: {
		include: never[];
	};
	coverage: CoverageV8Options;
	fakeTimers: FakeTimerInstallOpts;
	maxConcurrency: number;
	dangerouslyIgnoreUnhandledErrors: boolean;
	typecheck: {
		checker: "tsc";
		include: string[];
		exclude: string[];
	};
	slowTestThreshold: number;
	disableConsoleIntercept: boolean;
}>;

type ViteUserConfigFnObject = (env: ConfigEnv) => UserConfig;
type ViteUserConfigFnPromise = (env: ConfigEnv) => Promise<UserConfig>;
type ViteUserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>;
type ViteUserConfigExport = UserConfig | Promise<UserConfig> | ViteUserConfigFnObject | ViteUserConfigFnPromise | ViteUserConfigFn;
declare function defineConfig(config: UserConfig): UserConfig;
declare function defineConfig(config: Promise<UserConfig>): Promise<UserConfig>;
declare function defineConfig(config: ViteUserConfigFnObject): ViteUserConfigFnObject;
declare function defineConfig(config: ViteUserConfigFnPromise): ViteUserConfigFnPromise;
declare function defineConfig(config: ViteUserConfigExport): ViteUserConfigExport;
declare function defineProject(config: UserWorkspaceConfig): UserWorkspaceConfig;
declare function defineProject(config: Promise<UserWorkspaceConfig>): Promise<UserWorkspaceConfig>;
declare function defineProject(config: UserProjectConfigFn): UserProjectConfigFn;
declare function defineProject(config: UserProjectConfigExport): UserProjectConfigExport;

export { UserProjectConfigExport, UserProjectConfigFn, UserWorkspaceConfig, configDefaults, coverageConfigDefaults, defaultBrowserPort, defaultExclude, defaultInclude, defineConfig, defineProject };
export type { ViteUserConfigExport, ViteUserConfigFn, ViteUserConfigFnObject, ViteUserConfigFnPromise };
