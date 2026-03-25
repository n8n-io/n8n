import { Virtualizer, PartialKeys, VirtualizerOptions } from '@tanstack/virtual-core';
import { Ref } from 'vue';
export * from '@tanstack/virtual-core';
type MaybeRef<T> = T | Ref<T>;
export declare function useVirtualizer<TScrollElement extends Element, TItemElement extends Element>(options: MaybeRef<PartialKeys<VirtualizerOptions<TScrollElement, TItemElement>, 'observeElementRect' | 'observeElementOffset' | 'scrollToFn'>>): Ref<Virtualizer<TScrollElement, TItemElement>>;
export declare function useWindowVirtualizer<TItemElement extends Element>(options: MaybeRef<PartialKeys<VirtualizerOptions<Window, TItemElement>, 'observeElementRect' | 'observeElementOffset' | 'scrollToFn' | 'getScrollElement'>>): Ref<Virtualizer<Window, TItemElement>>;
