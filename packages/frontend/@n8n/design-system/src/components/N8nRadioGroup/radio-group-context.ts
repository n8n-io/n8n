import type { InjectionKey, Ref } from 'vue';

export const radioGroupArrowKeyPressedKey: InjectionKey<Ref<boolean>> = Symbol(
	'radioGroupArrowKeyPressed',
);

export const RADIO_GROUP_ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;
