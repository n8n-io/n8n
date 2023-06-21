declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<{}, {}, any>;
	export default component;
}

// @TODO Check if still needed
declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$style: Record<string, string>;
	}
}
