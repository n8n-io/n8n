import { setActivePinia, createPinia } from 'pinia';
import { useGroupBySession } from './useGroupBySession';

// Provide a deterministic localStorage shim. This makes the test independent
// of whether the test environment supplies its own (jsdom variants and Node's
// experimental localStorage behave differently in CI vs local).
function createLocalStorageStub(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		removeItem: (key: string) => {
			store.delete(key);
		},
		setItem: (key: string, value: string) => {
			store.set(key, String(value));
		},
	};
}

describe('useGroupBySession', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		const stub = createLocalStorageStub();
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: stub,
		});
		stub.clear();
	});

	it('defaults to true', () => {
		const { enabled } = useGroupBySession();
		expect(enabled.value).toBe(true);
	});

	it('persists toggle state across instantiations', () => {
		const { enabled, setEnabled } = useGroupBySession();
		expect(enabled.value).toBe(true);
		setEnabled(false);
		const next = useGroupBySession();
		expect(next.enabled.value).toBe(false);
	});
});
