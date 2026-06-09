/// <reference types="vite/client" />

declare module '*.vue' {
	import type { DefineComponent } from 'vue';

	const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
	// Vue SFCs are consumed via default import; the shim must mirror that.
	// eslint-disable-next-line import-x/no-default-export
	export default component;
}
