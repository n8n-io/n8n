import type { ComputedRef, Ref } from 'vue';

export type RefOrComputedRef<T> = Ref<T> | ComputedRef<T>;
