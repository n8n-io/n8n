import * as Vue from 'vue';

declare module 'vue/types/vue' {
	interface Vue {
		$style: Record<string, string>;
	}
}
