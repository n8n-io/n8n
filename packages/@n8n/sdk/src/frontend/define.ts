import type { FrontendExtension } from './types';

export function defineFrontendExtension(extension: FrontendExtension): FrontendExtension {
	window.n8nFrontendExtensions = window.n8nFrontendExtensions || [];
	window.n8nFrontendExtensions.push(extension);

	return extension;
}
