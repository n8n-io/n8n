import type { InjectionKey, Ref } from 'vue';

export const dialogCloseButtonKey: InjectionKey<{
	show: Ref<boolean>;
}> = Symbol('dialogCloseButton');
