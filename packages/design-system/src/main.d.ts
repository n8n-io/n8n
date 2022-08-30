import Vue from 'vue';
import * as locale from './locale';

declare module 'vue/types/vue' {
	interface Vue {
		$style: Record<string, string>;
		t: (key: string, options?: object) => string;
	}
}

declare module 'n8n-design-system' {
	export * from './components';
	export { N8nUserSelect, N8nUsersList } from './components'; // Workaround for circular imports, will be removed when migrated to typescript
	export { locale };
}

export * from './types';
export { locale } from './locale';
