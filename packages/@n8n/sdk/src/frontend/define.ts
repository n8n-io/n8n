import type { FrontendModule } from './types';

export function defineFrontendModule(extension: FrontendModule): FrontendModule {
	window.n8nFrontendModules = window.n8nFrontendModules || [];
	window.n8nFrontendModules.push(extension);

	return extension;
}
