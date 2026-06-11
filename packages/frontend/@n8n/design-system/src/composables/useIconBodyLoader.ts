import { inject, type InjectionKey } from 'vue';

export type IconBodyLoader = (name: string) => Promise<string | null>;

export const IconBodyLoaderKey = Symbol('IconBodyLoader') as InjectionKey<IconBodyLoader>;

let warnedMissingLoader = false;

const noopLoader: IconBodyLoader = async () => {
	if (import.meta.env.DEV && !warnedMissingLoader) {
		warnedMissingLoader = true;
		console.warn(
			'[n8n-design-system] No IconBodyLoader provided — icons outside the bundled set will render empty. ' +
				'Provide one via app.provide(IconBodyLoaderKey, loader), e.g. loadLucideIconBody from @n8n/design-system/icons/lucide.',
		);
	}
	return null;
};

export function useInjectIconBodyLoader(): IconBodyLoader {
	return inject(IconBodyLoaderKey, noopLoader);
}
