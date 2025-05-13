import type { FrontendModule } from './types';

export {};

declare global {
	interface Window {
		n8nFrontendModules: FrontendModule[];
	}
}
