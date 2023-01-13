import { ComponentCustomProperties } from 'vue';

declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$style: {
			[key: string]: string;
		};
	}
}
