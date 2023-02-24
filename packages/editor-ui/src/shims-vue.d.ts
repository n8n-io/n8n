// import 'n8n-design-system/shims-element-ui';

declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$style: Record<string, string>;
	}
}
