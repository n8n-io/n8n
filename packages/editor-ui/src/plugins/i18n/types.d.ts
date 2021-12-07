import { i18nClass } from '.';

declare module 'vue/types/vue' {
	interface Vue {
		$i: I18nClass;
	}
}