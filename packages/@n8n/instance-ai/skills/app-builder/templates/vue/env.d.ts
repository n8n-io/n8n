/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Set when n8n builds the app for its live preview; a publish build leaves it unset. */
	readonly VITE_N8N_PREVIEW?: string;
}

declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
	export default component;
}
