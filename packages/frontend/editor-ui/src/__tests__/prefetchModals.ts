import { usePrefetchModals } from '@/app/composables/usePrefetchModals';
import type { LazyModalKey } from '@/app/modals/lazyModals';

/**
 * Tells if the last rendered page would prefetch the modal now.
 * The test file must mock the composable: `vi.mock('@/app/composables/usePrefetchModals')`.
 */
export function isModalPrefetchEnabled(key: LazyModalKey): boolean {
	// The last call: a page from an earlier test may still be in the mock's calls.
	const call = [...vi.mocked(usePrefetchModals).mock.calls]
		.reverse()
		.find(([keys]) => keys.includes(key));
	if (!call) throw new Error(`The page does not prefetch the "${key}" modal`);
	const enabled = call[1]?.enabled;
	// The composable treats any falsy value, `undefined` included, as off.
	return enabled ? Boolean(enabled()) : true;
}
