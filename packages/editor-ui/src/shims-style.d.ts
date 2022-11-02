import 'n8n-design-system/src/shims-element-ui';

declare module 'vue/types/vue' {
	interface Vue {
		$style: Record<string, string>;
	}
}
