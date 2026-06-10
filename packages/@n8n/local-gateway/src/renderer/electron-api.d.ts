import type { ElectronApi } from '../shared/types';

// The preload bridge exposes `window.electronAPI`. Renderer code (incl. .vue SFCs)
// is type-checked against this shared contract — keep it as the single source of
// truth alongside `main/preload.ts`, never a hand-maintained per-file copy.
declare global {
	interface Window {
		electronAPI: ElectronApi;
	}
}

export {};
