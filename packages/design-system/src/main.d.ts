import Vue from 'vue';
import * as locale from './locale';

declare module 'vue/types/vue' {
	interface Vue {
		$style: Record<string, string>;
	}
}

declare module 'n8n-design-system' {
	export * from './components';
	export { N8nUsersList, N8nUserSelect } from './components';
	export { locale };
}

export * from './types';
