import { i18nClass } from '.';

declare module 'vue/types/vue' {
	interface Vue {
		$i18n2: I18nClass;
	}
}