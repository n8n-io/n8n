import { HookHandler } from 'vite';
import { V as Vitest, T as TestProject, b as TestProjectConfiguration, I as InlineConfig } from './reporters.d.DG9VKi4m.js';

interface VitestPluginContext {
	vitest: Vitest;
	project: TestProject;
	injectTestProjects: (config: TestProjectConfiguration | TestProjectConfiguration[]) => Promise<TestProject[]>;
}

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

export type { VitestPluginContext as V };
