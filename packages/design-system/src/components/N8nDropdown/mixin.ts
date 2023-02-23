import type { InjectionKey, Ref } from 'vue';

export interface DropdownInjection {
	disabled: Ref<boolean>;
	onItemClick: (event: Event) => void;
}

export const DropdownKey = Symbol('Dropdown') as InjectionKey<DropdownInjection>;
