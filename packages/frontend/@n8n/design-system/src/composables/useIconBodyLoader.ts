import { inject, type InjectionKey } from 'vue';

export type IconBodyLoader = (name: string) => Promise<string | null>;

export const IconBodyLoaderKey = Symbol('IconBodyLoader') as InjectionKey<IconBodyLoader>;

const noopLoader: IconBodyLoader = async () => null;

export function useInjectIconBodyLoader(): IconBodyLoader {
	return inject(IconBodyLoaderKey, noopLoader);
}
