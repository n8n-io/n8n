import Vue from 'vue';
import 'n8n-design-system/shims-element-ui';

declare module '*.vue' {
	import Vue from 'vue';
	export default Vue;
}

declare module 'vue/types/vue' {
	interface Vue {
		$style: Record<string, string>;
	}
}
