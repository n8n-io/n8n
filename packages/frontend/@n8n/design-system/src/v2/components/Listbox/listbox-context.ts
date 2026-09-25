import type { InjectionKey, Ref } from 'vue';

import type { ListboxSizes, ListboxVariants } from './Listbox.types';

export type ListboxContext = {
	size: Ref<ListboxSizes>;
	variant: Ref<ListboxVariants>;
	isAnyMenuOpen: Ref<boolean>;
	/** When true, CSS :hover styles are suppressed so keyboard highlight wins */
	isKeyboardNavigating: Ref<boolean>;
	registerMenuOpen: () => void;
	registerMenuClose: () => void;
};

export const listboxContextKey: InjectionKey<ListboxContext> = Symbol('n8n-listbox');
