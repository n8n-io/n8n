import type { IExternalHooks } from '@/Interface';
import { runExternalHook } from '@/utils/externalHooks';

export function useExternalHooks(): IExternalHooks {
	return {
		run: runExternalHook,
	};
}
