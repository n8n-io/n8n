import { i18nClass } from '.';

declare module 'vue/types/vue' {
	interface Vue {
		$locale: I18nClass;
	}
}