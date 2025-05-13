import type { FrontendExtension } from './types';

export {};

declare global {
	interface Window {
		n8nFrontendExtensions: FrontendExtension[];
	}
}
