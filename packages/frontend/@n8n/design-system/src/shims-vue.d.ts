export {};

/**
 * @docs https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties
 */

declare module 'vue' {
	interface ComponentCustomProperties {
		$style: Record<string, string>;
	}
}
