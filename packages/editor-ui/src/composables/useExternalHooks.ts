import type { IExternalHooks } from '@/Interface';
import { runExternalHook } from '@/utils';

export function useExternalHooks(): IExternalHooks {
	return {
		run: runExternalHook,
	};
}
